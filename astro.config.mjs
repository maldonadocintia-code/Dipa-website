import { defineConfig } from 'astro/config';

export default defineConfig({
  // Set to the real domain once there is one (used for canonical URLs and sitemaps).
  site: 'https://dipa.netlify.app',
  trailingSlash: 'ignore',
});
