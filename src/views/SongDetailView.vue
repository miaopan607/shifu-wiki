<script setup lang="ts">
  import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue';
  import { useRoute, useRouter, RouterLink } from 'vue-router';
  import { pb, decodeSongLinkNames, formatDateToDisplay } from '@/lib/pocketbase';
  import { normalizeAlbumTracks } from '@/lib/albumTracks';
  import { marked } from 'marked';
  import AppIcon from '@/components/AppIcon.vue';
  import Lightbox from '@/components/Lightbox.vue';
  import { useMusicPlayer } from '@/composables/useMusicPlayer';
  import type { SongCover } from '@/types';

  const route = useRoute();
  const router = useRouter();
  const song = ref<any>(null);
  const loading = ref(true);
  const showCredits = ref(false);

  // 音乐播放器
  const { playSong, isPlaying, isLoading, currentSong, error: playerError } = useMusicPlayer();

  const titleRef = ref<HTMLElement | null>(null);
  const titleContainerRef = ref<HTMLElement | null>(null);
  const artistInline = ref(false);
  const artistText = ref('');
  const artistDisplay = ref('');
  const artistTruncated = ref(false);
  const showArtistTooltip = ref(false);
  const tooltipX = ref(0);
  const tooltipY = ref(0);

  const artistTooltipStyle = computed(() => ({
    left: `${tooltipX.value}px`,
    top: `${tooltipY.value}px`,
  }));

  // 封面数据
  interface CoverItem {
    url: string;
    source: string;
    id?: string;
    collectionId?: string;
    image?: string;
  }
  const allCovers = ref<CoverItem[]>([]);
  const defaultCoverUrl = ref('');

  // 灯箱
  const showLightbox = ref(false);
  const lightboxInitialIndex = ref(0);

  // 关联的专辑信息
  interface LinkedAlbum {
    id: string;
    title: string;
    index: number;
  }
  const linkedAlbums = ref<LinkedAlbum[]>([]);

  // 默认展示专辑信息
  const displayAlbumName = ref('');
  const displayAlbumLink = ref('');

  const backLink = computed(() => {
    const from = route.query.from;
    const albumIndex = route.query.albumIndex as string;
    if (from === 'album' && albumIndex) return `/albums/${albumIndex}`;
    return '/songs';
  });

  const backText = computed(() => (route.query.from === 'album' ? '← 返回专辑' : '← 返回列表'));

  // 元数据
  interface MetaItem {
    label?: string;
    value: string;
    icon?: string;
    link?: string;
  }

  // 将数组转换为 / 分隔的字符串
  const formatArrayField = (value: string | string[] | undefined): string => {
    if (!value) return '';
    if (Array.isArray(value)) return value.join(' / ');
    return value;
  };

  const metaItems = computed<MetaItem[]>(() => {
    if (!song.value) return [];
    const items: MetaItem[] = [];
    if (song.value.lyricist?.length)
      items.push({ label: '词', value: formatArrayField(song.value.lyricist), icon: 'lyricist' });
    if (song.value.composer?.length)
      items.push({ label: '曲', value: formatArrayField(song.value.composer), icon: 'composer' });
    // 默认展示专辑
    if (displayAlbumName.value) {
      items.push({
        label: '专辑',
        value: displayAlbumName.value,
        icon: 'album',
        link: displayAlbumLink.value || undefined,
      });
    }
    // 其他关联专辑（来自 tracks 反查，排除默认专辑）
    for (const album of linkedAlbums.value) {
      if (album.id === song.value.defaultAlbum) continue;
      items.push({ label: '专辑', value: album.title, icon: 'album', link: `/albums/${album.index || album.id}` });
    }
    if (song.value.releaseDate) items.push({ value: formatDateToDisplay(song.value.releaseDate), icon: 'date' });
    return items;
  });

  // 打开灯箱
  const openLightbox = () => {
    if (allCovers.value.length <= 1) return;
    lightboxInitialIndex.value = 0;
    showLightbox.value = true;
  };

  onMounted(async () => {
    const index = route.params.index;
    if (!index) {
      router.replace('/404');
      return;
    }

    try {
      song.value = decodeSongLinkNames(await pb.collection('songs').getFirstListItem(`index=${index}`));
      if (song.value) document.title = `${song.value.title} | 黄诗扶 Wiki`;

      // 设置默认专辑显示
      if (song.value.defaultAlbum) {
        try {
          const album = await pb.collection('albums').getOne(song.value.defaultAlbum);
          displayAlbumName.value = album.title;
          displayAlbumLink.value = `/albums/${album.index || album.id}`;
          // 如果默认封面是专辑封面
          if (song.value.defaultCover === 'album' && album.cover) {
            defaultCoverUrl.value = pb.files.getURL(album, album.cover, { thumb: '400x400' });
          }
        } catch {
          /* album deleted */
        }
      } else if (song.value.defaultAlbumName) {
        displayAlbumName.value = song.value.defaultAlbumName;
      }

      // 加载歌曲自有封面
      const songCovers = (await pb.collection('song_covers').getFullList({
        filter: `song = "${song.value.id}"`,
        sort: 'sort',
      })) as unknown as SongCover[];

      const songCoverItems: CoverItem[] = songCovers.map(c => ({
        url: pb.files.getURL(c, c.image, { thumb: '400x400' }),
        source: '自有封面',
        id: c.id,
        collectionId: c.collectionId,
        image: c.image,
      }));

      // 如果默认封面指向特定 song_cover
      if (song.value.defaultCover?.startsWith('song_cover:')) {
        const coverId = song.value.defaultCover.replace('song_cover:', '');
        defaultCoverUrl.value = songCoverItems.find((_, i) => songCovers[i]?.id === coverId)?.url || '';
      }

      // 查找关联的专辑（通过 albums.tracks 反查）+ 专辑封面
      try {
        const allAlbumsResult = await pb
          .collection('albums')
          .getFullList({ fields: 'id,title,index,tracks,cover,collectionId' });
        for (const album of allAlbumsResult) {
          const tracks = normalizeAlbumTracks((album as any).tracks);
          const songIsInAlbum = tracks.some(disc => Array.isArray(disc.songs) && disc.songs.includes(song.value.id));
          if (songIsInAlbum) {
            linkedAlbums.value.push({ id: album.id, title: album.title, index: album.index });
            // 添加专辑的封面到轮播
            if (album.cover) {
              songCoverItems.push({
                url: pb.files.getURL(album, album.cover, { thumb: '400x400' }),
                source: `来自专辑: ${album.title}`,
                id: album.id,
                collectionId: album.collectionId,
                image: album.cover,
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load linked albums:', err);
      }

      allCovers.value = songCoverItems;
    } catch (error) {
      console.error('Failed to fetch song:', error);
      router.replace('/404');
    } finally {
      loading.value = false;
      nextTick(() => {
        measureArtistDisplay();
      });
    }
  });

  const handleResize = () => {
    measureArtistDisplay();
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (showArtistTooltip.value) {
      const target = e.target as HTMLElement;
      if (!target.closest('.artist-text')) {
        showArtistTooltip.value = false;
      }
    }
  };

  onMounted(() => {
    window.addEventListener('resize', handleResize);
    document.addEventListener('click', handleClickOutside);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('click', handleClickOutside);
  });

  const closeModal = () => {
    showCredits.value = false;
    document.body.style.overflow = 'auto';
  };
  const openModal = () => {
    showCredits.value = true;
    document.body.style.overflow = 'hidden';
  };

  const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
  };

  /**
   * 根据 URL 域名判断平台图标
   */
  const getPlatformIcon = (url: string) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.includes('163.com')) return 'netease';
      if (hostname.includes('qq.com')) return 'qq-music';
      if (hostname.includes('kugou.com')) return 'kugou';
      if (hostname.includes('kuwo.cn')) return 'kuwo';
      if (hostname.includes('bilibili.com')) return 'bilibili';
    } catch {
      // 如果不是有效的 URL，回退到名称匹配
    }
    return null;
  };

  const measureArtistDisplay = () => {
    if (!song.value?.artist?.length || !titleRef.value || !titleContainerRef.value) {
      artistInline.value = false;
      artistDisplay.value = '';
      artistTruncated.value = false;
      return;
    }

    artistText.value = formatArrayField(song.value.artist);

    const containerWidth = titleContainerRef.value.getBoundingClientRect().width;
    const padding = 16;
    const availableWidth = containerWidth - padding;

    const titleEl = titleRef.value;
    const titleWidth = titleEl.getBoundingClientRect().width;

    const titleStyle = window.getComputedStyle(titleEl);

    const artistFontSize = 18;
    const gap = 8;
    const minSpace = artistFontSize * 6;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let fullArtistWidth = 0;
    if (ctx) {
      ctx.font = `normal normal ${artistFontSize}px ${titleStyle.fontFamily}`;
      fullArtistWidth = ctx.measureText(artistText.value).width;
    }

    const remainingSpace = availableWidth - titleWidth;
    const neededSpace = fullArtistWidth + gap;

    if (remainingSpace >= minSpace || remainingSpace >= neededSpace) {
      artistInline.value = true;
      const maxArtistWidth = remainingSpace - gap;
      if (fullArtistWidth <= maxArtistWidth) {
        artistDisplay.value = artistText.value;
        artistTruncated.value = false;
      } else if (ctx) {
        let truncated = '';
        for (const char of artistText.value) {
          if (ctx.measureText(truncated + char + '...').width > maxArtistWidth) break;
          truncated += char;
        }
        artistDisplay.value = truncated + '...';
        artistTruncated.value = true;
      } else {
        artistDisplay.value = artistText.value;
        artistTruncated.value = false;
      }
    } else {
      artistInline.value = false;
      artistDisplay.value = artistText.value;
      artistTruncated.value = true;
    }
  };

  // 检查歌曲是否可播放
  const canPlay = computed(() => {
    if (!song.value) return false;
    return !!song.value.enabledPlatform;
  });

  // 播放当前歌曲
  const handlePlay = () => {
    if (!song.value || !canPlay.value) return;
    playSong(song.value);
  };

  // 检查是否正在播放当前歌曲
  const isCurrentSong = computed(() => {
    return currentSong.value?.id === song.value?.id;
  });
</script>

<template>
  <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif text-[#e0e0e0]">
    <div v-if="loading" class="flex items-center justify-center italic h-[60vh]">加载中...</div>

    <div v-else-if="song" class="max-w-2xl mx-auto relative transition-opacity duration-300">
      <nav class="mb-12">
        <RouterLink :to="backLink" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">{{
          backText
        }}</RouterLink>
      </nav>

      <div class="relative">
        <article class="w-full">
          <header class="mb-6 flex gap-6 items-start">
            <!-- 封面 - 放在左侧 -->
            <div
              v-if="defaultCoverUrl"
              class="shrink-0 w-24 h-24 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
              :class="allCovers.length > 1 ? 'hover:ring-2 hover:ring-red-300/50' : ''"
              @click="openLightbox"
            >
              <img :src="defaultCoverUrl" :alt="song.title" class="w-full h-full object-cover" />
            </div>

            <!-- 标题和元数据 -->
            <div ref="titleContainerRef" class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <h1
                  ref="titleRef"
                  class="shrink-0 text-4xl md:text-5xl text-[#c9c9c9] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)]"
                  >{{ song.title }}</h1
                >
                <span
                  v-if="artistInline && artistDisplay"
                  class="artist-text text-lg text-[#c9c9c9]/80 tracking-[0.15em] cursor-default select-none truncate"
                  :class="{ 'hover:text-[#c9c9c9]': artistTruncated }"
                  @mouseenter="
                    (e: MouseEvent) => {
                      if (artistTruncated) {
                        tooltipX = (e.target as HTMLElement).getBoundingClientRect().left;
                        tooltipY = (e.target as HTMLElement).getBoundingClientRect().bottom + 8;
                        showArtistTooltip = true;
                      }
                    }
                  "
                  @mouseleave="showArtistTooltip = false"
                  @click="
                    (e: MouseEvent) => {
                      if (artistTruncated) {
                        tooltipX = (e.target as HTMLElement).getBoundingClientRect().left;
                        tooltipY = (e.target as HTMLElement).getBoundingClientRect().bottom + 8;
                        showArtistTooltip = !showArtistTooltip;
                      }
                    }
                  "
                  >{{ artistDisplay }}</span
                >
              </div>
              <div
                v-if="!artistInline && artistDisplay"
                class="artist-text text-lg text-[#c9c9c9]/80 tracking-[0.15em] mt-2 cursor-default select-none truncate"
                :class="{ 'hover:text-[#c9c9c9]': artistTruncated }"
                @mouseenter="
                  (e: MouseEvent) => {
                    if (artistTruncated) {
                      tooltipX = (e.target as HTMLElement).getBoundingClientRect().left;
                      tooltipY = (e.target as HTMLElement).getBoundingClientRect().bottom + 8;
                      showArtistTooltip = true;
                    }
                  }
                "
                @mouseleave="showArtistTooltip = false"
                @click="
                  (e: MouseEvent) => {
                    if (artistTruncated) {
                      tooltipX = (e.target as HTMLElement).getBoundingClientRect().left;
                      tooltipY = (e.target as HTMLElement).getBoundingClientRect().bottom + 8;
                      showArtistTooltip = !showArtistTooltip;
                    }
                  }
                "
                >{{ artistDisplay }}</div
              >
              <div class="flex flex-wrap items-center gap-y-2 text-[#888] text-sm tracking-widest mt-4">
                <template v-for="(item, index) in metaItems" :key="index">
                  <div class="flex items-center">
                    <div class="flex items-center gap-1.5">
                      <AppIcon :name="item.icon as any" />
                      <template v-if="item.link">
                        <RouterLink :to="item.link" class="hover:text-red-300 transition-colors">
                          <span v-if="item.label">{{ item.label }}：{{ item.value }}</span>
                          <span v-else>{{ item.value }}</span>
                        </RouterLink>
                      </template>
                      <template v-else>
                        <span v-if="item.label">{{ item.label }}：{{ item.value }}</span>
                        <span v-else>{{ item.value }}</span>
                      </template>
                    </div>
                    <span
                      v-if="index < metaItems.length - 1 || song.credits"
                      class="mx-4 h-3 w-px bg-[#c9c9c9]/30"
                    ></span>
                  </div>
                </template>
                <button
                  v-if="song.credits"
                  class="w-fit transition-all duration-300 border-b border-transparent hover:border-red-300 hover:text-red-300 text-left cursor-pointer flex items-center gap-1.5"
                  @click="openModal"
                >
                  <AppIcon name="users" /> 制作人员
                </button>
              </div>
            </div>
          </header>
          <hr class="border-[#c9c9c9]/30 mb-8" />
          <div
            v-if="song.description"
            class="prose prose-invert mx-auto mb-8 text-[#c9c9c9]/90 leading-relaxed tracking-wider text-base"
          >
            <div v-html="renderMarkdown(song.description)"></div>
          </div>
          <hr v-if="song.description" class="border-[#c9c9c9]/30 mb-8" />
          <div
            class="prose prose-invert mx-auto lyrics-container mt-0 text-lg whitespace-pre-line"
            v-html="song.lyrics"
          ></div>
        </article>
        <aside class="w-full lg:w-56 shrink-0 mt-12 lg:mt-0 lg:absolute lg:left-[calc(100%+4rem)] lg:top-0">
          <hr class="border-[#c9c9c9]/30 mb-5" />
          <template v-if="song.links && Array.isArray(song.links) && song.links.length > 0">
            <div class="flex flex-col gap-4 px-2">
              <a
                v-for="link in song.links"
                :key="link.url"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#c9c9c9]/80 hover:text-red-300 transition-all duration-300 text-sm tracking-[0.2em] flex items-start group whitespace-pre-line"
              >
                <div class="flex items-start gap-2">
                  <div class="transition-all duration-300 transform group-hover:translate-x-1 shrink-0">
                    <AppIcon v-if="getPlatformIcon(link.url)" :name="getPlatformIcon(link.url) as any" />
                    <span
                      v-else
                      class="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform translate-x-0 md:-translate-x-2 md:group-hover:translate-x-0"
                      >→</span
                    >
                  </div>
                  <span class="flex-1">{{ link.name }}</span>
                </div>
              </a>
            </div>
            <hr class="border-[#c9c9c9]/30 mt-5 mb-5" />
          </template>
          <template v-if="song.otherLinks && Array.isArray(song.otherLinks) && song.otherLinks.length > 0">
            <div class="flex flex-col gap-4 px-2">
              <a
                v-for="link in song.otherLinks"
                :key="link.url"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#c9c9c9]/80 hover:text-red-300 transition-all duration-300 text-sm tracking-[0.2em] flex items-start group whitespace-pre-line"
              >
                <div class="flex items-start gap-2">
                  <div class="transition-all duration-300 transform group-hover:translate-x-1 shrink-0 mt-[1px]">
                    <AppIcon v-if="getPlatformIcon(link.url)" :name="getPlatformIcon(link.url) as any" />
                    <span
                      v-else
                      class="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform translate-x-0 md:-translate-x-2 md:group-hover:translate-x-0"
                      >→</span
                    >
                  </div>
                  <span class="flex-1">{{ link.name }}</span>
                </div>
              </a>
            </div>
            <hr class="border-[#c9c9c9]/30 mt-5" />
          </template>
        </aside>
      </div>
    </div>
  </main>

  <Transition name="fade">
    <div v-if="showCredits" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="closeModal"></div>
      <div
        class="relative bg-[rgb(60,0,0)] p-8 md:p-12 max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-lg shadow-2xl border border-red-300/20 scrollbar-hide"
      >
        <button
          class="absolute top-4 right-4 text-[#c9c9c9] hover:text-red-300 transition-colors cursor-pointer"
          @click="closeModal"
        >
          <AppIcon name="close" class-name="h-6 w-6" />
        </button>
        <div>
          <h3 class="text-2xl text-[#c9c9c9] mb-10 tracking-widest border-b border-[#c9c9c9]/10 pb-4 inline-block"
            >制作人员</h3
          >
          <div class="whitespace-pre-line text-[#c9c9c9] leading-loose tracking-widest font-serif text-xl">{{
            song.credits
          }}</div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 艺人悬停提示 -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showArtistTooltip && artistTruncated"
        class="fixed z-[60] bg-[rgb(40,0,0)]/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-xl border border-red-300/20 text-[#c9c9c9] text-lg tracking-widest pointer-events-none"
        :style="artistTooltipStyle"
      >
        {{ artistText }}
      </div>
    </Transition>
  </Teleport>

  <!-- 播放器错误提示 -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="playerError && isCurrentSong"
        class="fixed top-4 right-4 z-[60] bg-red-900/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-xl border border-red-300/20 text-red-300 text-sm flex items-center gap-2"
      >
        <AppIcon name="warning" class-name="w-5 h-5" />
        {{ playerError }}
      </div>
    </Transition>
  </Teleport>

  <!-- 固定播放按钮 -->
  <Teleport to="body">
    <button
      v-if="canPlay"
      @click="handlePlay"
      class="fixed right-8 bottom-[calc(2rem+4rem)] w-14 h-14 bg-[#c9c9c9]/10 backdrop-blur-md border border-[#c9c9c9]/20 rounded-full flex items-center justify-center text-[#c9c9c9] hover:bg-[#c9c9c9]/20 hover:border-red-300/50 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-40 group song-play-button"
      :title="isCurrentSong && isPlaying ? '暂停' : '播放'"
    >
      <div
        v-if="isLoading && isCurrentSong"
        class="w-6 h-6 border-2 border-[#c9c9c9] border-t-transparent rounded-full animate-spin"
      ></div>
      <AppIcon v-else :name="isCurrentSong && isPlaying ? 'pause' : 'play'" class-name="w-6 h-6" />
    </button>
  </Teleport>

  <!-- 封面灯箱 -->
  <Lightbox
    v-if="allCovers.length > 0"
    v-model="showLightbox"
    :images="
      allCovers.map(c => ({
        id: c.id || '',
        collectionId: c.collectionId || '',
        collectionName: c.collectionId || '',
        image: c.image || '',
        gallery: '',
        sort: 0,
        created: '',
        updated: '',
      }))
    "
    :initial-index="lightboxInitialIndex"
    :gallery-title="song?.title || ''"
  />
</template>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
