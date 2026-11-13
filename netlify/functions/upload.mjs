/**
 * POST /.netlify/functions/upload   { filename, data: "<base64>" }  ->  { path: "/uploads/..." }
 * Commits a photo to public/uploads/. The browser resizes it first.
 */
import { requireAdmin } from '../../lib/auth.mjs';
import { getFile, putFile } from '../../lib/github.mjs';
import { json, handleError } from '../../lib/http.mjs';

const MAX_BYTES = 4 * 1024 * 1024;

/** Check the file really is an image; don't trust the name. */
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

const slug = (name) => String(name).replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'foto';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  try {
    const { email } = await requireAdmin(event.headers);
    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'No se pudo leer la foto.' }); }
    if (typeof payload.data !== 'string' || !payload.data) return json(400, { error: 'No llegó ninguna foto.' });

    const buf = Buffer.from(payload.data, 'base64');
    if (!buf.length) return json(400, { error: 'La foto está vacía.' });
    if (buf.length > MAX_BYTES) return json(400, { error: 'La foto es muy pesada. Probá con una más chica.' });
    const ext = sniff(buf);
    if (!ext) return json(400, { error: 'Ese archivo no es una foto que podamos usar (JPG, PNG o WebP).' });

    const stamp = new Date().toISOString().slice(0, 10);
    let filename = `${stamp}-${slug(payload.filename)}.${ext}`;
    if (await getFile(`public/uploads/${filename}`)) filename = `${stamp}-${slug(payload.filename)}-${Date.now().toString(36)}.${ext}`;

    await putFile(`public/uploads/${filename}`, buf.toString('base64'), `Subir foto ${filename} (panel de administración — ${email})`);
    return json(200, { path: `/uploads/${filename}` });
  } catch (err) {
    return handleError(err);
  }
};
