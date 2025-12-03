import { execSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * 获取文件的 Git 首次提交时间（发布时间）
 */
export function getGitCreatedDate(filePath: string): Date | undefined {
  try {
    // --follow 追踪重命名，--diff-filter=A 只看添加操作
    const out = execSync(
      `git log --follow --format=%cI --diff-filter=A -- "${filePath}"`,
      { encoding: 'utf8', cwd: process.cwd() }
    ).trim();
    // 可能有多行（如果文件被删除后重新添加），取最后一行（最早的）
    const lines = out.split('\n').filter(Boolean);
    const earliest = lines[lines.length - 1];
    return earliest ? new Date(earliest) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 获取文件的 Git 最后提交时间（更新时间）
 */
export function getGitUpdatedDate(filePath: string): Date | undefined {
  try {
    const out = execSync(
      `git log -1 --format=%cI -- "${filePath}"`,
      { encoding: 'utf8', cwd: process.cwd() }
    ).trim();
    return out ? new Date(out) : undefined;
  } catch {
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
 * @param frontmatterDate frontmatter 中手动指定的发布时间（可选，作为兜底）
 * @param frontmatterUpdatedDate frontmatter 中手动指定的更新时间（可选，作为兜底）
 */
export function getBlogDates(
  slug: string,
  frontmatterDate?: Date,
  frontmatterUpdatedDate?: Date
): { date: Date; updatedDate: Date | undefined } {
  const filePath = getBlogFilePath(slug);
  
  // 发布时间：优先用 frontmatter（允许手动控制排序），兜底用 Git 首次提交时间
  const gitCreated = getGitCreatedDate(filePath);
  const gitUpdated = getGitUpdatedDate(filePath);
  
  const date = frontmatterDate ?? gitCreated ?? new Date();
  // 更新时间：优先用 Git 最后提交时间，兜底用 frontmatter
  const updatedDate = gitUpdated ?? frontmatterUpdatedDate;
  
  // 如果更新时间和发布时间相差不到 1 分钟，认为没有更新
  if (updatedDate && Math.abs(updatedDate.getTime() - date.getTime()) < 60000) {
    return { date, updatedDate: undefined };
  }
  
  return { date, updatedDate };
}
