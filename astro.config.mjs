// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';

const site = (process.env.SITE_URL ?? 'https://fine405.vercel.app').replace(/\/+$/, '');

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkGfm],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
