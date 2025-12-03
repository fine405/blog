// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://fine405.github.io',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
