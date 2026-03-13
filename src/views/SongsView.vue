<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { RouterLink } from 'vue-router';
  import { pb, formatDateToDisplay } from '@/lib/pocketbase';
  import SubPageNav from '@/components/SubPageNav.vue';
  import SongsNav from '@/components/SongsNav.vue';
  import AppIcon from '@/components/AppIcon.vue';

  const allSongs = ref<any[]>([]);
  const loading = ref(true);
  const searchQuery = ref('');

  // 缓存歌曲封面URL
  const songCoverUrls = ref<Map<string, string>>(new Map());

  onMounted(async () => {
    try {
      allSongs.value = await pb.collection('songs').getFullList({
        sort: '-releaseDate',
        fields: 'id,title,index,releaseDate,artist,defaultAlbum,defaultCover,defaultAlbumName',
      });

      // 加载每首歌的默认封面
      await loadSongCovers();
    } catch (error) {
      console.error('Failed to fetch songs:', error);
    } finally {
      loading.value = false;
    }
  });

  // 加载歌曲封面
  const loadSongCovers = async () => {
    const coverPromises = allSongs.value.map(async song => {
      const coverUrl = await getSongDefaultCoverUrl(song);
      if (coverUrl) {
        songCoverUrls.value.set(song.id, coverUrl);
      }
    });
    await Promise.all(coverPromises);
  };

  // 获取歌曲默认封面URL
  const getSongDefaultCoverUrl = async (song: any): Promise<string> => {
    // 如果设置了特定的song_cover
    if (song.defaultCover?.startsWith('song_cover:')) {
      const coverId = song.defaultCover.replace('song_cover:', '');
      try {
        const cover = await pb.collection('song_covers').getOne(coverId, { fields: 'id,image,collectionId' });
        if (cover.image) {
          return pb.files.getURL(cover, cover.image, { thumb: '400x400' });
        }
      } catch {
        // 封面可能已删除
      }
    }

    // 如果设置了专辑封面
    if (song.defaultCover?.startsWith('album_cover:')) {
      const albumId = song.defaultCover.replace('album_cover:', '');
      try {
        const album = await pb.collection('albums').getOne(albumId, { fields: 'id,cover,collectionId' });
        if (album.cover) {
          return pb.files.getURL(album, album.cover, { thumb: '400x400' });
        }
      } catch {
        // 专辑可能已删除
      }
    }

    return '';
  };

  const filteredSongs = computed(() => {
    if (!searchQuery.value.trim()) {
      return allSongs.value;
    }
    const query = searchQuery.value.toLowerCase();
    return allSongs.value.filter(song => {
      const titleMatch = song.title?.toLowerCase().includes(query);
      // 支持数组或字符串形式的 artist
      let artistMatch = false;
      if (Array.isArray(song.artist)) {
        artistMatch = song.artist.some((a: string) => a.toLowerCase().includes(query));
      } else if (typeof song.artist === 'string') {
        artistMatch = song.artist.toLowerCase().includes(query);
      }
      return titleMatch || artistMatch;
    });
  });

  // 格式化歌曲元数据
  interface MetaPart {
    type: 'artist' | 'date' | 'album';
    value: string;
  }

  // 将数组转换为 / 分隔的字符串
  const formatArrayField = (value: string | string[] | undefined): string => {
    if (!value) return '';
    if (Array.isArray(value)) return value.join(' / ');
    return value;
  };

  const getSongMetaParts = (song: any): MetaPart[] => {
    const parts: MetaPart[] = [];
    if (song.artist?.length) parts.push({ type: 'artist', value: formatArrayField(song.artist) });
    // 添加默认展示专辑
    if (song.defaultAlbumName) {
      parts.push({ type: 'album', value: song.defaultAlbumName });
    }
    if (song.releaseDate) parts.push({ type: 'date', value: formatDateToDisplay(song.releaseDate) });
    return parts;
  };

  // 获取歌曲封面URL
  const getSongCoverUrl = (songId: string): string => {
    return songCoverUrls.value.get(songId) || '';
  };
</script>

<template>
  <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif">
    <div class="max-w-2xl mx-auto">
      <header class="mb-16">
        <RouterLink to="/" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回首页</RouterLink>
        <SubPageNav active-page="songs" />
        <SongsNav active-tab="singles" />
      </header>

      <div class="mb-10">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索音乐标题或艺人"
          class="w-full px-4 py-3 bg-[#c9c9c9]/10 border border-[#c9c9c9]/20 rounded text-[#c9c9c9] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-colors"
        />
      </div>

      <div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

      <div
        v-else-if="filteredSongs.length === 0"
        class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]"
        >未找到匹配的音乐</div
      >

      <div v-else class="space-y-10">
        <RouterLink
          v-for="song in filteredSongs"
          :key="song.id"
          :to="`/songs/${song.index}`"
          class="group block border-b border-[#c9c9c9]/20 pb-8 hover:border-red-300/50 transition-all"
        >
          <div class="flex gap-4 items-start">
            <!-- 封面 -->
            <div
              class="shrink-0 w-16 h-16 rounded-lg overflow-hidden shadow-md bg-[#c9c9c9]/10 flex items-center justify-center"
            >
              <img
                v-if="getSongCoverUrl(song.id)"
                :src="getSongCoverUrl(song.id)"
                :alt="song.title"
                class="w-full h-full object-cover"
              />
              <AppIcon v-else name="image-placeholder" class-name="w-8 h-8 text-[#888]" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <h2 class="text-2xl text-[#c9c9c9] group-hover:text-red-300 transition-colors">{{ song.title }}</h2>
                  <div class="flex items-center gap-3 mt-2 tracking-widest text-sm text-[#888]">
                    <template v-for="(part, index) in getSongMetaParts(song)" :key="index">
                      <div class="flex items-center gap-1">
                        <AppIcon :name="part.type === 'artist' ? 'users' : part.type === 'album' ? 'album' : 'date'" />
                        <span>{{ part.value }}</span>
                      </div>
                      <span v-if="index < getSongMetaParts(song).length - 1">·</span>
                    </template>
                  </div>
                </div>
                <span
                  class="text-red-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all translate-x-0 md:translate-x-4 md:group-hover:translate-x-0 shrink-0 ml-4"
                  >详情 →</span
                >
              </div>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </main>
</template>

<style scoped>
  /* Page specific styles */
</style>
