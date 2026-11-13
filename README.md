# DIPA – sitio catálogo

Catalogue website for DIPA (print and stationery shop, Pablo Podestá). Built from design version 1 in `design/`; the full spec is `HANDOVER.md`.

**Stack:** [Astro](https://astro.build) (static output) · custom admin portal at `/admin` (Google sign-in + email allowlist, Netlify Functions commit to GitHub; same pattern as the SunMoonRisingYoga site) · Netlify hosting.

## Run locally

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
npm test         # catalogue validation tests
```

## Where things live

| What | Where |
|---|---|
| Colour, font and radius tokens | `src/styles/global.css` (top of file) |
| Logo (one component) | `src/components/Logo.astro`; files in `public/logo/` |
| Catalogue: shop details, categories, products | `src/data/catalog.json` (edited from /admin) |
| Catalogue rules (used by build and by the save function) | `lib/catalog-schema.mjs` |
| Admin portal (browser) | `public/admin/` |
| Admin portal (server: login check, save, photo upload) | `netlify/functions/`, `lib/auth.mjs`, `lib/github.mjs` |
| WhatsApp link + message helpers | `src/lib/site.ts` |
| Fixed pages (Inicio, Cómo comprar, Nosotros, Contacto) | `src/pages/` |
| Uploaded photos | `public/uploads/` |

Routes: `/`, `/catalogo`, `/catalogo/<categoría>`, `/catalogo/<categoría>/<producto>` (only for products with "Tiene página propia"), `/como-comprar`, `/nosotros`, `/contacto`.

## Admin panel

See `docs/ADMIN-SETUP.md` for the one-time setup (Netlify, Google sign-in, GitHub token, allowed emails) and `docs/GUIA-ADMIN.md` for the owner's how-to (in Spanish).
