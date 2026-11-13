// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateCatalog } from '../lib/catalog-schema.mjs';

const catalog = () => JSON.parse(fs.readFileSync(new URL('../src/data/catalog.json', import.meta.url)));

test('the committed catalog is valid and unchanged by validation', () => {
  const c = catalog();
  assert.deepEqual(validateCatalog(c), c);
});

test('rejects a WhatsApp number in the wrong format', () => {
  const c = catalog();
  c.site.whatsappNumber = '1132424474';
  assert.throws(() => validateCatalog(c), /549/);
});

test('rejects a product without a valid category', () => {
  const c = catalog();
  c.products[0].category = 'no-existe';
  assert.throws(() => validateCatalog(c), /categoría/);
});

test('rejects duplicate product ids', () => {
  const c = catalog();
  c.products.push({ ...c.products[0] });
  assert.throws(() => validateCatalog(c), /misma dirección/);
});

test('rejects image paths outside /uploads', () => {
  const c = catalog();
  c.products[0].image = 'https://example.com/x.jpg';
  assert.throws(() => validateCatalog(c), /foto/);
});

test('drops related products that no longer exist and empty optional fields', () => {
  const c = catalog();
  const p = c.products.find((x) => x.id === 'stickers-con-logo');
  p.related = ['tags', 'borrado', 'stickers-con-logo'];
  p.badge = '   ';
  c.categories[0].combo = { title: '', text: '', message: '' };
  const out = validateCatalog(c);
  const q = out.products.find((x) => x.id === 'stickers-con-logo');
  assert.deepEqual(q.related, ['tags']);
  assert.equal(q.badge, undefined);
  assert.equal(out.categories[0].combo, undefined);
});
