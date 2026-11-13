import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Catalogue data lives in src/content as JSON files, edited by hand or from /admin (Sveltia CMS).
// Field names here must match public/admin/config.yml.

const categories = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/categories' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(100),
    hidden: z.boolean().default(false),
    summary: z.string().default(''),
    kicker: z.string().optional(),
    intro: z.string().optional(),
    note: z.string().optional(),
    image: z.string().optional(),
    photoLabel: z.string().optional(),
    papers: z.array(z.string()).optional(),
    sizes: z.array(z.string()).optional(),
    combo: z
      .object({ title: z.string(), text: z.string(), message: z.string() })
      .optional(),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    category: reference('categories'),
    order: z.number().default(100),
    hidden: z.boolean().default(false),
    featured: z.boolean().default(false),
    summary: z.string().default(''),
    image: z.string().optional(),
    photoLabel: z.string().optional(),
    whatsappName: z.string().optional(),
    hasPage: z.boolean().default(false),
    description: z.string().optional(),
    badge: z.string().optional(),
    options: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    gallery: z.array(z.object({ label: z.string(), image: z.string().optional() })).default([]),
    related: z.array(reference('products')).default([]),
  }),
});

export const collections = { categories, products };
