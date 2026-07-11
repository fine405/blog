import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/discussions.js';

function createResponse() {
  return {
    body: undefined,
    headers: new Map(),
    statusCode: 200,
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), String(value));
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
    end() {
      return this;
    },
  };
}

test('proxies a known blog discussion and enables cross-origin reads', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return new Response('{"discussion":{"comments":[]}}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const response = createResponse();
  await handler(
    { method: 'GET', query: { term: 'blog/hello-world' } },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(requestedUrl.origin, 'https://giscus.app');
  assert.equal(requestedUrl.pathname, '/api/discussions');
  assert.equal(requestedUrl.searchParams.get('repo'), 'fine405/blog');
  assert.equal(requestedUrl.searchParams.get('term'), 'blog/hello-world');
  assert.equal(requestedUrl.searchParams.get('category'), 'General');
  assert.equal(response.body, '{"discussion":{"comments":[]}}');
});

test('rejects terms outside blog discussions without calling upstream', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('unexpected fetch');
  };

  const response = createResponse();
  await handler({ method: 'GET', query: { term: 'other/repo' } }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'Invalid discussion term' });
  assert.equal(fetchCalled, false);
});

test('answers CORS preflight requests', async () => {
  const response = createResponse();
  await handler({ method: 'OPTIONS', query: {} }, response);

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, OPTIONS');
});
