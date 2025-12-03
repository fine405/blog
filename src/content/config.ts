import { defineCollection, z } from 'astro:content';

// 支持 ISO 格式的日期时间字符串，精确到时分
const dateTimeSchema = z.coerce.date();

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // date 和 updatedDate 现在是可选的，会自动从 Git 提交时间获取
    date: dateTimeSchema.optional(),
    updatedDate: dateTimeSchema.optional(),
    // 禁用更新时间显示，排序时只用发布时间
    disableUpdateDate: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
    // 置顶文章，数字越大越靠前
    pinned: z.number().optional(),
    cover: z.object({
      url: z.string(),
      alt: z.string().optional(),
    }).optional(),
  }),
});

export const collections = { blog };
