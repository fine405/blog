import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { getBlogDates } from '../utils/git-dates';

export async function GET(context: APIContext) {
  const rawPosts = await getCollection('blog', ({ data }) => {
    return import.meta.env.DEV || !data.draft;
  });

  const posts = rawPosts
    .map((post) => {
      const { date, updatedDate } = getBlogDates(
        post.slug,
        post.data.date,
        post.data.updatedDate,
        post.data.disableUpdateDate
      );
      return { ...post, date, updatedDate };
    })
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());

  const lastBuildSource = posts
    .map((post) => post.updatedDate ?? post.date)
    .sort((a, b) => b.valueOf() - a.valueOf())[0];
  const lastBuildDate = (lastBuildSource ?? new Date()).toUTCString();

  return rss({
    title: 'Fine - 博客',
    description: '一个专注于开发技术的个人博客',
    site: context.site!,
    customData: `<language>zh-cn</language><lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.date,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
    })),
  });
}
