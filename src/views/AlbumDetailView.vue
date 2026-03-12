<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { useRoute, RouterLink } from 'vue-router';
  import { pb, formatDateToDisplay } from '@/lib/pocketbase';
  import { normalizeAlbumTracks } from '@/lib/albumTracks';
  import { marked } from 'marked';
  import AppIcon from '@/components/AppIcon.vue';

  const route = useRoute();
  const indexOrId = route.params.index as string;
  const albumInfo = ref<any>(null);
  const loading = ref(true);

  interface DiscGroup {
    disc: number;
    name?: string;
    songs: any[];
  }
  const discGroups = ref<DiscGroup[]>([]);
  const totalSongCount = computed(() => discGroups.value.reduce((sum, d) => sum + d.songs.length, 0));

  const albumCoverUrl = ref('');

  const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
  };

  interface MetaItem {
    label?: string;
    value: string;
    icon?: string;
  }
  const metaItems = computed<MetaItem[]>(() => {
    const items: MetaItem[] = [];
    if (totalSongCount.value > 0) items.push({ value: `${totalSongCount.value} 曲音乐`, icon: 'music' });
    if (discGroups.value.length > 1) items.push({ value: `${discGroups.value.length} Disc`, icon: 'album' });
    if (albumInfo.value?.releaseDate)
      items.push({ value: formatDateToDisplay(albumInfo.value.releaseDate), icon: 'date' });
    return items;
  });

  const albumTitle = computed(() => albumInfo.value?.title || '');

  onMounted(async () => {
    try {
      let albumRecord: any = null;
      try {
        albumRecord = await pb.collection('albums').getFirstListItem(`index=${indexOrId}`);
      } catch {
        try {
          albumRecord = await pb.collection('albums').getOne(indexOrId);
        } catch {
          /* not found */
        }
      }
      if (!albumRecord) {
        loading.value = false;
        return;
      }

      albumInfo.value = albumRecord;

      // 使用 album.cover 单封面
      if (albumRecord.cover) {
        albumCoverUrl.value = pb.files.getURL(albumRecord, albumRecord.cover);
      }

      const tracks = normalizeAlbumTracks(albumRecord.tracks);
      if (tracks.length > 0) {
        const allSongIds = tracks.flatMap(disc => disc.songs || []);
        if (allSongIds.length > 0) {
          const songMap = new Map<string, any>();
          const batchSize = 50;
          for (let i = 0; i < allSongIds.length; i += batchSize) {
            const batchIds = allSongIds.slice(i, i + batchSize);
            const filter = batchIds.map(id => `id="${id}"`).join(' || ');
            const songsResult = await pb.collection('songs').getFullList({ filter, fields: 'id,title,index,artist' });
            songsResult.forEach(s => songMap.set(s.id, s));
          }
          discGroups.value = tracks.map(disc => ({
            disc: disc.disc,
            name: disc.name,
            songs: (disc.songs || []).map(songId => songMap.get(songId)).filter(Boolean),
          }));
        }
      }

      document.title = `${albumRecord.title} | 专辑详情 | 黄诗扶 Wiki`;
    } catch (error) {
      console.error('Failed to fetch album data:', error);
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif">
    <div class="max-w-2xl mx-auto">
      <header class="mb-16">
        <RouterLink to="/albums" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors"
          >← 返回列表</RouterLink
        >
      </header>

      <div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

      <div v-else class="relative">
        <div class="w-full">
          <div class="mb-12 border-b border-[#c9c9c9]/20 pb-8">
            <div v-if="albumCoverUrl" class="mb-8">
              <div class="w-full max-w-xs mx-auto">
                <div class="aspect-square rounded-lg overflow-hidden shadow-2xl">
                  <img :src="albumCoverUrl" :alt="albumTitle" class="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <h1 class="text-4xl md:text-5xl text-[#c9c9c9] mb-4 tracking-widest">{{ albumTitle }}</h1>
            <div class="flex items-center gap-4 text-[#888] tracking-widest text-sm">
              <template v-for="(item, index) in metaItems" :key="index">
                <div class="flex items-center gap-1.5"
                  ><AppIcon :name="item.icon as any" /><span>{{ item.value }}</span></div
                >
                <span v-if="index < metaItems.length - 1">·</span>
              </template>
            </div>
            <div
              v-if="albumInfo?.description"
              class="mt-8 prose prose-invert max-w-none text-[#c9c9c9]/80 leading-relaxed tracking-wider"
            >
              <div v-html="renderMarkdown(albumInfo.description)"></div>
            </div>
          </div>

          <div class="space-y-8">
            <div v-for="discGroup in discGroups" :key="discGroup.disc">
              <div v-if="discGroups.length > 1" class="mb-4">
                <h2 class="text-lg text-[#888] tracking-widest">{{ discGroup.name || `Disc ${discGroup.disc}` }}</h2>
                <hr class="border-[#c9c9c9]/10 mt-2" />
              </div>
              <div class="space-y-4">
                <RouterLink
                  v-for="(song, songIndex) in discGroup.songs"
                  :key="song.id"
                  :to="`/songs/${song.index}?from=album&albumIndex=${albumInfo?.index || ''}`"
                  class="block group p-4 -mx-4 hover:bg-[#c9c9c9]/5 rounded-lg transition-colors border border-transparent hover:border-[#c9c9c9]/10"
                >
                  <div class="flex items-center gap-6">
                    <span class="text-[#888] font-mono opacity-50 w-8 text-right">{{
                      String(songIndex + 1).padStart(2, '0')
                    }}</span>
                    <div class="flex-1">
                      <h3 class="text-xl text-[#c9c9c9] group-hover:text-red-300 transition-colors tracking-wide">{{
                        song.title
                      }}</h3>
                      <div
                        class="flex gap-4 mt-1 text-xs text-[#888] tracking-wider opacity-0 group-hover:opacity-70 transition-opacity"
                      >
                        <span>{{
                          Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist || '黄诗扶'
                        }}</span>
                      </div>
                    </div>
                    <span
                      class="text-red-300 opacity-0 group-hover:opacity-100 transition-all text-sm tracking-widest translate-x-2 group-hover:translate-x-0"
                      >详情 →</span
                    >
                  </div>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <aside
          v-if="albumInfo"
          class="w-full lg:w-56 shrink-0 mt-12 lg:mt-0 lg:absolute lg:left-[calc(100%+4rem)] lg:top-0"
        >
          <hr class="border-[#c9c9c9]/30 mb-5" />
          <template v-if="albumInfo.links && Array.isArray(albumInfo.links) && albumInfo.links.length > 0">
            <div class="flex flex-col gap-4 px-2">
              <a
                v-for="link in albumInfo.links"
                :key="link.url"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#c9c9c9]/80 hover:text-red-300 transition-all duration-300 text-sm tracking-[0.2em] flex items-start group whitespace-pre-line"
              >
                <span
                  class="mr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0"
                  >→</span
                >
                {{ link.name }}
              </a>
            </div>
            <hr class="border-[#c9c9c9]/30 mt-5 mb-5" />
          </template>
          <template
            v-if="albumInfo.otherLinks && Array.isArray(albumInfo.otherLinks) && albumInfo.otherLinks.length > 0"
          >
            <div class="flex flex-col gap-4 px-2">
              <a
                v-for="link in albumInfo.otherLinks"
                :key="link.url"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#c9c9c9]/80 hover:text-red-300 transition-all duration-300 text-sm tracking-[0.2em] flex items-start group whitespace-pre-line"
              >
                <span
                  class="mr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0"
                  >→</span
                >
                {{ link.name }}
              </a>
            </div>
            <hr class="border-[#c9c9c9]/30 mt-5" />
          </template>
        </aside>
      </div>
    </div>
  </main>
</template>
