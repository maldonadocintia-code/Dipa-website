# DIPA – Handover for build (design version 1)

**Status:** design approved by the owner (version 1 of three explored). Build this version only.
**Date:** 13 Nov 2026
**Shop:** DIPA (logo reads "DIPA GRÁFICA"), print and stationery shop in Pablo Podestá, Buenos Aires.
**Contact used everywhere:** WhatsApp 11 3242-4474 · Instagram @disypapel · Lunes a viernes de 9 a 18 · Pablo Podestá, Buenos Aires.

---

## 1. What we're building

A mobile-first catalogue website. People browse categories and products, then enquire on WhatsApp.

- No prices on the site in this first version. Prices may be added later from a Google Sheet (see §10).
- No cart, no online payment, no accounts.
- All on-page text in Argentine Spanish with "vos".
- Every product and call to action opens WhatsApp with a pre-written message.

## 2. What's in this folder

| Path | What it is |
|---|---|
| `CLAUDE.md` | Short project rules for Claude Code. |
| `HANDOVER.md` | This spec. |
| `design/*.dc.html` | The approved design, one file per screen. **This is the source of truth for layout, spacing, copy and styles.** |
| `assets/logo/dipa-logo.svg` | Logo for light backgrounds (header, hero). Vector, cropped, transparent background. |
| `assets/logo/dipa-logo-pie.svg` | Logo for the olive footer (white letters). |
| `assets/logo/originales/` | The owner's original logo PDFs, for reference only. |

### 2.1 How to read the `.dc.html` design files

They come from a design tool and use its own markup. They are not production code; translate them into the chosen stack:

| In the design file | Means | Build as |
|---|---|---|
| `<x-dc>` … `</x-dc>` | The page body | Normal page markup |
| `<helmet>` | Fonts + page CSS (tokens and classes) | Global stylesheet |
| `<script src="./support.js">` and the `<script type="text/x-dc">` block | Design-tool runtime | Drop; re-implement the behaviour (§7) in plain JS |
| `{{menuOpen}}`, `{{menuLabel}}` etc. | State-driven values | See §7 |
| `<sc-if value="…">` | Show/hide block | Conditional rendering or a CSS class toggle |
| `<sc-for list="…">` | Repeat | Loop |
| `<dc-import name="Logo" variant="sm" tone="dark">` | The logo component | One logo component/partial (§4.6) |
| `src="/_blob/f814b552…"` | Logo for light backgrounds | `assets/logo/dipa-logo.svg` |
| `src="/_blob/35092fa8…"` | Logo for the footer | `assets/logo/dipa-logo-pie.svg` |
| `href="Catalogo.dc.html"` etc. | Links between screens | Real routes (§3) |
| Inline `style="…"` | The exact visual spec | Move into CSS; keep the values |

`Tokens.dc.html` is a style-guide board, not a page. `Logo.dc.html` is the logo component.

## 3. Pages and routes

Suggested routes (final URLs are open to change):

| Page | Route | Design file(s) |
|---|---|---|
| Inicio | `/` | `Main.dc.html` (mobile) + `Inicio-Desktop.dc.html` (≥ 900 px) |
| Catálogo | `/catalogo` | `Catalogo.dc.html` |
| Category: Para emprendimientos | `/catalogo/para-emprendimientos` | `Categoria-Emprendimientos.dc.html` |
| Product: Stickers con logo | `/catalogo/para-emprendimientos/stickers-con-logo` | `Producto-Stickers.dc.html` |
| Cómo comprar | `/como-comprar` | `Como-comprar.dc.html` |
| Nosotros | `/nosotros` | `Nosotros.dc.html` |
| Contacto | `/contacto` | `Contacto.dc.html` |

- **One responsive site, not two.** The mobile files already respond to wider screens (fluid grids, `max-width: 1200px` container, desktop nav from 900 px). Only the home page has a dedicated desktop design; use `Inicio-Desktop.dc.html` for the home layout at ≥ 900 px. Other pages: use their mobile file's own responsive behaviour.
- **Only one category page and one product page were designed**, as templates. The other 7 categories (§8.2) reuse the category template with their own content. In the design, those 7 catalogue cards link to `#`; in the build they link to their category pages.
- **Product pages for the other products:** not decided. In the design, every product card except "Stickers con logo" has a "Consultá" button that goes straight to WhatsApp. Keep that unless the owner asks for more product pages.

## 4. Design system

### 4.1 Colours (tokens)

Use these exact names and values as CSS custom properties, defined once.

| Token | Hex | Role |
|---|---|---|
| `--c-terracotta` | `#A44B3F` | Brand colour: primary buttons, headings, CTA bands, floating WhatsApp button |
| `--c-peach` | `#F09C78` | Accents: badges, "tape" strips, decorative blob |
| `--c-sage` | `#CBDFBC` | Section backgrounds, image placeholders, hover backgrounds |
| `--c-cream` | `#F7F4D3` | Main page background, header |
| `--c-lightgreen` | `#D5E09C` | Tags, Instagram section, decorative circle |
| `--c-mutedsage` | `#9AAE88` | Placeholder dashed borders |
| `--c-olive` | `#5E6B4F` | Secondary buttons, footer |
| `--c-burnt` | `#E39260` | Keyboard focus ring (see the known issue in §9) |
| `--c-brown` | `#4F2C1D` | Body text, menu button, hover state for buttons |
| `--c-paper` | `#FFFDF4` | Cards |

**Text colour rule (from the brief):** white text only on terracotta, olive or brown. On peach, sage, cream, light green or muted sage, use brown text.

### 4.2 Typography

Google Fonts (all open licence):

| Token | Font | Weights | Used for |
|---|---|---|---|
| `--f-display` | Fraunces (fallback Georgia, serif) | 500, 600, 700 | Headings h1–h3, mobile menu links |
| `--f-body` | DM Sans (fallback system-ui, sans-serif) | 400, 500, 700 | Body, buttons, labels |
| `--f-hand` | Caveat (fallback cursive) | 500, 600 | Small handwritten "kicker" labels above headings |

Base: 16 px, line-height 1.5 (desktop home: 17 px, 1.55). Headings: weight 600, line-height 1.15. Exact sizes per element are in the design files.

### 4.3 Shape and layout

- Radii: `--r-sm: 12px`, `--r-md: 20px`, `--r-lg: 32px`, `--r-pill: 999px`.
- Content container: `max-width: 1200px`, side padding 16 px on mobile, 24 px on desktop.
- Breakpoint: **900 px** (desktop nav shows, the "Menú" button hides).
- Grids use `repeat(auto-fit | auto-fill, minmax(…, 1fr))`; keep that so they reflow without extra breakpoints.

### 4.4 Buttons

All are at least 44–50 px tall with pill corners. The button classes are defined in each file's `<helmet>`:

| Class | Look | Use |
|---|---|---|
| `.btn-primary` | Terracotta, white text; hover brown | Main WhatsApp actions |
| `.btn-secondary` | Olive, white text; hover brown | "Ver productos", "Consultá por tu kit" |
| `.btn-ghost` | Transparent, 2 px brown outline; hover brown fill | "Ver catálogo", "Consultá" on product cards |
| `.btn-cream` | Cream, brown text | Buttons inside terracotta CTA bands |
| `.btn-sm` | Smaller variant (44 px) | Product cards |

### 4.5 Other components

- **Image placeholder (`.ph`)**: sage box, 2 px dashed muted-sage border, brown 13 px label such as "Foto: stickers con logo". Every image is one of these until real photos arrive; keep the labels, since they say which photo goes where. `.ph-cream` is the cream variant used on sage sections.
- **Tag (`.tag`)**: light-green pill, brown text (for example "No incluye colocación").
- **Badge (`.badge`)**: peach pill, bold brown text (for example "Destacado", "Listo en aprox. 5 días hábiles").
- **Kicker (`.kicker`)**: Caveat 26 px, terracotta (brown when on sage).
- **Cards**: paper background, 1 px `rgba(79,44,29,0.1)` border, `--r-md` or `--r-lg` corners.
- **Decorations** (all `aria-hidden="true"`): light-green circle and peach blob behind the hero; a peach "tape" strip (85% opacity, rotated −4° on the hero photo and −5° on the Nosotros photo); on the desktop home, the small hero photo and the tape on the "¿No encontrás…?" strip are rotated −3°.
- **Icons**: inline stroke SVGs in the design (chat bubble for WhatsApp, Instagram outline, clock, map pin, magnifier, arrow). They are generic on purpose; the official WhatsApp and Instagram marks can replace them if the owner wants.

### 4.6 Logo

One component with two settings:

| Setting | Values | File |
|---|---|---|
| `tone="dark"` (light backgrounds) | — | `dipa-logo.svg` (terracotta letters, brown "GRÁFICA", olive squares and line) |
| `tone="light"` (olive footer) | — | `dipa-logo-pie.svg` (white letters and "GRÁFICA", light-green squares) |
| `variant` (height) | `sm` 44 px · `md` 64 px · `lg` 112 px · `xl` 170 px | Width auto |

Where it's used: header `sm`/dark, home hero `lg`/dark (mobile and desktop), footer `md`/light. Alt text: `DIPA Gráfica`. The header logo is a link to `/` with `aria-label="DIPA, ir al inicio"`.

These SVGs are recoloured versions of the owner's logo; see the open decision in §10.

## 5. Global elements (every page)

**Header** (sticky, cream, bottom border `rgba(79,44,29,0.15)`):
- Mobile: logo · Instagram icon button · "Menú" button (brown pill). The button opens a dropdown menu panel below the header with the 5 links (Fraunces 22 px) and a "Consultá por WhatsApp" primary button. The label switches between "Menú" and "Cerrar".
- ≥ 900 px: logo · inline nav (Inicio, Catálogo, Cómo comprar, Nosotros, Contacto) · Instagram icon. The current page is a terracotta pill with `aria-current="page"`. The desktop home header also has a small "Consultá" primary button.

**Floating WhatsApp button**: fixed bottom-right (16 px offset), 60 px terracotta circle with a chat icon, `aria-label="Escribinos por WhatsApp"`. On desktop home it is a pill with the text "Consultá por WhatsApp" (28 px offset).

**Footer** (olive, white text): logo (light), "Papelería personalizada e impresiones en Pablo Podestá.", WhatsApp 11 3242-4474, Instagram @disypapel, Lunes a viernes de 9 a 18, Pablo Podestá, Buenos Aires, footer nav, "© 2026 DIPA · Diseño y Papel" (see §10). Bottom padding 104 px on mobile so the floating button doesn't cover content.

## 6. Page notes

Copy, order and styling are in each design file. Points that aren't obvious:

- **Inicio:** order is hero → "¿No encontrás lo que buscás?" → 3 audience cards ("Papelería para cada ocasión") → Destacados (tarjetería para emprendimientos, kits de cumple) → "Seguinos en Instagram" (6 placeholders) → closing CTA "¿Tenés una idea? Contanos." → footer.
  - The "¿No encontrás lo que buscás?" block is **different on mobile and desktop**. Mobile: a solid terracotta band. Desktop: a light "paper note" strip: off-white card, 2 px dashed terracotta border, peach tape strip, peach magnifier tile on the left, button on the right, all on one row.
- **Catálogo:** 8 category cards, plus a sage block "Impresiones full color" with placeholder paper types and sizes, plus the "¿No encontrás lo que buscás?" band.
- **Para emprendimientos:** breadcrumb, sage intro block, 8 product cards ("Stickers con logo" is highlighted with a peach border and a "Destacado" badge), then the "¿Armamos un combo para tu marca?" band. **That combo band appears only on this page**: the owner removed it from the home page.
- **Stickers con logo:** gallery (1 large + 4 thumbnails), badge, description, options list (`<dl>`), full-width WhatsApp button, deposit note with link to Cómo comprar, 2 related products.
- **Cómo comprar:** 5 numbered steps and the Condiciones block. **This text is legal and commercial wording from the owner: keep it word for word.**
- **Nosotros:** the "Texto provisorio" badge and the bracketed paragraph are placeholders for the owner's story.
- **Contacto:** 4 contact cards and a map placeholder. The address is still a placeholder.

## 7. Behaviour

- **Mobile menu:** a button with `aria-expanded` and `aria-controls="menu-movil"`. It toggles the menu panel and swaps the label between "Menú" and "Cerrar". Close the panel when a link is chosen and on Escape. Hidden at ≥ 900 px.
- **Product gallery:** the 4 thumbnails are buttons with `aria-pressed`. Choosing one shows that photo in the large slot; the selected thumbnail has a 3 px terracotta border, the others the 2 px dashed muted-sage border. In the design the large slot shows the photo's label; with real photos, swap the image.
- **WhatsApp links:** format `https://wa.me/5491132424474?text=<URL-encoded message>`. Messages used in the design:

| Where | Message (`text=`, decoded) |
|---|---|
| General buttons, menu, floating button | Hola DIPA! Quiero hacer una consulta |
| "¿No encontrás lo que buscás?" (home) | Hola DIPA! Busco algo que no vi en el catálogo |
| Kits de cumple | Hola DIPA! Quiero consultar por un kit de cumple |
| "¿Armamos un combo…?" (category page) | Hola DIPA! Quiero consultar por productos para mi emprendimiento |
| Each product card | Hola DIPA! Quiero consultar por <product name> |
| Stickers con logo page | Hola DIPA! Quiero consultar por stickers con logo |
| Cómo comprar closing CTA | Hola DIPA! Quiero hacer un pedido |
| Footer number, Contacto card | (no message) |

  For new categories and products, generate the message from the product name, so adding a product needs no hand-written link.
- **Test the WhatsApp number on a real phone before launch.** `549` + `11 3242-4474` is the standard international format for an Argentine mobile, but confirm it opens the right chat.

## 8. Content

### 8.1 Placeholders the owner must fill

| Where | Placeholder |
|---|---|
| Stickers con logo | `[OPCIONES DE FORMA]`, `[TAMAÑOS DISPONIBLES]`, `[TIPO DE PAPEL O VINILO]`, `[CANTIDAD MÍNIMA]` |
| Catálogo → Impresiones full color | `[PAPEL 1–4]`, `[TAMAÑO 1–4]` |
| Contacto | `[DIRECCIÓN DEL LOCAL]`, map |
| Nosotros | Shop story paragraph (in brackets) and the "Texto provisorio" draft |
| All pages | Every photo (labelled placeholders) and the 6 Instagram images |

The short product descriptions in the design were drafted from the brief and still need the owner's confirmation.

### 8.2 Category contents (from the owner's brief)

- **Escolares:** etiquetas personalizadas con nombre y grado, asignaturas personalizadas, planner semanal, horarios con imán, pizarra blanca borrable, sello para cuaderno o carpeta.
- **Agendas y cuadernos:** agendas (emprendedora, estudiantil, docente), cuadernos artesanales personalizados, cuaderno pediátrico, cuaderno de recetas.
- **Para emprendimientos:** tarjetas personales, stickers con logo, tarjetería para packaging, tags, folletos, cuaderno de pedidos personalizado, talonario de presupuestos, sellos personalizados de madera. *(Designed.)*
- **Cumples:** invitación digital, tarjeta de souvenir, souvenir (pizarra borrable con actividades y fibrón), toppers, deco para cortina de fondo de fotos, banderines.
- **Fechas especiales:** Día de la Madre, Día del Padre, Día del Niño, Día del Amigo, Pascuas, Navidad, comuniones.
- **Calendarios:** modelos habituales.
- **Cartelería:** vinilo para vidriera, lonas, cartel tipo bandera. Note: "No incluye colocación".
- **Impresiones full color:** note "Solo impresión, tal como envíes el archivo", plus paper types and sizes (placeholders).

Keep categories and products as **data** (a JSON, YAML or Markdown collection), not hard-coded markup, so new products and, later, prices can be added without touching templates.

## 9. Accessibility

Already built into the design; keep it:

- Contrast (WCAG 2.1, checked): brown on cream 11:1, brown on sage 8.7:1, brown on peach 5.7:1, terracotta on cream 5.2:1, white on terracotta 5.7:1, white on olive 5.7:1. Terracotta on sage is only 4.1:1: never use it for normal-size text (the design uses brown on sage).
- Touch targets ≥ 44 px; real `<button>` and `<a>` elements; `aria-label` on icon-only buttons; decorative shapes `aria-hidden="true"`; breadcrumbs as `<nav aria-label="Estás en">`; `aria-current="page"` on the active nav item.
- Set `<html lang="es-AR">` (the design files say `es`).

**Known issue to fix in the build:** the focus ring (`--c-burnt` #E39260) is only 2.2:1 against the cream background, below the 3:1 minimum for focus indicators. Use brown (`--c-brown`) or terracotta for the focus ring instead. It's a one-line change.

## 10. Not decided yet: ask, don't assume

**For Cintia (build decisions):**
- Tech stack. Suggestion only: a static site (plain HTML/CSS/JS or a static generator such as Astro or Eleventy) is enough, since there's no backend, payment or login.
- Hosting and domain (no domain yet).
- How prices will come from the Google Sheet later.
- Whether the website should show recent Instagram posts automatically, or keep fixed images that link to the profile. The owner wants the site and Instagram linked both ways.

**For the owner (content and brand):**
1. **Name and tagline:** the logo says "DIPA GRÁFICA"; the brief and the footer say "DIPA · Diseño y Papel". Which one goes in the footer and the page titles?
2. **Logo colours:** the SVGs in `assets/logo` recolour her logo to the site palette, and she needs to approve them. Her originals are in `assets/logo/originales/`.
3. **Closing CTA on the home page** ("¿Tenés una idea? Contanos.") repeats the "¿No encontrás lo que buscás?" message. Keep both or drop the closing one?
4. "Precios sujetos a modificación sin previo aviso" appears in Condiciones although the site shows no prices. Keep as is (it's her text) unless she changes it.

## 11. Done when

- [ ] All 7 pages built at the routes above, plus the 7 remaining category pages from the category template.
- [ ] Mobile layouts match the mobile design files at 390 px; the home page matches `Inicio-Desktop.dc.html` at 1440 px.
- [ ] Tokens defined once; changing a token changes it site-wide.
- [ ] Logo is one component, swappable in one place.
- [ ] Every WhatsApp link opens the right chat with the right message (tested on a phone).
- [ ] Mobile menu and product gallery work with mouse, touch and keyboard.
- [ ] Focus ring fixed (§9); contrast pairs as listed.
- [ ] All copy in Argentine Spanish with "vos"; Cómo comprar and Condiciones verbatim; placeholders still clearly marked.
- [ ] No prices, cart or payment anywhere.
