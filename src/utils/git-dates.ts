import { execSync } from 'node:child_process';
import { join } from 'node:path';

const updatedDateCache = new Map<string, Date | undefined>();

/**
 * 获取文件的 Git 最后提交时间（更新时间）
 */
export function getGitUpdatedDate(filePath: string): Date | undefined {
  if (updatedDateCache.has(filePath)) {
    return updatedDateCache.get(filePath);
  }

  try {
    const out = execSync(
      `git log -1 --format=%cI -- "${filePath}"`,
      { encoding: 'utf8', cwd: process.cwd() }
    ).trim();
    const date = out ? new Date(out) : undefined;
    updatedDateCache.set(filePath, date);
    return date;
  } catch {
    updatedDateCache.set(filePath, undefined);
    return undefined;
  }
}

/**
 * 根据博客 slug 获取完整的文件路径
 * 支持 slug 形式：tech-blog-illustration-guide 或 openspec-guide/part1-intro
 */
export function getBlogFilePath(slug: string): string {
  return join(process.cwd(), 'src/content/blog', slug, 'index.md');
}

/**
 * 获取博客的发布和更新时间
 * @param slug 博客的 slug
 * @param frontmatterDate frontmatter 中指定的发布时间
 * @param frontmatterUpdatedDate frontmatter 中手动指定的更新时间（可选，作为兜底）
 */
export function getBlogDates(
  slug: string,
  frontmatterDate: Date,
  frontmatterUpdatedDate?: Date,
  disableUpdateDate?: boolean
): { date: Date; updatedDate: Date | undefined } {
  const filePath = getBlogFilePath(slug);
  
  // 发布时间以内容元数据为准，避免浅克隆或历史重写改变文章顺序
  const gitUpdated = getGitUpdatedDate(filePath);
  
  const date = frontmatterDate;
  
  // 如果禁用更新时间，直接返回
  if (disableUpdateDate) {
    return { date, updatedDate: undefined };
  }
  
  // 更新时间：优先用 Git 最后提交时间，兜底用 frontmatter
  const updatedDate = gitUpdated ?? frontmatterUpdatedDate;
  
  // 如果更新时间和发布时间相差不到 1 分钟，认为没有更新
  if (updatedDate && Math.abs(updatedDate.getTime() - date.getTime()) < 60000) {
    return { date, updatedDate: undefined };
  }
  
  return { date, updatedDate };
}
