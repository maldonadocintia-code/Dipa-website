import { getCollection, type CollectionEntry } from 'astro:content';

const byOrder = <T extends { data: { order: number; title: string } }>(a: T, b: T) =>
  a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, 'es');

export async function getCategories(): Promise<CollectionEntry<'categories'>[]> {
  return (await getCollection('categories', (c) => !c.data.hidden)).sort(byOrder);
}

export async function getProducts(categoryId?: string): Promise<CollectionEntry<'products'>[]> {
  const visibleCats = new Set((await getCategories()).map((c) => c.id));
  return (await getCollection('products', (p) => !p.data.hidden && visibleCats.has(p.data.category.id)))
    .filter((p) => !categoryId || p.data.category.id === categoryId)
    .sort(byOrder);
}
