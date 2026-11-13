# Setup: putting the site and admin portal live

Same setup as the SunMoonRisingYoga portal. You need **GitHub** (you have it), **Netlify**, and a **Google Cloud** project for sign-in. All free, no card. About 30 minutes, once.

How it works: the owner signs in at `/admin` with Google. Only emails in `ADMIN_EMAILS` get in. When she taps **Guardar y publicar**, a Netlify function commits `src/data/catalog.json` to GitHub using a token only the server sees, and Netlify rebuilds the site (1–2 minutes). **Nobody needs a GitHub account except you.**

---

## 1. Merge into `main`

The portal saves to the branch in `GITHUB_BRANCH` (step 5), and Netlify publishes `main`. Merge this work into `main` first.

## 2. Connect Netlify

1. **netlify.com** → **Add new site** → **Import an existing project** → **GitHub** → `Dipa-website`.
2. Build settings come from `netlify.toml` (`npm run build`, publish `dist`, functions `netlify/functions`). **Deploy**.
3. Note the URL, here `https://dipa-grafica.netlify.app`.

The public site works now. The portal won't let anyone in until steps 3–5 are done.

## 3. Google sign-in

1. **console.cloud.google.com** → create a project called `DIPA`.
2. Search **Google Auth Platform** → **Get started**.
   - App name: `DIPA Admin`; support email: yours.
   - Audience: **External**.
   - **Test users**: add **your email and the owner's**. While the app is unpublished, only listed test users can sign in. Skip this and Google blocks her before our allowlist even sees her.
3. **Clients** → **Create client** → **Web application**, name `Admin portal`.
   - **Authorised JavaScript origins**: the Netlify URL (`https://dipa-grafica.netlify.app`). Add the custom domain too when there is one.
4. Copy the **Client ID** (ends in `.apps.googleusercontent.com`).

The owner's email must be a Google account. A Gmail address already is one; any other address can be turned into a Google account at accounts.google.com ("use my current email address instead").

## 4. GitHub token (lets the portal save)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name `dipa-admin`. Expiry: up to a year. **Put a reminder in your calendar**: when it expires, saving stops working until you make a new one and update `GITHUB_TOKEN`.
3. **Repository access** → *Only select repositories* → `Dipa-website`.
4. **Repository permissions** → **Contents: Read and write**. Nothing else.
5. Generate and copy it (`github_pat_…`).

## 5. Netlify environment variables

Netlify → the site → **Site configuration** → **Environment variables**:

| Key | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID from step 3 |
| `ADMIN_EMAILS` | `you@gmail.com,owner@example.com` (comma-separated) |
| `GITHUB_TOKEN` | token from step 4 (mark as secret) |
| `GITHUB_REPO` | `maldonadocintia-code/Dipa-website` |
| `GITHUB_BRANCH` | `main` |

Then **Deploys** → **Trigger deploy** so the functions pick them up.

To add or remove an editor later: change `ADMIN_EMAILS` (and the Google test users list), then redeploy.

## 6. Check it works

1. Open `https://<site>/admin`, sign in with Google.
2. Edit a product's short description → **Guardar y publicar**.
3. A commit "Actualizar catálogo (panel de administración — your email)" appears on `main`; the site updates 1–2 minutes later.
4. Sign in with an email that's *not* in `ADMIN_EMAILS`: it must say it has no permission.

---

## Notes

- **What the portal edits:** products, categories and shop details (WhatsApp, Instagram, hours, address). All in `src/data/catalog.json`. The fixed pages (Inicio, Cómo comprar, Nosotros, Contacto) are not in the portal; Cómo comprar holds her legal wording.
- **Photos** are resized in the browser (max 1600 px, JPEG) and committed to `public/uploads/`. Each photo upload is its own commit and triggers a rebuild; Netlify's free plan has plenty of build minutes for this.
- **Safety:** every save is validated (`lib/catalog-schema.mjs`) before it's committed, so a save can't break the build. If two people edit at once, the second save is refused rather than overwriting the first. Every change is a git commit, so anything can be rolled back.
- **Local testing of the portal** needs the Netlify CLI (`npx netlify dev`) with the same environment variables in a local `.env`, plus `http://localhost:8888` in the Google client's JavaScript origins.
