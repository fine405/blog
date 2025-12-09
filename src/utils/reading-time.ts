/**
 * 计算阅读时间（区分中英文）
 * 中文：约 300 字/分钟
 * 英文：约 200 词/分钟
 * 代码：约 100 行/分钟（快速浏览）
 */
export function calculateReadingTime(content: string): number {
  // 提取代码块并计算行数
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  const codeLines = codeBlocks.reduce((sum, block) => {
    return sum + block.split('\n').length - 2; // 减去 ``` 开头和结尾
  }, 0);

  // 移除代码块后的正文
  const textWithoutCode = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');

  // 统计中文字符数（包括中文标点）
  const chineseChars = textWithoutCode.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g) || [];
  const chineseCount = chineseChars.length;

  // 统计英文单词数（移除中文后按空格分词）
  const textWithoutChinese = textWithoutCode.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, ' ');
  const englishWords = textWithoutChinese.match(/[a-zA-Z]+/g) || [];
  const englishCount = englishWords.length;

  // 计算阅读时间
  const chineseTime = chineseCount / 300; // 中文 300 字/分钟
  const englishTime = englishCount / 200; // 英文 200 词/分钟
  const codeTime = codeLines / 100; // 代码 100 行/分钟

  return Math.max(1, Math.ceil(chineseTime + englishTime + codeTime));
}
