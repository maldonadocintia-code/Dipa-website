/**
 * Thin wrapper over the GitHub Contents API. The repo is the database:
 * committing a file pushes to the branch, Netlify rebuilds, the site updates.
 *
 * Env: GITHUB_TOKEN (fine-grained, Contents read/write on this repo only),
 *      GITHUB_REPO ("owner/name"), GITHUB_BRANCH (default "main")
 */

const API = 'https://api.github.com';

function config() {
  const token = (process.env.GITHUB_TOKEN || '').trim();
  // Accept "owner/name" or a pasted link like https://github.com/owner/name(.git)
  // Only the first word counts, in case something else was pasted after it.
  const repo = ((process.env.GITHUB_REPO || '').trim().split(/\s+/)[0] || '')
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '');
  const branch = (process.env.GITHUB_BRANCH || 'main').trim() || 'main';
  if (!token || !repo) throw new Error('El sitio todavía no está conectado a GitHub (GITHUB_TOKEN / GITHUB_REPO).');
  return { token, repo, branch };
}

const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'dipa-admin',
});

/** @returns {Promise<{text: string, sha: string} | null>} */
export async function getFile(path) {
  const { token, repo, branch } = config();
  const res = await fetch(`${API}/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`, { headers: headers(token) });
  if (res.status === 404) {
    await explainNotFound(token, repo, branch);
    return null;
  }
  if (res.status === 401) throw new Error('GitHub rechazó el GITHUB_TOKEN (vencido o mal copiado). Generá uno nuevo y actualizalo en Netlify.');
  if (!res.ok) throw new Error(`No se pudo leer ${path} de GitHub (${res.status}).`);
  const body = await res.json();
  return { text: Buffer.from(body.content, 'base64').toString('utf8'), sha: body.sha };
}

/**
 * A 404 on a file can mean the file is missing, but also a wrong repo name, a
 * token without access to the repo (GitHub answers 404, not 403), or a wrong
 * branch. Work out which, so the error names the setting to fix.
 */
async function explainNotFound(token, repo, branch) {
  const r = await fetch(`${API}/repos/${repo}`, { headers: headers(token) });
  if (r.status === 401) throw new Error('GitHub rechazó el GITHUB_TOKEN (vencido o mal copiado). Generá uno nuevo y actualizalo en Netlify.');
  if (r.status === 404) throw new Error(`GitHub no encuentra el repositorio "${repo}". Revisá que GITHUB_REPO sea exactamente maldonadocintia-code/Dipa-website y que el GITHUB_TOKEN tenga acceso a Dipa-website con permiso Contents: Read and write.`);
  const b = await fetch(`${API}/repos/${repo}/branches/${encodeURIComponent(branch)}`, { headers: headers(token) });
  if (b.status === 404) throw new Error(`El repositorio no tiene la rama "${branch}". Poné GITHUB_BRANCH = main en Netlify.`);
  // Repo and branch are visible but no file is: the token has Metadata access only.
  const root = await fetch(`${API}/repos/${repo}/contents/?ref=${encodeURIComponent(branch)}`, { headers: headers(token) });
  if (root.status === 404 || root.status === 403) throw new Error('El GITHUB_TOKEN ve el repositorio pero no puede leer los archivos. En GitHub, editá el token y poné Repository permissions → Contents: Read and write.');
}

export async function putFile(path, base64, message, sha) {
  const { token, repo, branch } = config();
  const res = await fetch(`${API}/repos/${repo}/contents/${encodeURI(path)}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: base64, branch, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) {
    if (res.status === 409 || res.status === 422) throw new Error('El catálogo se cambió desde otro lado. Recargá la página y volvé a intentar.');
    const detail = await res.text().catch(() => '');
    throw new Error(`No se pudo guardar en GitHub (${res.status}). ${detail.slice(0, 200)}`);
  }
  return res.json();
}
