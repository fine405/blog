import type { APIRoute } from 'astro';

const DEFAULT_SITE = 'https://fine405.vercel.app';

export const GET: APIRoute = ({ site }) => {
  const origin = (site?.toString() || DEFAULT_SITE).replace(/\/+$/, '');
  const body = `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap-index.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
