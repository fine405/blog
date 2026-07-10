import { defineCollection, z } from 'astro:content';

// 支持 ISO 格式的日期时间字符串，精确到时分
const dateTimeSchema = z.coerce.date();

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // date 和 updatedDate 是无 Git 历史时的可选兜底值
    date: dateTimeSchema.optional(),
    updatedDate: dateTimeSchema.optional(),
    // 禁用更新时间显示，排序时只用发布时间
    disableUpdateDate: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
    cover: z.object({
      url: z.string(),
      alt: z.string().optional(),
    }).optional(),
  }),
});

export const collections = { blog };
