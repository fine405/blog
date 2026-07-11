import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateReadingTime,
  estimateReadingTime,
} from '../src/utils/reading-time.ts';

test('keeps empty and very short articles at one minute', () => {
  assert.equal(calculateReadingTime(''), 1);
  assert.equal(calculateReadingTime('很短'), 1);
});

test('counts mixed CJK text, technical words, and numbers', () => {
  const estimate = estimateReadingTime('中文 GPT-5.6 Node.js 1,050,000');

  assert.equal(estimate.cjkCharacters, 2);
  assert.equal(estimate.words, 3);
});

test('counts link labels without counting hidden destinations', () => {
  const estimate = estimateReadingTime(
    '[OpenAI 文档](https://example.com/a/very/long/hidden/path?with=many&query=words)'
  );

  assert.equal(estimate.cjkCharacters, 2);
  assert.equal(estimate.words, 1);
});

test('counts inline code as visible content with a context-switch cost', () => {
  const estimate = estimateReadingTime('调用 `calculateReadingTime()` 即可。');

  assert.equal(estimate.inlineCodeSpans, 1);
  assert.equal(estimate.words, 1);
  assert.ok(estimate.textSeconds >= 1);
});

test('supports backtick, tilde, and indented code while ignoring blank lines', () => {
  const estimate = estimateReadingTime(`
\`\`\`ts
const first = true;

const second = true;
\`\`\`

~~~sh
pnpm build
~~~

    const indented = true;
`);

  assert.equal(estimate.codeBlocks, 3);
  assert.equal(estimate.codeLines, 4);
});

test('adds explicit viewing time for images without reading hidden paths or alt text', () => {
  const markdown = Array.from(
    { length: 8 },
    (_, index) => `![隐藏说明 ${index}](./long-hidden-image-name-${index}.png)`
  ).join('\n\n');
  const estimate = estimateReadingTime(markdown);

  assert.equal(estimate.images, 8);
  assert.equal(estimate.cjkCharacters, 0);
  assert.equal(estimate.words, 0);
  assert.equal(estimate.imageSeconds, 68);
  assert.equal(estimate.minutes, 2);
});

test('ignores HTML attributes and comments while preserving visible HTML text', () => {
  const estimate = estimateReadingTime(
    '<span data-label="hidden words">可见</span><!-- hidden comment --><img src="hidden.png">'
  );

  assert.equal(estimate.cjkCharacters, 2);
  assert.equal(estimate.words, 0);
  assert.equal(estimate.images, 1);
});
