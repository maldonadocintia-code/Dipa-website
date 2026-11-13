/**
 * The shape of src/data/catalog.json, checked in two places:
 *   - at build time (src/lib/catalog.ts), so a broken file fails loudly;
 *   - in the save function, so the admin portal can never commit a file
 *     that would break the next Netlify build.
 *
 * validateCatalog() returns a cleaned copy (trimmed strings, empty optional
 * fields removed, references to deleted items dropped) or throws an Error
 * whose message is shown to the person editing, in Spanish.
 */

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PHONE = /^549\d{10}$/;
const IMAGE = /^\/uploads\/[a-z0-9][a-z0-9._-]*$/;

const SITE_FIELDS = ['whatsappNumber', 'whatsappDisplay', 'instagramUser', 'hours', 'area', 'address', 'footerTagline', 'copyright'];
const CATEGORY_TEXT = ['summary', 'kicker', 'intro', 'note', 'image', 'photoLabel'];
const PRODUCT_TEXT = ['summary', 'image', 'photoLabel', 'whatsappName', 'badge', 'description'];

function fail(msg) { throw new Error(msg); }
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v.trim() : '');

function cleanText(src, out, keys, where) {
  for (const k of keys) {
    if (src[k] === undefined || src[k] === null) continue;
    if (typeof src[k] !== 'string') fail(`${where}: el campo "${k}" tiene que ser texto.`);
    const v = src[k].trim();
    if (v) out[k] = v;
  }
  if (out.image && !IMAGE.test(out.image)) fail(`${where}: la foto no es válida. Volvé a subirla.`);
}

function cleanList(v, where) {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) fail(`${where} tiene que ser una lista.`);
  const list = v.map(str).filter(Boolean);
  return list.length ? list : undefined;
}

export function validateCatalog(input) {
  if (!isObj(input)) fail('Faltan los datos del catálogo.');

  // Site
  if (!isObj(input.site)) fail('Faltan los datos del local.');
  const site = {};
  for (const k of SITE_FIELDS) site[k] = str(input.site[k]);
  if (!PHONE.test(site.whatsappNumber)) fail('El WhatsApp para los enlaces tiene que ser 549 + código de área sin 0 + número sin 15 (ej.: 5491132424474).');
  site.instagramUser = site.instagramUser.replace(/^@/, '');
  for (const k of ['whatsappDisplay', 'instagramUser']) if (!site[k]) fail('Completá el WhatsApp y el Instagram en "Datos del local".');

  // Categories
  if (!Array.isArray(input.categories)) fail('Las categorías tienen que ser una lista.');
  const catIds = new Set();
  const categories = input.categories.map((c, i) => {
    if (!isObj(c)) fail(`La categoría ${i + 1} no se puede leer.`);
    const title = str(c.title);
    if (!title) fail(`La categoría ${i + 1} necesita un nombre.`);
    const where = `Categoría "${title}"`;
    if (!ID.test(c.id || '')) fail(`${where}: dirección web no válida.`);
    if (catIds.has(c.id)) fail(`${where}: hay dos categorías con la misma dirección web.`);
    catIds.add(c.id);
    const out = { id: c.id, title, hidden: c.hidden === true };
    cleanText(c, out, CATEGORY_TEXT, where);
    const papers = cleanList(c.papers, `${where}: los tipos de papel`);
    const sizes = cleanList(c.sizes, `${where}: los tamaños`);
    if (papers) out.papers = papers;
    if (sizes) out.sizes = sizes;
    if (c.combo !== undefined && c.combo !== null) {
      if (!isObj(c.combo)) fail(`${where}: la banda final no se puede leer.`);
      const combo = { title: str(c.combo.title), text: str(c.combo.text), message: str(c.combo.message) };
      if (combo.title || combo.text || combo.message) {
        if (!combo.title || !combo.message) fail(`${where}: la banda final necesita título y mensaje de WhatsApp (o dejala toda vacía).`);
        out.combo = combo;
      }
    }
    return out;
  });

  // Products
  if (!Array.isArray(input.products)) fail('Los productos tienen que ser una lista.');
  const prodIds = new Set();
  for (const p of input.products) if (isObj(p) && typeof p.id === 'string') prodIds.add(p.id);
  const seen = new Set();
  const products = input.products.map((p, i) => {
    if (!isObj(p)) fail(`El producto ${i + 1} no se puede leer.`);
    const title = str(p.title);
    if (!title) fail(`El producto ${i + 1} necesita un nombre.`);
    const where = `Producto "${title}"`;
    if (!ID.test(p.id || '')) fail(`${where}: dirección web no válida.`);
    if (seen.has(p.id)) fail(`${where}: hay dos productos con la misma dirección web.`);
    seen.add(p.id);
    if (!catIds.has(p.category)) fail(`${where}: elegí una categoría.`);
    const out = { id: p.id, title, category: p.category, hidden: p.hidden === true, featured: p.featured === true, hasPage: p.hasPage === true };
    cleanText(p, out, PRODUCT_TEXT, where);
    if (p.options !== undefined) {
      if (!Array.isArray(p.options)) fail(`${where}: las opciones tienen que ser una lista.`);
      const options = p.options.map((o) => ({ label: str(o && o.label), value: str(o && o.value) })).filter((o) => o.label || o.value);
      for (const o of options) if (!o.label || !o.value) fail(`${where}: cada opción necesita título y detalle.`);
      if (options.length) out.options = options;
    }
    if (p.gallery !== undefined) {
      if (!Array.isArray(p.gallery)) fail(`${where}: la galería tiene que ser una lista.`);
      const gallery = p.gallery.map((g) => {
        const o = { label: str(g && g.label) };
        const img = str(g && g.image);
        if (img) {
          if (!IMAGE.test(img)) fail(`${where}: una foto de la galería no es válida.`);
          o.image = img;
        }
        return o;
      }).filter((g) => g.label || g.image);
      for (const g of gallery) if (!g.label) fail(`${where}: cada foto de la galería necesita una descripción.`);
      if (gallery.length) out.gallery = gallery;
    }
    if (p.related !== undefined) {
      if (!Array.isArray(p.related)) fail(`${where}: "También te puede interesar" tiene que ser una lista.`);
      const related = [...new Set(p.related.filter((r) => typeof r === 'string' && prodIds.has(r) && r !== p.id))];
      if (related.length) out.related = related;
    }
    return out;
  });

  const result = { site, categories, products };
  if (JSON.stringify(result).length > 1_000_000) fail('Hay demasiado contenido para guardar de una vez.');
  return result;
}
