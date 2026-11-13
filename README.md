# DIPA – sitio catálogo

Catalogue website for DIPA (print and stationery shop, Pablo Podestá). Built from design version 1 in `design/`; the full spec is `HANDOVER.md`.

**Stack:** [Astro](https://astro.build) (static output) · [Sveltia CMS](https://github.com/sveltia/sveltia-cms) at `/admin` · Netlify hosting.

## Run locally

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## Where things live

| What | Where |
|---|---|
| Colour, font and radius tokens | `src/styles/global.css` (top of file) |
| Logo (one component) | `src/components/Logo.astro`; files in `public/logo/` |
| Contact details, hours, WhatsApp number | `src/data/site.json` (editable in /admin → Datos del local) |
| Categories | `src/content/categories/*.json` (editable in /admin) |
| Products | `src/content/products/*.json` (editable in /admin) |
| Data schema | `src/content.config.ts` (must match `public/admin/config.yml`) |
| WhatsApp link + message helpers | `src/lib/site.ts` |
| Fixed pages (Inicio, Cómo comprar, Nosotros, Contacto) | `src/pages/` |
| Uploaded photos | `public/uploads/` |

Routes: `/`, `/catalogo`, `/catalogo/<categoría>`, `/catalogo/<categoría>/<producto>` (only for products with "Tiene página propia"), `/como-comprar`, `/nosotros`, `/contacto`.

## Admin panel

See `docs/ADMIN-SETUP.md` to connect the admin panel (one-time setup) and `docs/GUIA-ADMIN.md` for the owner's how-to (in Spanish).
