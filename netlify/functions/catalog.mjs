/**
 * GET /.netlify/functions/catalog  ->  { catalog, sha }
 * The latest catalog.json from GitHub (which can be newer than the deployed
 * site while a rebuild is running), plus its sha for conflict detection.
 */
import { requireAdmin } from '../../lib/auth.mjs';
import { getFile } from '../../lib/github.mjs';
import { json, handleError } from '../../lib/http.mjs';

export const CATALOG_PATH = 'src/data/catalog.json';

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Método no permitido.' });
  try {
    await requireAdmin(event.headers);
    const file = await getFile(CATALOG_PATH);
    if (!file) return json(500, { error: 'Falta src/data/catalog.json en el repositorio.' });
    return json(200, { catalog: JSON.parse(file.text), sha: file.sha });
  } catch (err) {
    return handleError(err, 500);
  }
};
