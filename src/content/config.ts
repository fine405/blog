import { defineCollection, z } from 'astro:content';

// 支持 ISO 格式的日期时间字符串，精确到时分
const dateTimeSchema = z.coerce.date();

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // 发布时间必须显式声明，避免部署环境中的 Git 历史影响文章排序
    date: dateTimeSchema,
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
