/*
 * DIPA admin portal.
 *
 * Sign in with Google -> the Netlify functions check the email against
 * ADMIN_EMAILS -> edits happen in memory -> "Guardar y publicar" sends the whole
 * catalogue to /save, which validates it and commits src/data/catalog.json.
 * Netlify then rebuilds the site (1–2 minutes).
 *
 * All text the owner sees is in Argentine Spanish ("vos").
 */
(function () {
  'use strict';

  var API = '/.netlify/functions';
  var app = document.getElementById('app');
  var saveBar = document.getElementById('savebar');
  var saveBtn = document.getElementById('save');
  var saveStatus = document.getElementById('save-status');

  var state = {
    token: null,
    email: '',
    catalog: null,
    sha: null,
    dirty: false,
    tab: 'products',
    filter: '',
    editing: null, // { kind: 'product' | 'category', id }
    previews: {}, // uploaded path -> data URL, until the rebuilt site serves the file
    notice: null,
  };

  // ---------- small DOM helpers ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  var uid = 0;
  function nextId() { uid += 1; return 'f' + uid; }

  function slugify(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
  }
  function uniqueId(base, list) {
    var id = base, n = 2;
    var taken = function (x) { return list.some(function (o) { return o.id === x; }); };
    while (taken(id)) { id = base + '-' + n; n += 1; }
    return id;
  }

  // ---------- API ----------
  function api(path, options) {
    options = options || {};
    var headers = { 'Content-Type': 'application/json' };
    if (state.token) headers.Authorization = 'Bearer ' + state.token;
    return fetch(API + path, { method: options.method || 'GET', headers: headers, body: options.body })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (res.status === 401 || res.status === 403) {
            var msg = body.error || 'Volvé a iniciar sesión.';
            if (state.catalog && res.status === 401) msg += ' Tus cambios sin guardar siguen acá.';
            signOut(msg, !!state.catalog);
            var authErr = new Error(msg);
            authErr.auth = true;
            throw authErr;
          }
          if (!res.ok) throw new Error(body.error || ('Error ' + res.status));
          return body;
        });
      });
  }

  // ---------- auth ----------
  function showLogin(message) {
    app.textContent = '';
    var msg = h('p', { class: 'msg' + (message ? ' error' : ''), id: 'login-msg', role: 'status', text: message || '' });
    var box = h('section', { class: 'card login' },
      h('h1', { text: 'Panel de DIPA' }),
      h('p', { text: 'Iniciá sesión con tu cuenta de Google para cargar y editar productos.' }),
      h('div', { id: 'gsi' }),
      msg);
    app.appendChild(box);
    saveBar.hidden = true;
    document.getElementById('signout').hidden = true;
    document.getElementById('user').textContent = '';
    startGoogle(msg);
  }

  var googleReady = null;
  function loadGoogle() {
    if (googleReady) return googleReady;
    googleReady = fetch(API + '/config').then(function (r) { return r.json(); }).then(function (cfg) {
      if (!cfg.clientId) throw new Error(cfg.error || 'Falta configurar el inicio de sesión.');
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.onload = function () {
          window.google.accounts.id.initialize({ client_id: cfg.clientId, callback: onCredential, auto_select: true });
          resolve();
        };
        s.onerror = function () { reject(new Error('No se pudo cargar el inicio de sesión de Google. Revisá la conexión.')); };
        document.head.appendChild(s);
      });
    });
    googleReady.catch(function () { googleReady = null; });
    return googleReady;
  }

  function startGoogle(msgEl) {
    loadGoogle().then(function () {
      var slot = document.getElementById('gsi');
      if (slot) window.google.accounts.id.renderButton(slot, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'es-419' });
    }).catch(function (err) {
      msgEl.textContent = err.message;
      msgEl.className = 'msg error';
    });
  }

  function onCredential(resp) {
    state.token = resp.credential;
    try {
      var payload = JSON.parse(atob(resp.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      state.email = payload.email || '';
    } catch (e) { state.email = ''; }
    try { sessionStorage.setItem('dipa-admin-token', state.token); } catch (e) { /* private mode */ }
    if (state.catalog) { renderApp(); return; } // re-login after expiry: keep unsaved edits
    loadCatalog();
  }

  function signOut(message, keepEdits) {
    state.token = null;
    try { sessionStorage.removeItem('dipa-admin-token'); } catch (e) { /* ignore */ }
    if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect();
    if (!keepEdits) { state.catalog = null; state.dirty = false; }
    showLogin(message);
  }

  document.getElementById('signout').addEventListener('click', function () {
    if (state.dirty && !confirm('Tenés cambios sin guardar. ¿Salir igual?')) return;
    signOut();
  });

  function loadCatalog() {
    app.textContent = '';
    app.appendChild(h('section', { class: 'card' }, h('p', { text: 'Cargando el catálogo…' })));
    api('/catalog').then(function (body) {
      state.catalog = body.catalog;
      state.sha = body.sha;
      state.dirty = false;
      renderApp();
    }).catch(function (err) {
      if (!err.auth) showLogin(err.message);
    });
  }

  // ---------- dirty / save ----------
  function markDirty() {
    state.dirty = true;
    updateSaveBar();
  }
  function updateSaveBar(text, isError) {
    saveBar.hidden = !state.catalog;
    saveBar.classList.toggle('dirty', state.dirty);
    saveBtn.disabled = !state.dirty;
    saveStatus.textContent = text || (state.dirty ? 'Tenés cambios sin guardar.' : 'Sin cambios.');
    saveStatus.className = isError ? 'error' : '';
  }
  window.addEventListener('beforeunload', function (e) {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  saveBtn.addEventListener('click', function () {
    saveBtn.disabled = true;
    saveStatus.textContent = 'Guardando…';
    api('/save', { method: 'POST', body: JSON.stringify({ catalog: state.catalog, sha: state.sha }) })
      .then(function (body) {
        state.catalog = body.catalog;
        if (body.sha) state.sha = body.sha;
        state.dirty = false;
        state.notice = body.unchanged ? 'No había cambios para guardar.' : 'Guardado. La web se actualiza en 1 o 2 minutos.';
        renderApp();
      })
      .catch(function (err) {
        if (err.auth) return;
        saveBtn.disabled = false;
        updateSaveBar('No se guardó: ' + err.message, true);
      });
  });

  // ---------- photos ----------
  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('No se pudo leer la foto.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('Ese archivo no es una foto.')); };
        img.onload = function () {
          var max = 1600;
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.84));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function uploadPhoto(file) {
    return resizeImage(file).then(function (dataUrl) {
      return api('/upload', { method: 'POST', body: JSON.stringify({ filename: file.name, data: dataUrl.split(',')[1] }) })
        .then(function (body) { state.previews[body.path] = dataUrl; return body.path; });
    });
  }

  function imgSrc(path) { return state.previews[path] || path; }

  function imageField(label, obj, key, emptyText) {
    var wrap = h('div', { class: 'field' });
    var status = h('p', { class: 'hint', role: 'status' });
    function draw() {
      wrap.textContent = '';
      var input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true });
      var preview = obj[key]
        ? h('img', { class: 'img-preview', src: imgSrc(obj[key]), alt: '', onerror: function () { this.replaceWith(h('div', { class: 'img-empty', text: 'Foto subida. Se ve cuando la web termine de actualizarse.' })); } })
        : h('div', { class: 'img-empty', text: emptyText || 'Sin foto' });
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        status.textContent = 'Subiendo la foto…';
        status.className = 'hint';
        uploadPhoto(file).then(function (path) {
          obj[key] = path;
          markDirty();
          draw();
          status.textContent = 'Foto subida. Acordate de tocar "Guardar y publicar".';
        }).catch(function (err) { status.textContent = err.message; status.className = 'hint error'; });
      });
      append(wrap, [
        h('span', { class: 'field-label', text: label }),
        h('div', { class: 'img-field' }, preview,
          h('div', { class: 'img-buttons' },
            h('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: obj[key] ? 'Cambiar foto' : 'Subir foto', onclick: function () { input.click(); } }),
            obj[key] && h('button', { type: 'button', class: 'link', text: 'Quitar foto', onclick: function () { delete obj[key]; markDirty(); draw(); } }))),
        input, status]);
    }
    draw();
    return wrap;
  }

  // ---------- generic fields ----------
  function textField(label, obj, key, opts) {
    opts = opts || {};
    var id = nextId();
    var input = h(opts.multiline ? 'textarea' : 'input', {
      id: id, type: opts.multiline ? null : 'text', value: obj[key] || '', placeholder: opts.placeholder,
      'aria-describedby': opts.hint ? id + '-h' : null,
      oninput: function () { obj[key] = input.value; markDirty(); if (opts.onInput) opts.onInput(input.value); },
    });
    return h('div', { class: 'field' }, h('label', { for: id, text: label }), input, opts.hint && h('p', { class: 'hint', id: id + '-h', text: opts.hint }));
  }

  function listField(label, obj, key, hint) {
    var id = nextId();
    var input = h('textarea', {
      id: id, value: (obj[key] || []).join('\n'), 'aria-describedby': id + '-h',
      oninput: function () { obj[key] = input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); markDirty(); },
    });
    return h('div', { class: 'field' }, h('label', { for: id, text: label }), input, h('p', { class: 'hint', id: id + '-h', text: hint || 'Uno por renglón.' }));
  }

  function checkField(label, obj, key, hint, onChange) {
    var input = h('input', { type: 'checkbox', checked: obj[key] === true, onchange: function () { obj[key] = input.checked; markDirty(); if (onChange) onChange(input.checked); } });
    return h('label', { class: 'check' }, input, h('span', null, label, hint && h('span', { class: 'hint', text: hint })));
  }

  function selectField(label, obj, key, options) {
    var id = nextId();
    var sel = h('select', { id: id, onchange: function () { obj[key] = sel.value; markDirty(); } },
      options.map(function (o) { return h('option', { value: o.value, text: o.label }); }));
    sel.value = obj[key];
    return h('div', { class: 'field' }, h('label', { for: id, text: label }), sel);
  }

  // ---------- layout ----------
  function renderApp() {
    document.getElementById('user').textContent = state.email;
    document.getElementById('signout').hidden = false;
    app.textContent = '';
    updateSaveBar();

    if (state.notice) {
      app.appendChild(h('p', { class: 'notice', role: 'status', text: state.notice }));
      state.notice = null;
    }

    if (state.editing) {
      app.appendChild(state.editing.kind === 'product' ? productEditor() : categoryEditor());
      window.scrollTo(0, 0);
      return;
    }

    var tabs = [['products', 'Productos'], ['categories', 'Categorías'], ['site', 'Datos del local']];
    app.appendChild(h('div', { class: 'tabs', role: 'tablist' }, tabs.map(function (t) {
      return h('button', { type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(state.tab === t[0]), text: t[1], onclick: function () { state.tab = t[0]; renderApp(); } });
    })));

    if (state.tab === 'products') app.appendChild(productList());
    else if (state.tab === 'categories') app.appendChild(categoryList());
    else app.appendChild(siteForm());
  }

  function catTitle(id) {
    var c = state.catalog.categories.find(function (x) { return x.id === id; });
    return c ? c.title : '(sin categoría)';
  }

  function thumb(path) {
    return path ? h('img', { class: 'row-thumb', src: imgSrc(path), alt: '' }) : h('span', { class: 'row-thumb', 'aria-hidden': 'true' });
  }

  /** Move item at index i up/down among items that match `same` (e.g. same category). */
  function move(list, item, dir, same) {
    var i = list.indexOf(item);
    var j = i + dir;
    while (j >= 0 && j < list.length && !same(list[j])) j += dir;
    if (j < 0 || j >= list.length) return;
    list.splice(i, 1);
    list.splice(j, 0, item);
    markDirty();
    renderApp();
  }

  // ---------- products ----------
  function productList() {
    var cats = state.catalog.categories;
    var products = state.catalog.products;
    var box = h('section', { class: 'card' });

    var filterId = nextId();
    var filter = h('select', { id: filterId, onchange: function () { state.filter = filter.value; renderApp(); } },
      h('option', { value: '', text: 'Todas las categorías' }),
      cats.map(function (c) { return h('option', { value: c.id, text: c.title }); }));
    filter.value = state.filter;

    append(box, [
      h('div', { class: 'toolbar' },
        h('h1', { text: 'Productos' }),
        h('button', { type: 'button', class: 'btn btn-primary', text: '+ Nuevo producto', onclick: newProduct })),
      h('div', { class: 'field' }, h('label', { for: filterId, text: 'Mostrar' }), filter),
    ]);

    var shown = cats.filter(function (c) { return !state.filter || c.id === state.filter; });
    shown.forEach(function (c) {
      var items = products.filter(function (p) { return p.category === c.id; });
      box.appendChild(h('h2', { class: 'group-h', text: c.title + (c.hidden ? ' (categoría oculta)' : '') }));
      if (!items.length) { box.appendChild(h('p', { class: 'hint', text: 'Todavía no hay productos en esta categoría.' })); return; }
      box.appendChild(h('ul', { class: 'rows' }, items.map(function (p, idx) {
        var same = function (x) { return x.category === p.category; };
        return h('li', { class: 'row' + (p.hidden ? ' is-hidden' : '') },
          thumb(p.image),
          h('div', { class: 'row-main' },
            h('span', { class: 'row-title', text: p.title }),
            h('span', { class: 'row-sub' },
              p.hidden && h('span', { class: 'pill pill-grey', text: 'Oculto' }),
              p.featured && h('span', { class: 'pill pill-peach', text: 'Destacado' }),
              p.hasPage && h('span', { class: 'pill', text: 'Página propia' }))),
          h('div', { class: 'row-actions' },
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Subir ' + p.title, text: '↑', disabled: idx === 0, onclick: function () { move(products, p, -1, same); } }),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Bajar ' + p.title, text: '↓', disabled: idx === items.length - 1, onclick: function () { move(products, p, 1, same); } }),
            h('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Editar', 'aria-label': 'Editar ' + p.title, onclick: function () { state.editing = { kind: 'product', id: p.id }; renderApp(); } })));
      })));
    });
    return box;
  }

  function newProduct() {
    var name = prompt('Nombre del producto nuevo:');
    if (!name || !name.trim()) return;
    var category = state.filter || (state.catalog.categories[0] && state.catalog.categories[0].id);
    if (!category) { alert('Primero creá una categoría.'); return; }
    var p = { id: uniqueId(slugify(name), state.catalog.products), title: name.trim(), category: category, hidden: false, featured: false, hasPage: false, summary: '' };
    // Put it at the end of its category.
    var products = state.catalog.products;
    var last = -1;
    products.forEach(function (x, i) { if (x.category === category) last = i; });
    products.splice(last + 1, 0, p);
    markDirty();
    state.editing = { kind: 'product', id: p.id };
    renderApp();
  }

  function productEditor() {
    var cat = state.catalog;
    var p = cat.products.find(function (x) { return x.id === state.editing.id; });
    if (!p) { state.editing = null; return h('p', { text: 'Ese producto ya no existe.' }); }
    var box = h('section', { class: 'card' });
    var pageSection = h('div', { class: 'section' });

    function drawPageSection() {
      pageSection.textContent = '';
      if (!p.hasPage) return;
      p.options = p.options || [];
      p.gallery = p.gallery || [];
      append(pageSection, [
        h('h2', { text: 'Página del producto' }),
        textField('Etiqueta de la página', p, 'badge', { hint: 'Si la dejás vacía, se usa el nombre de la categoría.' }),
        textField('Descripción larga', p, 'description', { multiline: true }),
        subList('Opciones', 'Por ejemplo "Tamaños" → "5 cm y 7 cm".', p.options, function () { return { label: '', value: '' }; }, function (o) {
          return [textField('Título', o, 'label'), textField('Detalle', o, 'value')];
        }, 'Agregar opción'),
        subList('Galería', 'Hasta 4 fotos queda mejor. La primera es la principal.', p.gallery, function () { return { label: '' }; }, function (g) {
          return [imageField('Foto', g, 'image'), textField('Descripción de la foto', g, 'label', { hint: 'Por ejemplo "Foto 2: stickers en packaging". Se lee en voz alta para personas que no ven la foto.' })];
        }, 'Agregar foto'),
        relatedField(p),
      ]);
    }

    var link = '/catalogo/' + p.category + '/' + p.id;
    append(box, [
      h('div', { class: 'toolbar' },
        h('button', { type: 'button', class: 'link', text: '← Volver a la lista', onclick: function () { state.editing = null; renderApp(); } })),
      h('h1', { text: p.title || 'Producto' }),
      textField('Nombre', p, 'title'),
      selectField('Categoría', p, 'category', cat.categories.map(function (c) { return { value: c.id, label: c.title }; })),
      textField('Descripción corta', p, 'summary', { multiline: true, hint: 'Una o dos líneas. Sale en la tarjeta del producto.' }),
      imageField('Foto principal', p, 'image', p.photoLabel || 'Sin foto'),
      textField('Texto del recuadro sin foto', p, 'photoLabel', { hint: 'Mientras no haya foto, se muestra un recuadro con este texto. Ej.: "Foto: tarjetas personales".' }),
      checkField('Destacado', p, 'featured', 'Borde durazno y etiqueta "Destacado".'),
      checkField('Ocultar del sitio', p, 'hidden', 'Lo saca de la web sin borrarlo.'),
      textField('Cómo se nombra en el mensaje de WhatsApp', p, 'whatsappName', { hint: 'El mensaje dice "Hola DIPA! Quiero consultar por …". Si lo dejás vacío, se usa el nombre en minúsculas.' }),
      checkField('Tiene página propia', p, 'hasPage', 'La tarjeta dice "Ver producto" y lleva a una página con galería y opciones. Si no, "Consultá" abre WhatsApp. Dirección: ' + link, drawPageSection),
      pageSection,
      h('div', { class: 'editor-actions section' },
        h('button', { type: 'button', class: 'btn btn-ghost', text: 'Listo', onclick: function () { state.editing = null; renderApp(); } }),
        h('button', { type: 'button', class: 'btn btn-danger', text: 'Borrar producto', onclick: function () {
          if (!confirm('¿Borrar "' + p.title + '"? Si solo querés sacarlo un tiempo, usá "Ocultar del sitio".')) return;
          cat.products.splice(cat.products.indexOf(p), 1);
          cat.products.forEach(function (x) { if (x.related) x.related = x.related.filter(function (r) { return r !== p.id; }); });
          state.editing = null;
          markDirty();
          renderApp();
        } })),
    ]);
    drawPageSection();
    return box;
  }

  function subList(title, hint, list, make, fields, addLabel) {
    var wrap = h('div', { class: 'field' });
    function draw() {
      wrap.textContent = '';
      append(wrap, [h('span', { class: 'field-label', text: title }), h('p', { class: 'hint', text: hint })]);
      var items = h('div', { class: 'sublist' });
      list.forEach(function (item, i) {
        items.appendChild(h('div', { class: 'subitem' },
          h('div', { class: 'subitem-fields' }, fields(item)),
          h('div', { class: 'row-actions', style: 'flex-direction:column' },
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Subir', text: '↑', disabled: i === 0, onclick: function () { list.splice(i - 1, 0, list.splice(i, 1)[0]); markDirty(); draw(); } }),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Quitar', text: '✕', onclick: function () { list.splice(i, 1); markDirty(); draw(); } }))));
      });
      wrap.appendChild(items);
      wrap.appendChild(h('button', { type: 'button', class: 'btn btn-ghost btn-sm', style: 'align-self:flex-start', text: '+ ' + addLabel, onclick: function () { list.push(make()); markDirty(); draw(); } }));
    }
    draw();
    return wrap;
  }

  function relatedField(p) {
    p.related = p.related || [];
    var others = state.catalog.products.filter(function (x) { return x.id !== p.id; });
    return h('div', { class: 'field' },
      h('span', { class: 'field-label', text: 'También te puede interesar' }),
      h('p', { class: 'hint', text: 'Elegí 2 a 4 productos para mostrar abajo de la página.' }),
      h('div', { class: 'checks' }, others.map(function (o) {
        var input = h('input', { type: 'checkbox', checked: p.related.indexOf(o.id) >= 0, onchange: function () {
          if (input.checked) p.related.push(o.id);
          else p.related = p.related.filter(function (r) { return r !== o.id; });
          markDirty();
        } });
        return h('label', { class: 'check' }, input, h('span', { text: o.title + ' · ' + catTitle(o.category) }));
      })));
  }

  // ---------- categories ----------
  function categoryList() {
    var cats = state.catalog.categories;
    var box = h('section', { class: 'card' },
      h('div', { class: 'toolbar' },
        h('h1', { text: 'Categorías' }),
        h('button', { type: 'button', class: 'btn btn-primary', text: '+ Nueva categoría', onclick: newCategory })),
      h('p', { class: 'hint', text: 'El orden de esta lista es el orden del catálogo.' }));
    box.appendChild(h('ul', { class: 'rows' }, cats.map(function (c, idx) {
      var count = state.catalog.products.filter(function (p) { return p.category === c.id; }).length;
      return h('li', { class: 'row' + (c.hidden ? ' is-hidden' : '') },
        thumb(c.image),
        h('div', { class: 'row-main' },
          h('span', { class: 'row-title', text: c.title }),
          h('span', { class: 'row-sub' }, count + (count === 1 ? ' producto' : ' productos'), c.hidden && h('span', { class: 'pill pill-grey', text: 'Oculta' }))),
        h('div', { class: 'row-actions' },
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Subir ' + c.title, text: '↑', disabled: idx === 0, onclick: function () { move(cats, c, -1, function () { return true; }); } }),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Bajar ' + c.title, text: '↓', disabled: idx === cats.length - 1, onclick: function () { move(cats, c, 1, function () { return true; }); } }),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Editar', 'aria-label': 'Editar ' + c.title, onclick: function () { state.editing = { kind: 'category', id: c.id }; renderApp(); } })));
    })));
    return box;
  }

  function newCategory() {
    var name = prompt('Nombre de la categoría nueva:');
    if (!name || !name.trim()) return;
    var c = { id: uniqueId(slugify(name), state.catalog.categories), title: name.trim(), hidden: false, summary: '' };
    state.catalog.categories.push(c);
    markDirty();
    state.editing = { kind: 'category', id: c.id };
    renderApp();
  }

  function categoryEditor() {
    var cat = state.catalog;
    var c = cat.categories.find(function (x) { return x.id === state.editing.id; });
    if (!c) { state.editing = null; return h('p', { text: 'Esa categoría ya no existe.' }); }
    c.combo = c.combo || { title: '', text: '', message: '' };
    var count = cat.products.filter(function (p) { return p.category === c.id; }).length;

    return h('section', { class: 'card' },
      h('div', { class: 'toolbar' },
        h('button', { type: 'button', class: 'link', text: '← Volver a la lista', onclick: function () { state.editing = null; renderApp(); } })),
      h('h1', { text: c.title || 'Categoría' }),
      h('p', { class: 'hint', text: 'Dirección: /catalogo/' + c.id }),
      textField('Nombre', c, 'title'),
      textField('Descripción corta', c, 'summary', { multiline: true, hint: 'Sale en la tarjeta del catálogo.' }),
      imageField('Foto', c, 'image', c.photoLabel || 'Sin foto'),
      textField('Texto del recuadro sin foto', c, 'photoLabel'),
      checkField('Ocultar del sitio', c, 'hidden', 'Oculta la categoría y todos sus productos.'),
      h('div', { class: 'section' },
        h('h2', { text: 'Página de la categoría' }),
        textField('Frase a mano (arriba del título)', c, 'kicker', { hint: 'Opcional. Ej.: "Para tu marca".' }),
        textField('Texto de presentación', c, 'intro', { multiline: true, hint: 'Si lo dejás vacío, se usa la descripción corta.' }),
        textField('Aclaración (etiqueta verde)', c, 'note', { hint: 'Opcional. Ej.: "No incluye colocación".' }),
        listField('Tipos de papel', c, 'papers', 'Opcional, uno por renglón. Se muestra como lista en la página.'),
        listField('Tamaños', c, 'sizes', 'Opcional, uno por renglón.')),
      h('div', { class: 'section' },
        h('h2', { text: 'Banda final propia' }),
        h('p', { class: 'hint', text: 'Opcional. Si la dejás vacía, la página termina con "¿No encontrás lo que buscás?".' }),
        textField('Título', c.combo, 'title'),
        textField('Texto', c.combo, 'text'),
        textField('Mensaje de WhatsApp', c.combo, 'message', { placeholder: 'Hola DIPA! Quiero consultar por…' })),
      h('div', { class: 'editor-actions section' },
        h('button', { type: 'button', class: 'btn btn-ghost', text: 'Listo', onclick: function () { state.editing = null; renderApp(); } }),
        h('button', { type: 'button', class: 'btn btn-danger', text: 'Borrar categoría', onclick: function () {
          if (count) { alert('Esta categoría tiene ' + count + ' productos. Pasalos a otra categoría o borralos primero. Si solo querés sacarla un tiempo, usá "Ocultar del sitio".'); return; }
          if (!confirm('¿Borrar la categoría "' + c.title + '"?')) return;
          cat.categories.splice(cat.categories.indexOf(c), 1);
          state.editing = null;
          markDirty();
          renderApp();
        } })));
  }

  // ---------- site details ----------
  function siteForm() {
    var s = state.catalog.site;
    return h('section', { class: 'card' },
      h('h1', { text: 'Datos del local' }),
      h('p', { class: 'hint', text: 'Se cambian en toda la web de una vez.' }),
      textField('WhatsApp para los enlaces', s, 'whatsappNumber', { hint: '549 + código de área sin 0 + número sin 15. Ej.: 5491132424474' }),
      textField('WhatsApp como se muestra', s, 'whatsappDisplay', { hint: 'Ej.: 11 3242-4474' }),
      textField('Usuario de Instagram (sin @)', s, 'instagramUser'),
      textField('Horario', s, 'hours'),
      textField('Zona', s, 'area'),
      textField('Dirección del local', s, 'address'),
      textField('Frase del pie de página', s, 'footerTagline'),
      textField('Texto de copyright', s, 'copyright'));
  }

  // ---------- start ----------
  var saved = null;
  try { saved = sessionStorage.getItem('dipa-admin-token'); } catch (e) { /* ignore */ }
  if (saved) {
    state.token = saved;
    try { state.email = JSON.parse(atob(saved.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || ''; } catch (e) { /* ignore */ }
    loadCatalog();
  } else {
    showLogin();
  }
})();
