import { defineCollection, z } from 'astro:content';

const songs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(), // 歌名
    releaseDate: z.string(), // 发布日期
    album: z.string(), // 专辑
    lyricist: z.string(), // 词作
    composer: z.string(), // 曲作
    credits: z.string(), // 制作人员名单 (歌词样式)
  }),
});

export const collections = { songs };
