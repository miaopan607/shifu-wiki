import { pb } from '@/lib/pocketbase';

/**
 * 歌曲封面获取 composable
 * 统一处理歌曲默认封面的获取逻辑
 */
export function useSongCover() {
  /**
   * 获取歌曲默认封面 URL
   * @param song 歌曲对象，需包含 defaultCover 字段
   * @param thumbSize 缩略图尺寸，默认 '400x400'
   * @returns 封面 URL，如果没有则返回空字符串
   */
  const getSongDefaultCoverUrl = async (
    song: { defaultCover?: string },
    thumbSize: string = '400x400'
  ): Promise<string> => {
    if (!song.defaultCover) return '';

    // 如果设置了特定的 song_cover
    if (song.defaultCover.startsWith('song_cover:')) {
      const coverId = song.defaultCover.replace('song_cover:', '');
      try {
        const cover = await pb.collection('song_covers').getOne(coverId, { fields: 'id,image,collectionId' });
        if (cover.image) {
          return pb.files.getURL(cover, cover.image, { thumb: thumbSize });
        }
      } catch {
        // 封面可能已删除
      }
    }

    // 如果设置了专辑封面 (album_cover:xxx)
    if (song.defaultCover.startsWith('album_cover:')) {
      const albumId = song.defaultCover.replace('album_cover:', '');
      try {
        const album = await pb.collection('albums').getOne(albumId, { expand: 'album_covers_via_album' });
        
        if (album.defaultCover === 'old_cover') {
          if (album.cover && album.collectionId) {
            return pb.files.getURL(album, album.cover, { thumb: thumbSize });
          }
        } else if (album.defaultCover?.startsWith('album_cover:')) {
          const coverId = album.defaultCover.replace('album_cover:', '');
          const expandCovers = album.expand?.album_covers_via_album as any[] | undefined;
          const coverRecord = expandCovers?.find(c => c.id === coverId);
          if (coverRecord) {
            return pb.files.getURL(coverRecord, coverRecord.image, { thumb: thumbSize });
          }
        } else if (!album.defaultCover && album.cover && album.collectionId) {
          // 兼容老数据，如果 defaultCover 没设置但有封面
          return pb.files.getURL(album, album.cover, { thumb: thumbSize });
        }
      } catch {
        // 专辑可能已删除
      }
    }

    // 兼容旧格式：defaultCover === 'album'，需要配合 defaultAlbum 使用
    // 此格式在详情页处理，这里不处理

    return '';
  };

  /**
   * 获取歌曲自有封面列表
   * @param songId 歌曲 ID
   * @param thumbSize 缩略图尺寸，默认 '400x400'
   * @returns 封面 URL 列表
   */
  const getSongCovers = async (
    songId: string,
    thumbSize: string = '400x400'
  ): Promise<{ id: string; url: string; source: string }[]> => {
    try {
      const songCovers = await pb.collection('song_covers').getFullList({
        filter: `song = "${songId}"`,
        sort: 'sort',
        fields: 'id,image,collectionId',
      });

      return songCovers.map(c => ({
        id: c.id,
        url: pb.files.getURL(c, (c as any).image, { thumb: thumbSize }),
        source: '自有封面',
      }));
    } catch {
      return [];
    }
  };

  return {
    getSongDefaultCoverUrl,
    getSongCovers,
  };
}
