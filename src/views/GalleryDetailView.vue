<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  import { useRoute, RouterLink } from 'vue-router';
  import { marked } from 'marked';
  import { pb } from '@/lib/pocketbase';
  import Lightbox from '@/components/Lightbox.vue';
  import type { Gallery, GalleryImage } from '@/types';

  const route = useRoute();
  const slugOrId = route.params.slug as string;
  const gallery = ref<Gallery | null>(null);
  const images = ref<GalleryImage[]>([]);
  const loading = ref(true);

  // 记录哪些图片应该加载（已进入视口）
  const imagesToLoad = ref<Set<string>>(new Set());
  // 记录哪些图片已经完全加载完成
  const imagesLoaded = ref<Set<string>>(new Set());

  // 灯箱状态
  const lightboxOpen = ref(false);
  const lightboxIndex = ref(0);

  const getThumbnailUrl = (record: GalleryImage, filename: string) => {
    return pb.files.getURL(record, filename, { thumb: '0x1080' });
  };

  const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
  };

  onMounted(async () => {
    try {
      // Fetch gallery details
      try {
        gallery.value = await pb.collection('galleries').getFirstListItem(`slug="${slugOrId}"`);
      } catch {
        // If fetching by slug fails, try by ID
        try {
          gallery.value = await pb.collection('galleries').getOne(slugOrId);
        } catch {
          console.warn('Gallery not found by slug or ID');
        }
      }

      if (gallery.value) {
        document.title = `${gallery.value.title} | 图集 | 黄诗扶 Wiki`;

        // Fetch images
        const result = await pb.collection('gallery_images').getList(1, 100, {
          filter: `gallery = "${gallery.value.id}"`,
          sort: 'sort',
        });
        images.value = result.items as unknown as GalleryImage[];
      }
    } catch (error) {
      console.error('Failed to fetch gallery data:', error);
    } finally {
      loading.value = false;
      // 初始化后设置观察器
      setTimeout(() => {
        setupIntersectionObserver();
      }, 100);
    }
  });

  // 使用 Intersection Observer 检测图片是否进入视口
  let observer: IntersectionObserver | null = null;

  const setupIntersectionObserver = () => {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const imgId = entry.target.getAttribute('data-img-id');
            if (imgId) {
              imagesToLoad.value.add(imgId);
              // 加载后停止观察这张图片
              observer?.unobserve(entry.target);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0,
      }
    );

    // 观察所有图片占位元素
    document.querySelectorAll('.img-placeholder').forEach(el => {
      observer?.observe(el);
    });
  };

  onUnmounted(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });

  // 检查图片是否应该加载
  const shouldLoadImage = (imgId: string) => {
    return imagesToLoad.value.has(imgId);
  };

  // 检查图片是否已完全加载
  const isImageLoaded = (imgId: string) => {
    return imagesLoaded.value.has(imgId);
  };

  // 图片加载完成回调
  const onImageLoad = (imgId: string) => {
    imagesLoaded.value.add(imgId);
  };

  // 打开灯箱
  const openLightbox = (index: number) => {
    lightboxIndex.value = index;
    lightboxOpen.value = true;
  };
</script>

<template>
  <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif">
    <div class="max-w-4xl mx-auto">
      <header class="mb-12">
        <RouterLink
          to="/galleries"
          class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors mb-8 inline-block"
          >← 返回图集列表</RouterLink
        >

        <div v-if="gallery">
          <h1 class="text-4xl md:text-5xl text-[#c9c9c9] mb-6 tracking-widest">{{ gallery.title }}</h1>
          <hr class="border-[#c9c9c9]/30 mb-6" />
          <div
            v-if="gallery.description"
            class="text-[#c9c9c9]/80 text-lg leading-relaxed tracking-wider prose prose-invert"
            v-html="renderMarkdown(gallery.description)"
          ></div>
        </div>
      </header>

      <div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

      <div v-else>
        <div v-if="!gallery" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">未找到图集</div>
        <div v-else-if="images.length === 0" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">
          该图集暂无图片</div
        >

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="(img, index) in images"
            :key="img.id"
            :data-img-id="img.id"
            class="img-placeholder group relative aspect-3/4 overflow-hidden rounded-lg bg-black/20 cursor-zoom-in"
            @click="openLightbox(index)"
          >
            <!-- 图片内容：只有进入视口才加载，且加载完成后才显示 -->
            <img
              v-if="shouldLoadImage(img.id)"
              :src="getThumbnailUrl(img, img.image)"
              :alt="gallery?.title"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              :class="{ 'opacity-0': !isImageLoaded(img.id) }"
              @load="onImageLoad(img.id)"
            />
            <!-- 加载动画：未进入视口或未加载完成时显示 -->
            <div
              v-if="!shouldLoadImage(img.id) || !isImageLoaded(img.id)"
              class="absolute inset-0 flex items-center justify-center"
            >
              <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-[#c9c9c9] rounded-full animate-spin"></div>
            </div>
            <!-- Overlay for viewing full image hint -->
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300">
              <div
                class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 text-white text-xs px-2 py-1 rounded"
              >
                查看大图
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- 灯箱组件 -->
  <Lightbox
    v-model="lightboxOpen"
    :images="images"
    :initial-index="lightboxIndex"
    :gallery-title="gallery?.title || ''"
  />
</template>

<style scoped>
  /* 加载动画 */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
