<script setup lang="ts">
  import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
  import { RouterLink } from 'vue-router';
  import { pb } from '@/lib/pocketbase';
  import type { ActivityTimeSlot } from '@/types';
  import SubPageNav from '@/components/SubPageNav.vue';
  import AppIcon from '@/components/AppIcon.vue';

  interface Theme {
    bgColor: string;
    textColor: string;
    accentColor: string;
  }

  interface Activity {
    id: string;
    index: number;
    title: string;
    timeSlots?: ActivityTimeSlot[];
    location?: string;
    tags?: string[];
  }

  interface SectionConfig {
    id: string;
    label: string;
    tags?: string[];
    showFilter: boolean;
  }

  // 配色配置
  const DEFAULT_THEME: Theme = {
    bgColor: 'rgb(77, 0, 0)',
    textColor: '#c9c9c9',
    accentColor: '#fca5a5',
  };

  const TAG_THEMES: Record<string, Theme> = {
    人间: {
      bgColor: '#516a6f',
      textColor: '#d1d5db',
      accentColor: '#fbbf24',
    },
    入梦: {
      bgColor: 'rgb(77, 0, 0)',
      textColor: '#c9c9c9',
      accentColor: '#fca5a5',
    },
  };

  // 分区配置
  const SECTIONS: SectionConfig[] = [
    { id: 'all', label: '全部', tags: undefined, showFilter: false },
    { id: 'solo', label: '个人专场', tags: ['入梦', '人间'], showFilter: true },
    { id: 'mixed', label: '拼盘', tags: ['拼盘'], showFilter: false },
    { id: 'friends', label: '好友专场', tags: ['好友'], showFilter: false },
  ];

  const activeSectionId = ref('all');
  const activeTag = ref<string | null>(null);
  const activities = ref<Activity[]>([]);
  const loading = ref(true);
  const searchQuery = ref('');

  const currentSection = computed<SectionConfig>(
    () => SECTIONS.find(s => s.id === activeSectionId.value) ?? SECTIONS[0]!
  );

  // 计算当前分区下应该显示的 Tag 列表
  const availableTags = computed(() => {
    if (currentSection.value.tags) {
      return currentSection.value.tags;
    }
    const tags = new Set<string>();
    Object.keys(TAG_THEMES).forEach(t => tags.add(t));
    SECTIONS.forEach(s => s.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  });

  const currentTheme = computed<Theme>(() => {
    if (activeTag.value) {
      const theme = TAG_THEMES[activeTag.value];
      if (theme) return theme;
    }
    return DEFAULT_THEME;
  });

  // 格式化活动元数据 - 显示日期
  interface MetaPart {
    type: 'location' | 'clock';
    value: string;
  }

  const getActivityMetaParts = (activity: Activity): MetaPart[] => {
    const parts: MetaPart[] = [];
    // 显示日期
    if (activity.timeSlots && activity.timeSlots.length > 0) {
      const dateDisplay = getFirstDate(activity.timeSlots);
      if (dateDisplay) {
        parts.push({
          type: 'clock',
          value: activity.timeSlots.length > 1 ? `${dateDisplay} 等 ${activity.timeSlots.length} 个时段` : dateDisplay,
        });
      }
    }
    if (activity.location) parts.push({ type: 'location', value: activity.location });
    return parts;
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
    // 如果是 ISO 格式或 datetime-local 格式，提取日期部分
    return timeStr.split('T')[0]?.split(' ')[0] || timeStr;
  };

  const filteredActivities = computed(() => {
    let result = activities.value;

    // 1. 先按 Section 筛选
    if (currentSection.value.tags && currentSection.value.tags.length > 0) {
      result = result.filter(a => a.tags && a.tags.some(t => currentSection.value.tags!.includes(t)));
    }

    // 2. 再按 Active Tag 筛选
    if (activeTag.value) {
      result = result.filter(a => a.tags?.includes(activeTag.value!));
    }

    // 3. 最后按搜索关键词筛选
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        a =>
          a.title?.toLowerCase().includes(query) ||
          a.location?.toLowerCase().includes(query) ||
          a.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return result;
  });

  onMounted(async () => {
    try {
      const records = await pb.collection('activities').getFullList({
        sort: '-created',
        fields: 'id,index,title,timeSlots,location,tags',
      });
      activities.value = records.map(record => ({
        id: record.id,
        index: record.index,
        title: record.title,
        timeSlots: record.timeSlots,
        location: record.location,
        tags: Array.isArray(record.tags) ? record.tags : [],
      }));
    } catch (e) {
      console.warn('Failed to fetch activities:', e);
    } finally {
      loading.value = false;
    }

    applyTheme(currentTheme.value);
  });

  onUnmounted(() => {
    document.documentElement.style.backgroundColor = '';
    document.documentElement.style.removeProperty('--scroll-thumb');
    document.documentElement.style.removeProperty('--scroll-track');
  });

  const switchSection = (id: string) => {
    activeSectionId.value = id;
    activeTag.value = null;
  };

  const switchTag = (tag: string | null) => {
    activeTag.value = tag;
  };

  const applyTheme = (theme: Theme) => {
    document.documentElement.style.backgroundColor = theme.bgColor;
    document.documentElement.style.setProperty('--scroll-thumb', theme.accentColor + '44');
    document.documentElement.style.setProperty('--scroll-track', theme.bgColor);
  };

  watch(currentTheme, newTheme => {
    applyTheme(newTheme);
  });
</script>

<template>
  <main
    id="main-container"
    class="min-h-screen p-8 md:p-20 transition-colors duration-500 font-serif"
    :style="{
      color: currentTheme.textColor,
      '--accent-color': currentTheme.accentColor,
      backgroundColor: currentTheme.bgColor,
    }"
  >
    <div class="max-w-2xl mx-auto">
      <header class="mb-8">
        <RouterLink id="back-link" to="/" class="text-lg transition-colors" :style="{ color: currentTheme.accentColor }"
          >← 返回首页</RouterLink
        >
        <SubPageNav active-page="activities" />
      </header>

      <!-- 一级导航：分区 (Sections) -->
      <nav class="flex gap-8 mb-8 border-b border-current/20 pb-4">
        <button
          v-for="section in SECTIONS"
          :key="section.id"
          class="text-xl transition-colors relative hover:opacity-80"
          :class="{ 'font-bold': activeSectionId === section.id }"
          :style="activeSectionId === section.id ? { color: currentTheme.accentColor } : {}"
          @click="switchSection(section.id)"
        >
          {{ section.label }}
          <span
            v-if="activeSectionId === section.id"
            class="absolute -bottom-4 left-0 w-full h-0.5"
            :style="{ backgroundColor: currentTheme.accentColor }"
          ></span>
        </button>
      </nav>

      <!-- 二级导航：标签筛选 (Tags) -->
      <nav v-if="currentSection.showFilter" class="flex gap-4 mb-12 flex-wrap">
        <!-- '全部' 按钮 -->
        <button
          class="tab-button px-6 py-1.5 rounded-full border border-current hover:opacity-80 transition-all cursor-pointer text-lg"
          :style="activeTag === null ? { backgroundColor: currentTheme.textColor, color: currentTheme.bgColor } : {}"
          @click="switchTag(null)"
        >
          全部
        </button>
        <!-- 各个 Tag 按钮 -->
        <button
          v-for="tag in availableTags"
          :key="tag"
          class="tab-button px-6 py-1.5 rounded-full border border-current hover:opacity-80 transition-all cursor-pointer text-lg"
          :style="activeTag === tag ? { backgroundColor: currentTheme.textColor, color: currentTheme.bgColor } : {}"
          @click="switchTag(tag)"
        >
          {{ tag }}
        </button>
      </nav>
      <!-- 即使不显示筛选器，也给个 margin 保持间距，或者不需要 -->
      <div v-else class="mb-12"></div>

      <!-- 搜索框 -->
      <div class="mb-10">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索活动、地点或标签"
          class="w-full px-4 py-3 bg-current/10 border border-current/20 rounded transition-colors placeholder:opacity-50 focus:outline-none focus:border-current/50"
          :style="{ color: currentTheme.textColor }"
        />
      </div>

      <div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest">加载中...</div>

      <div v-else id="activities-list" class="space-y-10">
        <template v-if="filteredActivities.length > 0">
          <RouterLink
            v-for="activity in filteredActivities"
            :key="activity.id"
            :to="`/activities/${activity.index}`"
            class="activity-item group block border-b border-current/20 pb-8 hover:border-red-300/50 transition-all"
          >
            <div class="flex justify-between items-end">
              <div>
                <h2 class="text-2xl group-hover:text-red-300 transition-colors">{{ activity.title }}</h2>
                <div class="flex items-center gap-3 mt-2 tracking-widest text-sm opacity-60">
                  <template v-for="(part, index) in getActivityMetaParts(activity)" :key="index">
                    <div class="flex items-center gap-1">
                      <AppIcon :name="part.type" />
                      <span>{{ part.value }}</span>
                    </div>
                    <span v-if="index < getActivityMetaParts(activity).length - 1">·</span>
                  </template>
                </div>
              </div>
              <span
                class="accent-text opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0"
                >详情 →</span
              >
            </div>
          </RouterLink>
        </template>
        <p v-else class="text-center py-20 opacity-40 italic tracking-widest">暂无活动记录</p>
      </div>
    </div>

  </main>
</template>

<style scoped>
  .tab-button {
    font-family: inherit;
  }

  .accent-text {
    color: var(--accent-color, inherit);
  }

  /* Base background transition is handled by global.css and documentElement style */
</style>
