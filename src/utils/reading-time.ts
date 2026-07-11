import { fromMarkdown } from 'mdast-util-from-markdown';

export interface ReadingTimeOptions {
  cjkCharactersPerMinute: number;
  wordsPerMinute: number;
  codeLinesPerMinute: number;
  codeBlockSeconds: number;
  inlineCodeSeconds: number;
  firstImageSeconds: number;
  minimumImageSeconds: number;
  imageStepSeconds: number;
}

export interface ReadingTimeEstimate {
  minutes: number;
  seconds: number;
  cjkCharacters: number;
  words: number;
  codeLines: number;
  codeBlocks: number;
  inlineCodeSpans: number;
  images: number;
  textSeconds: number;
  codeSeconds: number;
  imageSeconds: number;
}

export const DEFAULT_READING_TIME_OPTIONS: Readonly<ReadingTimeOptions> = Object.freeze({
  cjkCharactersPerMinute: 300,
  wordsPerMinute: 200,
  codeLinesPerMinute: 60,
  codeBlockSeconds: 5,
  inlineCodeSeconds: 1,
  firstImageSeconds: 12,
  minimumImageSeconds: 3,
  imageStepSeconds: 1,
});

interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
}

interface MarkdownMetrics {
  text: string;
  codeLines: number;
  codeBlocks: number;
  inlineCodeSpans: number;
  images: number;
}

const CJK_CHARACTER_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65]/gu;
const WORD_PATTERN = /[\p{L}\p{N}]+(?:[._+/#,@'’:\-][\p{L}\p{N}]+)*/gu;
const VISIBLE_URL_PATTERN = /\b(?:https?:\/\/|mailto:|www\.)[^\s<]+/giu;

function extractVisibleHtml(value: string): { text: string; images: number } {
  const images = value.match(/<img\b/giu)?.length ?? 0;
  const text = value
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, ' ')
    .replace(/<[^>]*>/g, ' ');

  return { text, images };
}

function analyzeMarkdown(content: string): MarkdownMetrics {
  const textParts: string[] = [];
  let codeLines = 0;
  let codeBlocks = 0;
  let inlineCodeSpans = 0;
  let images = 0;

  function visit(node: MarkdownNode): void {
    switch (node.type) {
      case 'code': {
        const nonBlankLines = (node.value ?? '')
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0).length;

        if (nonBlankLines > 0) {
          codeLines += nonBlankLines;
          codeBlocks += 1;
        }
        return;
      }
      case 'inlineCode':
        if (node.value?.trim()) {
          textParts.push(node.value);
          inlineCodeSpans += 1;
        }
        return;
      case 'image':
      case 'imageReference':
        images += 1;
        return;
      case 'html': {
        const html = extractVisibleHtml(node.value ?? '');
        if (html.text.trim()) textParts.push(html.text);
        images += html.images;
        return;
      }
      case 'text':
        if (node.value) textParts.push(node.value);
        return;
      case 'definition':
        return;
      default:
        node.children?.forEach(visit);
    }
  }

  visit(fromMarkdown(content) as MarkdownNode);

  return {
    text: textParts.join(' '),
    codeLines,
    codeBlocks,
    inlineCodeSpans,
    images,
  };
}

function countText(text: string): { cjkCharacters: number; words: number } {
  // A visibly printed URL is one reading unit. Markdown link destinations never enter this text.
  const normalizedText = text.replace(VISIBLE_URL_PATTERN, ' visible-url ');
  const cjkCharacters = normalizedText.match(CJK_CHARACTER_PATTERN)?.length ?? 0;
  const words = normalizedText.replace(CJK_CHARACTER_PATTERN, ' ').match(WORD_PATTERN)?.length ?? 0;

  return { cjkCharacters, words };
}

function calculateImageSeconds(imageCount: number, options: ReadingTimeOptions): number {
  let seconds = 0;

  for (let index = 0; index < imageCount; index += 1) {
    seconds += Math.max(
      options.minimumImageSeconds,
      options.firstImageSeconds - index * options.imageStepSeconds
    );
  }

  return seconds;
}

/**
 * Estimate the time required to read a Markdown article.
 *
 * Only rendered text is counted: link destinations and Markdown syntax are ignored,
 * while inline code, non-empty fenced/indented code lines, and images receive
 * explicit reading time.
 */
export function estimateReadingTime(
  content: string,
  overrides: Partial<ReadingTimeOptions> = {}
): ReadingTimeEstimate {
  const options = { ...DEFAULT_READING_TIME_OPTIONS, ...overrides };
  const markdown = analyzeMarkdown(content);
  const text = countText(markdown.text);

  const textSeconds =
    (text.cjkCharacters / options.cjkCharactersPerMinute) * 60 +
    (text.words / options.wordsPerMinute) * 60 +
    markdown.inlineCodeSpans * options.inlineCodeSeconds;
  const codeSeconds =
    (markdown.codeLines / options.codeLinesPerMinute) * 60 +
    markdown.codeBlocks * options.codeBlockSeconds;
  const imageSeconds = calculateImageSeconds(markdown.images, options);
  const totalSeconds = textSeconds + codeSeconds + imageSeconds;

  return {
    minutes: Math.max(1, Math.ceil((totalSeconds - 1e-9) / 60)),
    seconds: Math.ceil(totalSeconds),
    cjkCharacters: text.cjkCharacters,
    words: text.words,
    codeLines: markdown.codeLines,
    codeBlocks: markdown.codeBlocks,
    inlineCodeSpans: markdown.inlineCodeSpans,
    images: markdown.images,
    textSeconds,
    codeSeconds,
    imageSeconds,
  };
}

export function calculateReadingTime(
  content: string,
  options?: Partial<ReadingTimeOptions>
): number {
  return estimateReadingTime(content, options).minutes;
}
