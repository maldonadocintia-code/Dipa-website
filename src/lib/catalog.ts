import raw from '../data/catalog.json';
// @ts-ignore - shared plain-JS module, also used by the Netlify save function
import { validateCatalog } from '../../lib/catalog-schema.mjs';

export interface Site { whatsappNumber: string; whatsappDisplay: string; instagramUser: string; hours: string; area: string; address: string; footerTagline: string; copyright: string }
export interface Category {
  id: string; title: string; hidden: boolean; summary?: string; kicker?: string; intro?: string; note?: string;
  image?: string; photoLabel?: string; papers?: string[]; sizes?: string[];
  combo?: { title: string; text: string; message: string };
}
export interface Product {
  id: string; title: string; category: string; hidden: boolean; featured: boolean; hasPage: boolean;
  summary?: string; image?: string; photoLabel?: string; whatsappName?: string; badge?: string; description?: string;
  options?: { label: string; value: string }[]; gallery?: { label: string; image?: string }[]; related?: string[];
}
type Photo = { image?: string; photoLabel?: string };
export interface Home {
  hero: { title: string; text: string; badge?: string; image?: string; photoLabel?: string; smallImage?: string; smallPhotoLabel?: string };
  notFound: { title: string; text: string; message: string };
  audiences: { kicker?: string; title: string; cards: (Photo & { title: string; text?: string; linkLabel: string; category: string })[] };
  featured: { kicker?: string; title: string; cards: (Photo & { badge?: string; title: string; text?: string; tags?: string[]; buttonLabel: string; category?: string; message?: string })[] };
  instagram: { title: string; text: string; photos: { image?: string; label: string }[] };
  closing: { show: boolean; title?: string; text?: string; message?: string };
}
export interface Catalog { site: Site; categories: Category[]; products: Product[]; home?: Home }

// Throws at build time if catalog.json is malformed.
export const catalog: Catalog = validateCatalog(raw);

/** Visible categories, in the order set in the admin portal. */
export function getCategories(): Category[] {
  return catalog.categories.filter((c) => !c.hidden);
}

/** Visible products (of a visible category), optionally for one category. */
export function getProducts(categoryId?: string): Product[] {
  const visible = new Set(getCategories().map((c) => c.id));
  return catalog.products.filter((p) => !p.hidden && visible.has(p.category) && (!categoryId || p.category === categoryId));
}

export function getProduct(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

export const productUrl = (p: Product) => `/catalogo/${p.category}/${p.id}`;
export const photoLabel = (x: { title: string; photoLabel?: string }) => x.photoLabel || `Foto: ${x.title.toLowerCase()}`;
