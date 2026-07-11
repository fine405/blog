const DISCUSSIONS_UPSTREAM = 'https://giscus.app/api/discussions';
const COMMENTS_REPO = 'fine405/blog';
const COMMENTS_CATEGORY = 'General';

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Accept');
  response.setHeader('Access-Control-Max-Age', '86400');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

function getDiscussionTerm(request) {
  const value = request.query?.term;
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    return response.status(204).end();
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, OPTIONS');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const term = getDiscussionTerm(request);
  if (!term.startsWith('blog/') || term.length > 300) {
    return response.status(400).json({ error: 'Invalid discussion term' });
  }

  const upstreamUrl = new URL(DISCUSSIONS_UPSTREAM);
  upstreamUrl.search = new URLSearchParams({
    repo: COMMENTS_REPO,
    term,
    category: COMMENTS_CATEGORY,
    strict: 'false',
    first: '20',
  }).toString();

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
    });
    const body = await upstreamResponse.text();

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader(
      'Cache-Control',
      upstreamResponse.ok
        ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
        : 'no-store'
    );
    return response.status(upstreamResponse.status).send(body);
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(502).json({ error: 'Comments upstream unavailable' });
  }
}
