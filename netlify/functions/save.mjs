/**
 * POST /.netlify/functions/save   { catalog, sha }
 * Validates and commits src/data/catalog.json. The push triggers a Netlify
 * rebuild, which publishes the change. `sha` is the version the editor
 * loaded: if the file changed since, the save is refused instead of silently
 * overwriting someone else's edit.
 */
import { requireAdmin } from '../../lib/auth.mjs';
import { getFile, putFile } from '../../lib/github.mjs';
import { json, handleError } from '../../lib/http.mjs';
import { validateCatalog } from '../../lib/catalog-schema.mjs';

const CATALOG_PATH = 'src/data/catalog.json';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  try {
    const { email } = await requireAdmin(event.headers);
    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'No se pudo leer lo que mandaste. Probá de nuevo.' }); }

    const current = await getFile(CATALOG_PATH);
    // An admin tab opened before the home page was editable sends no "home": keep the saved one.
    if (payload.catalog && payload.catalog.home === undefined && current) {
      const saved = JSON.parse(current.text);
      if (saved.home) payload.catalog.home = saved.home;
    }
    const catalog = validateCatalog(payload.catalog);
    const text = JSON.stringify(catalog, null, 2) + '\n';

    if (current && payload.sha && current.sha !== payload.sha) {
      return json(409, { error: 'El catálogo se cambió desde otro lado mientras editabas. Recargá la página para ver la última versión.' });
    }
    if (current && current.text === text) return json(200, { ok: true, unchanged: true, sha: current.sha, catalog });

    const result = await putFile(CATALOG_PATH, Buffer.from(text, 'utf8').toString('base64'), `Actualizar catálogo (panel de administración — ${email})`, current?.sha);
    return json(200, { ok: true, sha: result.content?.sha, catalog });
  } catch (err) {
    return handleError(err);
  }
};
