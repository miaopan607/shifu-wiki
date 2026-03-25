<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { useRoute, useRouter, RouterLink } from 'vue-router';
  import { pb, formatDateTimeToDisplay } from '@/lib/pocketbase';
  import type { ActivityTimeSlot, TicketTier, TicketPlatform, ActivityImage } from '@/types';
  import { marked } from 'marked';
  import AppIcon from '@/components/AppIcon.vue';

  const route = useRoute();
  const router = useRouter();
  const activity = ref<any>(null);
  const images = ref<ActivityImage[]>([]);
  const loading = ref(true);

  const showTimeModal = ref(false);
  const showImageModal = ref(false);
  const currentImageIndex = ref(0);

  const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
  };

  const THEME_COLOR = 'rgb(77,0,0)';

  interface MetaItem {
    label?: string;
    value: string;
    icon?: string;
    clickable?: boolean;
  }

  const metaItems = computed<MetaItem[]>(() => {
    if (!activity.value) return [];
    const items: MetaItem[] = [];
    const timeSlots = parseTimeSlots(activity.value.timeSlots);
    if (timeSlots.length > 0) {
      const dateDisplay = getFirstDate(timeSlots);
      if (dateDisplay) {
        items.push({
          value: timeSlots.length > 1 ? `${dateDisplay} 等 ${timeSlots.length} 个时段` : dateDisplay,
          icon: 'clock',
          clickable: true,
        });
      }
    }
    if (activity.value.location) items.push({ value: activity.value.location, icon: 'location' });
    if (activity.value.saleStartTimes && activity.value.saleStartTimes.length > 0) {
      const times = activity.value.saleStartTimes as string[];
      const firstTime = formatDateTimeToDisplay(times[0]!);
      items.push({
        label: '开票',
        value: times.length > 1 ? `${firstTime} 等 ${times.length} 个时间` : firstTime,
        icon: 'ticket',
      });
    }
    return items;
  });

  const hasExtraInfo = computed(() => {
    return (
      (activity.value?.ticketTiers && activity.value.ticketTiers.length > 0) ||
      (activity.value?.ticketPlatforms && activity.value.ticketPlatforms.length > 0) ||
      (activity.value?.lineup && activity.value.lineup.length > 0) ||
      images.value.length > 0
    );
  });

  const parseTimeSlots = (raw: unknown): ActivityTimeSlot[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((slot: any) => {
        const type = slot.type === 'date' ? 'date' : 'datetime';
        let start = slot.start || '';
        let end = slot.end || undefined;

        if (type === 'date') {
          if (start.includes('T')) start = start.split('T')[0];
          if (start.includes(' ')) start = start.split(' ')[0];
          if (end && end.includes('T')) end = end.split('T')[0];
          if (end && end.includes(' ')) end = end.split(' ')[0];
        }

        return { type, start, end };
      });
    }
    return [];
  };

  const getFirstDate = (slots: ActivityTimeSlot[]): string => {
    if (slots.length === 0) return '';
    const firstSlot = slots[0];
    if (!firstSlot) return '';
    return extractDate(firstSlot.start);
  };

  const extractDate = (timeStr: string): string => {
    if (!timeStr) return '';
    return timeStr.split('T')[0]?.split(' ')[0] || timeStr;
  };

  const openTimeModal = () => {
    showTimeModal.value = true;
  };

  const closeTimeModal = () => {
    showTimeModal.value = false;
  };

  const formatSlotForModal = (slot: ActivityTimeSlot, index: number): string => {
    const date = extractDate(slot.start);
    if (slot.type === 'date') {
      return `${index + 1}. ${date}`;
    }
    const startTime = formatDateTimeToDisplay(slot.start);
    const endTime = slot.end ? formatDateTimeToDisplay(slot.end) : null;
    if (endTime) {
      return `${index + 1}. ${startTime} - ${endTime}`;
    }
    return `${index + 1}. ${startTime} 开始`;
  };

  const openImageModal = (index: number) => {
    currentImageIndex.value = index;
    showImageModal.value = true;
  };

  const closeImageModal = () => {
    showImageModal.value = false;
  };

  const prevImage = () => {
    if (currentImageIndex.value > 0) {
      currentImageIndex.value--;
    } else {
      currentImageIndex.value = images.value.length - 1;
    }
  };

  const nextImage = () => {
    if (currentImageIndex.value < images.value.length - 1) {
      currentImageIndex.value++;
    } else {
      currentImageIndex.value = 0;
    }
  };

  const getImageUrl = (image: ActivityImage, thumb?: string): string => {
    return pb.files.getURL(image, image.image, thumb ? { thumb } : undefined);
  };

  onMounted(async () => {
    const index = route.params.index;
    if (!index) {
      router.replace('/404');
      return;
    }

    try {
      activity.value = await pb.collection('activities').getFirstListItem(`index=${index}`);
      if (activity.value) {
        document.title = `${activity.value.title} | 黄诗扶 Wiki`;

        const imagesRes = await pb.collection('activity_images').getFullList({
          filter: `activity = "${activity.value.id}"`,
          sort: 'sort',
        });
        images.value = imagesRes as ActivityImage[];
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      router.replace('/404');
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <main class="min-h-screen p-8 md:p-20 font-serif text-[#e0e0e0]" :style="{ backgroundColor: THEME_COLOR }">
    <div v-if="loading" class="flex items-center justify-center italic h-[60vh]">加载中...</div>

    <div v-else-if="activity" class="max-w-2xl mx-auto relative transition-opacity duration-300">
      <nav class="mb-12">
        <RouterLink to="/activities" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors"
          >← 返回列表
        </RouterLink>
      </nav>

      <article class="w-full">
        <header class="mb-6">
          <h1 class="text-5xl text-[#c9c9c9] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)]">
            {{ activity.title }}
          </h1>
          <div class="flex flex-wrap items-center gap-y-2 text-[#888] text-sm tracking-widest mt-4">
            <template v-for="(item, index) in metaItems" :key="index">
              <div class="flex items-center">
                <div class="flex items-center gap-1.5">
                  <AppIcon :name="item.icon as any" />
                  <span v-if="item.label" class="text-[#c9c9c9]/60">{{ item.label }}：</span>
                  <span
                    :class="{
                      'cursor-pointer hover:text-red-300 hover:underline': item.clickable,
                    }"
                    @click="item.clickable ? openTimeModal() : null"
                    >{{ item.value }}</span
                  >
                </div>
                <span v-if="index < metaItems.length - 1" class="mx-4 h-3 w-px bg-[#c9c9c9]/30"></span>
              </div>
            </template>
          </div>
        </header>
        <hr class="border-[#c9c9c9]/30 mb-8" />

        <!-- 阵容 -->
        <div
          v-if="activity.lineup && activity.lineup.length > 0"
          class="mb-8 p-6 bg-black/20 rounded-xl border border-[#c9c9c9]/10"
        >
          <h2 class="text-xl text-[#c9c9c9] mb-4 flex items-center gap-2">
            <AppIcon name="user" class-name="w-5 h-5 text-red-300" />
            阵容
          </h2>
          <p class="text-[#c9c9c9]">
            {{ activity.lineup.join('、') }}
          </p>
        </div>

        <!-- 票档 -->
        <div
          v-if="activity.ticketTiers && activity.ticketTiers.length > 0"
          class="mb-8 p-6 bg-black/20 rounded-xl border border-[#c9c9c9]/10"
        >
          <h2 class="text-xl text-[#c9c9c9] mb-4 flex items-center gap-2">
            <AppIcon name="ticket" class-name="w-5 h-5 text-red-300" />
            票档
          </h2>
          <div class="space-y-3">
            <div
              v-for="(tier, index) in activity.ticketTiers"
              :key="index"
              class="flex items-start justify-between py-2 border-b border-[#c9c9c9]/10 last:border-0"
            >
              <div>
                <span v-if="tier.name" class="text-[#c9c9c9]">{{ tier.name }}</span>
                <span v-if="tier.description" class="text-sm text-[#888] ml-2">{{ tier.description }}</span>
              </div>
              <span class="text-red-300 font-medium">{{ tier.price }}</span>
            </div>
          </div>
        </div>

        <!-- 开票平台 -->
        <div
          v-if="activity.ticketPlatforms && activity.ticketPlatforms.length > 0"
          class="mb-8 p-6 bg-black/20 rounded-xl border border-[#c9c9c9]/10"
        >
          <h2 class="text-xl text-[#c9c9c9] mb-4 flex items-center gap-2">
            <AppIcon name="link" class-name="w-5 h-5 text-red-300" />
            购票渠道
          </h2>
          <div class="flex flex-wrap gap-3">
            <a
              v-for="(platform, index) in activity.ticketPlatforms"
              :key="index"
              :href="platform.url || '#'"
              :target="platform.url ? '_blank' : undefined"
              class="inline-flex items-center gap-2 px-4 py-2 bg-red-300/10 hover:bg-red-300/20 text-red-300 rounded-lg transition-colors"
            >
              {{ platform.name }}
              <AppIcon v-if="platform.url" name="external" class-name="w-4 h-4" />
            </a>
          </div>
        </div>

        <!-- 活动正文内容 -->
        <div
          class="prose prose-invert mx-auto content-container text-lg leading-relaxed text-[#c9c9c9]"
          v-html="renderMarkdown(activity.description || '暂无详细介绍')"
        ></div>

        <!-- 相关图片 -->
        <div v-if="images.length > 0" class="mt-12">
          <h2 class="text-xl text-[#c9c9c9] mb-4 flex items-center gap-2">
            <AppIcon name="image" class-name="w-5 h-5 text-red-300" />
            相关图片
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="(image, index) in images"
              :key="image.id"
              class="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              @click="openImageModal(index)"
            >
              <img :src="getImageUrl(image, '400x400')" :alt="`图片 ${index + 1}`" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- 时间段详情弹窗 -->
    <div
      v-if="showTimeModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click="closeTimeModal"
    >
      <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl max-w-md w-full p-6 shadow-2xl" @click.stop>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-semibold text-[#c9c9c9]">{{ activity?.title }}</h3>
          <button class="p-1.5 text-[#888] hover:text-red-300 transition-colors" @click="closeTimeModal">
            <AppIcon name="close" class-name="w-5 h-5" />
          </button>
        </div>
        <p class="text-sm text-[#888] mb-4">时间段详情</p>
        <div class="space-y-3">
          <div
            v-for="(slot, index) in parseTimeSlots(activity?.timeSlots)"
            :key="index"
            class="py-2 px-3 bg-black/20 rounded text-[#c9c9c9]"
          >
            {{ formatSlotForModal(slot, index) }}
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button
            class="px-4 py-2 bg-red-300 text-[rgb(77,0,0)] font-medium rounded-lg hover:bg-[#fca5a5] transition-colors"
            @click="closeTimeModal"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 图片查看弹窗 -->
    <div
      v-if="showImageModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      @click="closeImageModal"
    >
      <button
        class="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors z-10"
        @click="closeImageModal"
      >
        <AppIcon name="close" class-name="w-8 h-8" />
      </button>

      <button
        class="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white transition-colors z-10"
        @click.stop="prevImage"
      >
        <AppIcon name="chevron-left" class-name="w-8 h-8" />
      </button>

      <button
        class="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white transition-colors z-10"
        @click.stop="nextImage"
      >
        <AppIcon name="chevron-right" class-name="w-8 h-8" />
      </button>

      <img
        v-if="images[currentImageIndex]"
        :src="getImageUrl(images[currentImageIndex]!)"
        :alt="`图片 ${currentImageIndex + 1}`"
        class="max-h-[90vh] max-w-[90vw] object-contain"
        @click.stop
      />

      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {{ currentImageIndex + 1 }} / {{ images.length }}
      </div>
    </div>
  </main>
</template>

<style scoped>
  .prose :deep(a) {
    color: #fca5a5;
    text-decoration: none;
  }
  .prose :deep(a:hover) {
    text-decoration: underline;
  }
</style>
