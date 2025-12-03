import { defineCollection, z } from 'astro:content';

// 支持 ISO 格式的日期时间字符串，精确到时分
const dateTimeSchema = z.coerce.date();

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: dateTimeSchema,
    updatedDate: dateTimeSchema.optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
    cover: z.object({
      url: z.string(),
      alt: z.string().optional(),
    }).optional(),
  }),
});

export const collections = { blog };
