<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { useRoute, useRouter, RouterLink } from 'vue-router';
  import { pb, formatDateTimeToDisplay } from '@/lib/pocketbase';
  import type { ActivityTimeSlot } from '@/types';
  import { marked } from 'marked';
  import AppIcon from '@/components/AppIcon.vue';

  const route = useRoute();
  const router = useRouter();
  const activity = ref<any>(null);
  const loading = ref(true);

  // 弹窗相关
  const showTimeModal = ref(false);

  const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
  };

  const THEME_COLOR = 'rgb(77,0,0)';

  // 元数据项配置
  interface MetaItem {
    label?: string;
    value: string;
    icon?: string;
    clickable?: boolean;
  }

  const metaItems = computed<MetaItem[]>(() => {
    if (!activity.value) return [];
    const items: MetaItem[] = [];
    // 显示日期（可点击）
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
    return items;
  });

  // 解析时间段数据
  const parseTimeSlots = (raw: unknown): ActivityTimeSlot[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((slot: any) => ({
        type: slot.type === 'date' ? 'date' : 'datetime',
        start: slot.start || '',
        end: slot.end || undefined,
      }));
    }
    return [];
  };

  // 获取第一个日期
  const getFirstDate = (slots: ActivityTimeSlot[]): string => {
    if (slots.length === 0) return '';
    const firstSlot = slots[0];
    if (!firstSlot) return '';
    return extractDate(firstSlot.start);
  };

  // 从时间字符串提取日期
  const extractDate = (timeStr: string): string => {
    if (!timeStr) return '';
    return timeStr.split('T')[0]?.split(' ')[0] || timeStr;
  };

  // 打开时间段弹窗
  const openTimeModal = () => {
    showTimeModal.value = true;
  };

  // 关闭弹窗
  const closeTimeModal = () => {
    showTimeModal.value = false;
  };

  // 格式化弹窗中的时间段显示
  const formatSlotForModal = (slot: ActivityTimeSlot, index: number): string => {
    const date = extractDate(slot.start);
    if (slot.type === 'date') {
      return `${index + 1}. ${date}`;
    }
    // 详细时间模式
    const startTime = formatDateTimeToDisplay(slot.start);
    const endTime = slot.end ? formatDateTimeToDisplay(slot.end) : null;
    if (endTime) {
      return `${index + 1}. ${startTime} - ${endTime}`;
    }
    return `${index + 1}. ${startTime} 开始`;
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

        <!-- 活动正文内容 -->
        <div
          class="prose prose-invert mx-auto content-container text-lg leading-relaxed text-[#c9c9c9]"
          v-html="renderMarkdown(activity.content || activity.description || '暂无详细介绍')"
        ></div>
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
  </main>
</template>

<style scoped>
  /* Scoped styles can be added here if needed */
</style>
