# Admin panel setup (one time)

The admin panel at `/admin` is [Sveltia CMS](https://github.com/sveltia/sveltia-cms). There is no database: every save in the panel commits a JSON file to the `main` branch of this repo, and Netlify rebuilds the site (about 1 minute).

## 1. Put the site on Netlify

1. Merge this work into `main` (the CMS reads and writes `main`).
2. In Netlify: **Add new site → Import an existing project → GitHub →** `maldonadocintia-code/Dipa-website`.
3. Build settings come from `netlify.toml` (`npm run build`, publish `dist`). Deploy.
4. Note the site URL (for example `https://dipa.netlify.app`). If it differs, update `site` in `astro.config.mjs` and `site_url` / `display_url` in `public/admin/config.yml`.

## 2. Let the admin log in with GitHub

Netlify handles the GitHub login for the CMS.

1. In GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App.**
   - Application name: `DIPA admin`
   - Homepage URL: the Netlify site URL
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. Create a client secret. Copy the Client ID and the secret.
3. In Netlify, on this site: **Site configuration → Access & security → OAuth → Install provider → GitHub**, then paste the Client ID and secret.

The menu names in Netlify and GitHub change from time to time; search their docs for "OAuth provider" if a step doesn't match.

## 3. Give the owner access

1. The owner creates a free GitHub account.
2. In this repo: **Settings → Collaborators → Add people** → her username, with **Write** access.
3. She opens `https://<site>/admin`, clicks **Sign In with GitHub**, and accepts.

Fallback if the OAuth login gives trouble: the login screen also offers **Sign In Using Access Token** (a fine-grained GitHub token with *Contents: read and write* on this repo only).

## 4. Check it works

- In /admin, edit a product's short description and save.
- A commit `CMS: editar products "…"` appears on `main`.
- About a minute later the change is live.

## Notes

- **Deleting a category** hides all its products from the site (their files stay). Prefer the "Ocultar del sitio" switch.
- **Photos** go to `public/uploads/`. Ask the owner to upload photos under ~1 MB (phone photos are often 3–5 MB; WhatsApp-compressed copies are fine).
- **Fixed pages** (Inicio, Cómo comprar, Nosotros, Contacto) are not in the admin. Cómo comprar holds her legal wording and is deliberately kept out of reach of accidental edits.
- The CMS script is pinned in `public/admin/index.html`. To update it, change the version number there.
