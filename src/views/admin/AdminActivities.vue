<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { pb } from '@/lib/pocketbase';
  import type { Activity, ActivityTimeSlot } from '@/types';
  import AppIcon from '@/components/AppIcon.vue';

  const router = useRouter();

  const activities = ref<Activity[]>([]);
  const loading = ref(true);
  const refreshing = ref(false);
  const searchQuery = ref('');
  const deleteConfirm = ref<string | null>(null);
  const deleting = ref(false);

  const filteredActivities = computed(() => {
    if (!searchQuery.value.trim()) return activities.value;
    const query = searchQuery.value.toLowerCase();
    return activities.value.filter(
      a =>
        a.title.toLowerCase().includes(query) ||
        a.location?.toLowerCase().includes(query) ||
        a.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const stats = computed(() => ({
    total: activities.value.length,
  }));

  onMounted(async () => {
    await fetchActivities();
  });

  const fetchActivities = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      refreshing.value = true;
    } else {
      loading.value = true;
    }
    try {
      const result = await pb.collection('activities').getFullList({
        sort: '-created',
        fields: 'id,index,title,timeSlots,location,tags',
      });
      activities.value = result as unknown as Activity[];
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      loading.value = false;
      refreshing.value = false;
    }
  };

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

  // 从时间字符串提取日期
  const extractDate = (timeStr: string): string => {
    if (!timeStr) return '';
    return timeStr.split('T')[0]?.split(' ')[0] || timeStr;
  };

  // 格式化时间段显示 - 仅显示日期
  const formatTimeSlots = (raw: unknown): string => {
    const slots = parseTimeSlots(raw);
    if (slots.length === 0) return '-';
    const firstSlot = slots[0];
    if (!firstSlot) return '-';

    const firstDate = extractDate(firstSlot.start);
    if (slots.length === 1) {
      return firstDate;
    }
    // 多个时间段
    return `${firstDate} 等 ${slots.length} 个`;
  };

  const confirmDelete = (id: string) => {
    deleteConfirm.value = id;
  };

  const cancelDelete = () => {
    deleteConfirm.value = null;
  };

  const deleteActivity = async (activity: Activity) => {
    deleting.value = true;
    try {
      await pb.collection('activities').delete(activity.id);
      activities.value = activities.value.filter(a => a.id !== activity.id);
      deleteConfirm.value = null;
    } catch (error) {
      console.error('Failed to delete activity:', error);
      alert('删除失败，请重试');
    } finally {
      deleting.value = false;
    }
  };

  const createNew = () => {
    router.push('/admin/activities/new');
  };

  const editActivity = (id: string) => {
    router.push(`/admin/activities/${id}`);
  };
</script>

<template>
  <div class="relative min-h-100">
    <div
      v-if="loading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-[rgb(77,0,0)]/90 backdrop-blur-sm"
    >
      <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
    </div>

    <div v-if="loading" class="relative z-30 space-y-6">
      <h1 class="text-2xl font-semibold text-[#c9c9c9]">活动管理</h1>
    </div>

    <div v-else class="relative space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-[#c9c9c9]">活动管理</h1>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors"
            @click="createNew"
          >
            <AppIcon name="plus" class-name="w-5 h-5" />
            新建活动
          </button>
          <button
            :disabled="refreshing"
            class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="fetchActivities(true)"
          >
            <AppIcon name="refresh" :class-name="refreshing ? 'w-5 h-5 animate-spin' : 'w-5 h-5'" />
            {{ refreshing ? '刷新中...' : '刷新列表' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4">
          <p class="text-[#888] text-sm">总计</p>
          <p class="text-2xl font-semibold text-[#c9c9c9] mt-1">{{ stats.total }}</p>
        </div>
      </div>

      <div class="relative">
        <AppIcon name="search" class-name="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888]" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索活动标题、地点或标签"
          class="w-full pl-10 pr-4 py-2.5 bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
        />
      </div>

      <div v-if="filteredActivities.length === 0" class="text-center py-20">
        <p class="text-[#888]">{{ searchQuery ? '没有找到匹配的活动' : '暂无活动，点击上方按钮创建' }}</p>
      </div>

      <div v-else class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 overflow-hidden">
        <table class="w-full text-left">
          <thead class="bg-white/5">
            <tr>
              <th class="px-4 py-3 text-sm font-medium text-[#888]">
                <div class="flex items-center gap-1.5">
                  <AppIcon name="music" class-name="w-4 h-4 opacity-60" />
                  标题
                </div>
              </th>
              <th class="px-4 py-3 text-sm font-medium text-[#888] w-1/3">
                <div class="flex items-center gap-1.5">
                  <AppIcon name="tag" class-name="w-4 h-4 opacity-60" />
                  标签
                </div>
              </th>
              <th class="px-4 py-3 text-sm font-medium text-[#888]">
                <div class="flex items-center gap-1.5">
                  <AppIcon name="location" class-name="w-4 h-4 opacity-60" />
                  地点
                </div>
              </th>
              <th class="px-4 py-3 text-sm font-medium text-[#888] w-40">
                <div class="flex items-center gap-1.5">
                  <AppIcon name="clock" class-name="w-4 h-4 opacity-60" />
                  时间段
                </div>
              </th>
              <th class="px-4 py-3 text-right text-sm font-medium text-[#888]">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#c9c9c9]/10">
            <tr v-for="activity in filteredActivities" :key="activity.id" class="hover:bg-white/5 transition-colors">
              <td class="px-4 py-3">
                <p class="font-medium text-[#c9c9c9]">{{ activity.title }}</p>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="tag in activity.tags"
                    :key="tag"
                    class="text-sm px-2.5 py-0.5 bg-red-300/10 text-red-300 rounded"
                  >
                    {{ tag }}
                  </span>
                  <span v-if="!activity.tags || activity.tags.length === 0" class="text-[#888] text-sm">-</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <p class="text-sm text-[#888]">{{ activity.location || '-' }}</p>
              </td>
              <td class="px-4 py-3 text-sm text-[#888]">
                {{ formatTimeSlots(activity.timeSlots) }}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    class="p-1.5 text-[#888] hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                    title="编辑"
                    @click="editActivity(activity.id)"
                  >
                    <AppIcon name="edit" class-name="w-5 h-5" />
                  </button>
                  <button
                    class="p-1.5 text-[#888] hover:text-red-500 hover:bg-white/10 rounded-lg transition-colors"
                    title="删除"
                    @click="confirmDelete(activity.id)"
                  >
                    <AppIcon name="trash" class-name="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 删除确认模态框 -->
      <div
        v-if="deleteConfirm"
        class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl max-w-sm w-full p-6 shadow-2xl">
          <h3 class="text-xl font-semibold text-[#c9c9c9] mb-2">确认删除</h3>
          <p class="text-[#888] mb-6">确定要删除这个活动吗？此操作不可撤销。</p>
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
              :disabled="deleting"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              :disabled="deleting"
              @click="deleteActivity(activities.find(a => a.id === deleteConfirm)!)"
            >
              <span
                v-if="deleting"
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              ></span>
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
