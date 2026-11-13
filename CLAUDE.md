# DIPA – sitio catálogo

Catalogue website for DIPA, a print and stationery shop in Pablo Podestá, Buenos Aires.
Read `HANDOVER.md` in full before writing any code. It is the spec; `design/` holds the approved design (version 1).

## Rules that always apply

- All on-page text is in Argentine Spanish using "vos" (Consultá, Pedí, Elegí, Escribinos). Never switch to "tú" or "usted".
- No prices, no cart, no online payments. Every product leads to a WhatsApp enquiry.
- Use the copy from the design files verbatim. Do not invent product details, prices, stats, addresses or testimonials; keep the `[PLACEHOLDER]` text until the owner provides the real content.
- Keep the colours, fonts and radii as CSS custom properties (tokens) in one place, so they can be changed once for the whole site.
- The logo must be swappable in one place (one component or one partial).
- Images are labelled placeholder boxes until real photos arrive. No licensed characters or third-party brands in imagery.
- Mobile first. Check every page at 360–390 px wide and at desktop width (1280–1440 px).
- Ask before choosing the tech stack, hosting or domain: those are not decided yet (see HANDOVER.md §10).

## Decisions made (13 Nov 2026)

- Stack: Astro (static) + Sveltia CMS at `/admin` (git-based, edits JSON in `src/content/` and `src/data/site.json`) + Netlify. See `README.md` and `docs/ADMIN-SETUP.md`.
- Categories and products are data. When adding a field, update both `src/content.config.ts` and `public/admin/config.yml`.
