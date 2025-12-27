import { defineCollection, z } from 'astro:content';

const songs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(), // 歌名
    releaseDate: z.string(), // 发布日期
    album: z.string(), // 专辑
  }),
});

export const collections = { songs };
