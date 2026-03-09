<script setup lang="ts">
  import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { pb, formatDateToDisplay } from '@/lib/pocketbase';
  import AppIcon from './AppIcon.vue';
  import { useDebounceFn } from '@vueuse/core';

  const router = useRouter();

  const isOpen = ref(false);
  const searchQuery = ref('');
  const loading = ref(false);
  const searchInput = ref<HTMLInputElement | null>(null);

  interface SearchResultItem {
    id: string;
    type: 'songs' | 'albums' | 'activities' | 'galleries' | 'misc';
    index: string;
    title: string;
    subtitle?: string;
  }

  interface SearchResults {
    songs: any[];
    albums: any[];
    activities: any[];
    galleries: any[];
    misc: any[];
  }

  const results = ref<SearchResults | null>(null);
  const selectedIndex = ref(0);

  // 将所有结果扁平化为一个数组，便于导航
  const flatResults = computed<SearchResultItem[]>(() => {
    if (!results.value) return [];
    const items: SearchResultItem[] = [];

    results.value.songs.forEach(song => {
      items.push({
        id: song.id,
        type: 'songs',
        index: song.index,
        title: song.title,
        subtitle: song.album + (song.artist ? ` · ${song.artist}` : ''),
      });
    });

    results.value.albums.forEach(album => {
      items.push({
        id: album.id,
        type: 'albums',
        index: album.index,
        title: album.title,
        subtitle: album.releaseDate ? formatDateToDisplay(album.releaseDate) : '',
      });
    });

    results.value.activities.forEach(activity => {
      items.push({
        id: activity.id,
        type: 'activities',
        index: activity.index,
        title: activity.title,
        subtitle: formatDateToDisplay(activity.date) + (activity.location ? ` · ${activity.location}` : ''),
      });
    });

    results.value.galleries.forEach(gallery => {
      items.push({
        id: gallery.id,
        type: 'galleries',
        index: gallery.index,
        title: gallery.title,
        subtitle: gallery.date ? formatDateToDisplay(gallery.date) : '',
      });
    });

    results.value.misc.forEach(item => {
      items.push({
        id: item.id,
        type: 'misc',
        index: item.index,
        title: item.title,
        subtitle: item.date ? formatDateToDisplay(item.date) : '',
      });
    });

    return items;
  });

  // 当结果变化时，重置选中索引为0（选中第一个）
  watch(flatResults, newResults => {
    selectedIndex.value = newResults.length > 0 ? 0 : -1;
  });

  const openSearch = () => {
    isOpen.value = true;
    setTimeout(() => {
      searchInput.value?.focus();
    }, 100);
  };

  const closeSearch = () => {
    isOpen.value = false;
    searchQuery.value = '';
    results.value = null;
    selectedIndex.value = 0;
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      isOpen.value ? closeSearch() : openSearch();
      return;
    }

    if (!isOpen.value) return;

    if (e.key === 'Escape') {
      closeSearch();
      return;
    }

    // 上下键导航
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatResults.value.length > 0) {
        selectedIndex.value = (selectedIndex.value + 1) % flatResults.value.length;
        scrollToSelected();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatResults.value.length > 0) {
        selectedIndex.value = selectedIndex.value <= 0 ? flatResults.value.length - 1 : selectedIndex.value - 1;
        scrollToSelected();
      }
      return;
    }

    // 回车键跳转到选中项
    if (e.key === 'Enter' && selectedIndex.value >= 0 && flatResults.value.length > 0) {
      e.preventDefault();
      const selected = flatResults.value[selectedIndex.value];
      if (selected) {
        navigateTo(`/${selected.type}/${selected.index}`);
      }
    }
  };

  const scrollToSelected = () => {
    setTimeout(() => {
      const selectedElement = document.querySelector('.search-result-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 10);
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  const performSearch = useDebounceFn(async () => {
    if (!searchQuery.value.trim()) {
      results.value = null;
      return;
    }

    loading.value = true;
    try {
      // Calling custom endpoint
      const res = await pb.send('/api/shifu/search', {
        query: { q: searchQuery.value },
      });
      results.value = res as SearchResults;
    } catch (error) {
      console.error('Global search failed:', error);
      results.value = null;
    } finally {
      loading.value = false;
    }
  }, 300);

  watch(searchQuery, performSearch);

  const navigateTo = (path: string) => {
    closeSearch();
    router.push(path);
  };

  // 计算每个结果项的全局索引
  const getResultIndex = (type: string, itemIndex: number): number => {
    if (!results.value) return -1;
    let index = 0;

    if (type === 'songs') {
      return itemIndex;
    }
    index += results.value.songs.length;

    if (type === 'albums') {
      return index + itemIndex;
    }
    index += results.value.albums.length;

    if (type === 'activities') {
      return index + itemIndex;
    }
    index += results.value.activities.length;

    if (type === 'galleries') {
      return index + itemIndex;
    }
    index += results.value.galleries.length;

    if (type === 'misc') {
      return index + itemIndex;
    }

    return -1;
  };

  const isSelected = (type: string, itemIndex: number): boolean => {
    return getResultIndex(type, itemIndex) === selectedIndex.value;
  };
</script>

<template>
  <div>
    <!-- Floating Action Button -->
    <button
      @click="openSearch"
      class="fixed bottom-8 right-8 w-14 h-14 bg-[#c9c9c9]/10 backdrop-blur-md border border-[#c9c9c9]/20 rounded-full flex items-center justify-center text-[#c9c9c9] hover:bg-[#c9c9c9]/20 hover:border-red-300/50 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-40 group"
      aria-label="全局搜索"
    >
      <AppIcon name="search" class="w-6 h-6 group-hover:scale-110 transition-transform" />
    </button>

    <!-- Search Modal Overlay -->
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-[rgb(77,0,0)]/90 backdrop-blur-xl z-50 flex flex-col items-center pt-24 md:pt-32 px-4 transition-all duration-300 font-serif overflow-y-auto"
        @click.self="closeSearch"
      >
        <!-- Search Header -->
        <div class="w-full max-w-3xl relative">
          <AppIcon name="search" class="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-[#888]" />
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="全站搜索 (Ctrl+K)"
            class="w-full bg-[#c9c9c9]/10 border border-[#c9c9c9]/30 rounded-2xl py-6 pl-20 pr-16 text-2xl text-[#c9c9c9] placeholder-[#888] focus:outline-none focus:border-red-300/60 focus:bg-[#c9c9c9]/15 shadow-[0_0_30px_rgba(162,50,62,0.1)] transition-all"
            @keydown.esc="closeSearch"
          />
          <button
            @click="closeSearch"
            class="absolute right-6 top-1/2 -translate-y-1/2 text-[#888] hover:text-red-300 transition-colors p-2"
          >
            <AppIcon name="close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Search Results area -->
        <div class="w-full max-w-3xl mt-8 pb-20">
          <div v-if="loading" class="text-center py-16 text-[#888] tracking-widest animate-pulse"> 搜索中... </div>

          <div
            v-else-if="results && !Object.values(results).some(arr => arr.length > 0)"
            class="text-center py-16 text-[#888] tracking-widest italic"
          >
            未找到匹配的内容
          </div>

          <div v-else-if="results" class="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <!-- Songs -->
            <section v-if="results.songs.length > 0">
              <h3 class="text-red-300 mb-4 tracking-widest flex items-center gap-2 border-b border-[#c9c9c9]/10 pb-2">
                <AppIcon name="music" class="w-5 h-5 opacity-70" /> 音乐单曲
              </h3>
              <div class="space-y-2">
                <button
                  v-for="(song, idx) in results.songs"
                  :key="song.id"
                  @click="navigateTo(`/songs/${song.index}`)"
                  :class="[
                    'search-result-item w-full text-left p-4 rounded-xl transition-colors group flex justify-between items-center',
                    isSelected('songs', idx) ? 'bg-[#c9c9c9]/20 selected' : 'hover:bg-[#c9c9c9]/10',
                  ]"
                >
                  <div>
                    <div
                      :class="[
                        'text-xl transition-colors',
                        isSelected('songs', idx) ? 'text-red-300' : 'text-[#c9c9c9] group-hover:text-red-300',
                      ]"
                      >{{ song.title }}</div
                    >
                    <div class="text-sm text-[#888] mt-1"
                      >{{ song.album }} <span v-if="song.artist">· {{ song.artist }}</span></div
                    >
                  </div>
                  <AppIcon
                    name="chevron-right"
                    :class="[
                      'w-5 h-5 transition-all',
                      isSelected('songs', idx)
                        ? 'text-red-300 opacity-100 translate-x-0'
                        : 'text-[#888] opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0',
                    ]"
                  />
                </button>
              </div>
            </section>

            <!-- Albums -->
            <section v-if="results.albums.length > 0">
              <h3 class="text-red-300 mb-4 tracking-widest flex items-center gap-2 border-b border-[#c9c9c9]/10 pb-2">
                <AppIcon name="album" class="w-5 h-5 opacity-70" /> 音乐专辑
              </h3>
              <div class="space-y-2">
                <button
                  v-for="(album, idx) in results.albums"
                  :key="album.id"
                  @click="navigateTo(`/albums/${album.index}`)"
                  :class="[
                    'search-result-item w-full text-left p-4 rounded-xl transition-colors group flex justify-between items-center',
                    isSelected('albums', idx) ? 'bg-[#c9c9c9]/20 selected' : 'hover:bg-[#c9c9c9]/10',
                  ]"
                >
                  <div>
                    <div
                      :class="[
                        'text-xl transition-colors',
                        isSelected('albums', idx) ? 'text-red-300' : 'text-[#c9c9c9] group-hover:text-red-300',
                      ]"
                      >{{ album.title }}</div
                    >
                    <div v-if="album.releaseDate" class="text-sm text-[#888] mt-1">{{
                      formatDateToDisplay(album.releaseDate)
                    }}</div>
                  </div>
                  <AppIcon
                    name="chevron-right"
                    :class="[
                      'w-5 h-5 transition-all',
                      isSelected('albums', idx)
                        ? 'text-red-300 opacity-100 translate-x-0'
                        : 'text-[#888] opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0',
                    ]"
                  />
                </button>
              </div>
            </section>

            <!-- Activities -->
            <section v-if="results.activities.length > 0">
              <h3 class="text-red-300 mb-4 tracking-widest flex items-center gap-2 border-b border-[#c9c9c9]/10 pb-2">
                <AppIcon name="activities" class="w-5 h-5 opacity-70" /> 活动
              </h3>
              <div class="space-y-2">
                <button
                  v-for="(activity, idx) in results.activities"
                  :key="activity.id"
                  @click="navigateTo(`/activities/${activity.index}`)"
                  :class="[
                    'search-result-item w-full text-left p-4 rounded-xl transition-colors group flex justify-between items-center',
                    isSelected('activities', idx) ? 'bg-[#c9c9c9]/20 selected' : 'hover:bg-[#c9c9c9]/10',
                  ]"
                >
                  <div>
                    <div
                      :class="[
                        'text-xl transition-colors',
                        isSelected('activities', idx) ? 'text-red-300' : 'text-[#c9c9c9] group-hover:text-red-300',
                      ]"
                      >{{ activity.title }}</div
                    >
                    <div class="text-sm text-[#888] mt-1">
                      {{ formatDateToDisplay(activity.date) }}
                      <span v-if="activity.location">· {{ activity.location }}</span>
                    </div>
                  </div>
                  <AppIcon
                    name="chevron-right"
                    :class="[
                      'w-5 h-5 transition-all',
                      isSelected('activities', idx)
                        ? 'text-red-300 opacity-100 translate-x-0'
                        : 'text-[#888] opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0',
                    ]"
                  />
                </button>
              </div>
            </section>

            <!-- Galleries -->
            <section v-if="results.galleries.length > 0">
              <h3 class="text-red-300 mb-4 tracking-widest flex items-center gap-2 border-b border-[#c9c9c9]/10 pb-2">
                <AppIcon name="image" class="w-5 h-5 opacity-70" /> 图集
              </h3>
              <div class="space-y-2">
                <button
                  v-for="(gallery, idx) in results.galleries"
                  :key="gallery.id"
                  @click="navigateTo(`/galleries/${gallery.index}`)"
                  :class="[
                    'search-result-item w-full text-left p-4 rounded-xl transition-colors group flex justify-between items-center',
                    isSelected('galleries', idx) ? 'bg-[#c9c9c9]/20 selected' : 'hover:bg-[#c9c9c9]/10',
                  ]"
                >
                  <div>
                    <div
                      :class="[
                        'text-xl transition-colors',
                        isSelected('galleries', idx) ? 'text-red-300' : 'text-[#c9c9c9] group-hover:text-red-300',
                      ]"
                      >{{ gallery.title }}</div
                    >
                    <div v-if="gallery.date" class="text-sm text-[#888] mt-1">{{
                      formatDateToDisplay(gallery.date)
                    }}</div>
                  </div>
                  <AppIcon
                    name="chevron-right"
                    :class="[
                      'w-5 h-5 transition-all',
                      isSelected('galleries', idx)
                        ? 'text-red-300 opacity-100 translate-x-0'
                        : 'text-[#888] opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0',
                    ]"
                  />
                </button>
              </div>
            </section>

            <!-- Misc -->
            <section v-if="results.misc.length > 0">
              <h3 class="text-red-300 mb-4 tracking-widest flex items-center gap-2 border-b border-[#c9c9c9]/10 pb-2">
                <AppIcon name="misc" class="w-5 h-5 opacity-70" /> 杂记
              </h3>
              <div class="space-y-2">
                <button
                  v-for="(item, idx) in results.misc"
                  :key="item.id"
                  @click="navigateTo(`/misc/${item.index}`)"
                  :class="[
                    'search-result-item w-full text-left p-4 rounded-xl transition-colors group flex justify-between items-center',
                    isSelected('misc', idx) ? 'bg-[#c9c9c9]/20 selected' : 'hover:bg-[#c9c9c9]/10',
                  ]"
                >
                  <div>
                    <div
                      :class="[
                        'text-xl transition-colors',
                        isSelected('misc', idx) ? 'text-red-300' : 'text-[#c9c9c9] group-hover:text-red-300',
                      ]"
                      >{{ item.title }}</div
                    >
                    <div v-if="item.date" class="text-sm text-[#888] mt-1">{{ formatDateToDisplay(item.date) }}</div>
                  </div>
                  <AppIcon
                    name="chevron-right"
                    :class="[
                      'w-5 h-5 transition-all',
                      isSelected('misc', idx)
                        ? 'text-red-300 opacity-100 translate-x-0'
                        : 'text-[#888] opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0',
                    ]"
                  />
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </div>
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
