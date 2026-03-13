<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { pb } from '@/lib/pocketbase';
  import AdminInput from '@/components/AdminInput.vue';
  import type { Activity, ActivityTimeSlot } from '@/types';
  import { DEFAULT_TIME_INPUT_MODE } from '@/types';
  import AppIcon from '@/components/AppIcon.vue';

  const route = useRoute();
  const router = useRouter();
  const isEdit = ref(route.params.id !== undefined);
  const loading = ref(false);
  const saving = ref(false);
  const titleError = ref('');

  const activity = ref<Partial<Activity>>({
    title: '',
    timeSlots: [],
    location: '',
    tags: [],
    description: '',
  });

  const tagInput = ref('');

  onMounted(async () => {
    if (isEdit.value) {
      loading.value = true;
      try {
        const record = await pb.collection('activities').getOne(route.params.id as string);
        activity.value = {
          ...record,
          timeSlots: parseTimeSlots(record.timeSlots),
          tags: Array.isArray(record.tags) ? record.tags : [],
        } as unknown as Activity;
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        alert('获取活动详情失败');
        router.push('/admin/activities');
      } finally {
        loading.value = false;
      }
    }
  });

  // 解析时间段数据
  const parseTimeSlots = (raw: unknown): ActivityTimeSlot[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((slot: any) => {
        const type = slot.type === 'date' ? 'date' : 'datetime';
        let start = slot.start || '';
        let end = slot.end || undefined;

        // 如果是日期类型，提取日期部分 YYYY-MM-DD
        if (type === 'date') {
          if (start.includes('T')) start = start.split('T')[0];
          if (start.includes(' ')) start = start.split(' ')[0];
          if (end && end.includes('T')) end = end.split('T')[0];
          if (end && end.includes(' ')) end = end.split(' ')[0];
        } else {
          // 如果是日期时间类型，转换为 datetime-local 格式 (YYYY-MM-DDTHH:mm)
          if (start) {
            const startDate = new Date(start);
            if (!isNaN(startDate.getTime())) start = toDateTimeLocal(startDate);
          }
          if (end) {
            const endDate = new Date(end);
            if (!isNaN(endDate.getTime())) end = toDateTimeLocal(endDate);
          }
        }

        return { type, start, end };
      });
    }
    return [];
  };

  // 添加时间段
  const addTimeSlot = () => {
    const newSlot: ActivityTimeSlot = {
      type: DEFAULT_TIME_INPUT_MODE,
      start: toDateTimeLocal(new Date()),
      end: toDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    };
    activity.value.timeSlots = [...(activity.value.timeSlots || []), newSlot];
  };

  // 删除时间段
  const removeTimeSlot = (index: number) => {
    const slots = activity.value.timeSlots || [];
    activity.value.timeSlots = slots.filter((_, i) => i !== index);
  };

  // 切换时间段类型
  const toggleSlotType = (index: number) => {
    const slots = activity.value.timeSlots || [];
    const slot = slots[index];
    if (!slot) return;

    const newType = slot.type === 'datetime' ? 'date' : 'datetime';
    const newSlot: ActivityTimeSlot = {
      type: newType,
      start: newType === 'datetime' ? toDateTimeLocal(new Date()) : toDateString(new Date()),
      end: newType === 'datetime' ? toDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000)) : undefined,
    };
    slots[index] = newSlot;
    activity.value.timeSlots = [...slots];
  };

  // 工具函数：转换为日期字符串 YYYY-MM-DD
  const toDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 工具函数：转换为 datetime-local 格式 YYYY-MM-DDTHH:mm
  const toDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const addTag = () => {
    const tag = tagInput.value.trim();
    if (tag && !activity.value.tags?.includes(tag)) {
      activity.value.tags = [...(activity.value.tags || []), tag];
      tagInput.value = '';
    }
  };

  const removeTag = (tag: string) => {
    activity.value.tags = activity.value.tags?.filter(t => t !== tag);
  };

  const saveActivity = async () => {
    titleError.value = '';

    // 自动添加未点击添加按钮的标签
    if (tagInput.value.trim()) {
      addTag();
    }

    if (!activity.value.title?.trim()) {
      titleError.value = '活动名称不能为空';
      return;
    }

    saving.value = true;
    try {
      const collection = pb.collection('activities');
      const normalizedTitle = activity.value.title.trim();

      let index = activity.value.index;
      if (!isEdit.value) {
        const maxIndexResult = await collection.getList(1, 1, {
          sort: '-index',
          fields: 'index',
        });
        index = maxIndexResult.items.length > 0 ? ((maxIndexResult.items[0] as any).index as number) + 1 : 1;
      }

      const data = {
        ...activity.value,
        title: normalizedTitle,
        index,
        timeSlots: activity.value.timeSlots?.map(slot => {
          if (slot.type === 'date') {
            // 如果是日期类型，确保存储时是 YYYY-MM-DD 00:00:00 格式的字符串
            // 虽然在 JSON 中，但我们遵循统一的零点规则
            const startStr = slot.start.includes('T') ? slot.start.split('T')[0] : slot.start;
            const endStr = slot.end ? (slot.end.includes('T') ? slot.end.split('T')[0] : slot.end) : null;
            return {
              type: 'date',
              start: startStr ? `${startStr} 00:00:00.000Z` : '',
              end: endStr ? `${endStr} 00:00:00.000Z` : null,
            };
          }
          return {
            type: slot.type,
            start: slot.start ? new Date(slot.start).toISOString() : '',
            end: slot.end ? new Date(slot.end).toISOString() : null,
          };
        }),
        tags: activity.value.tags || [],
      };

      if (isEdit.value) {
        await collection.update(route.params.id as string, data);
      } else {
        await collection.create(data);
      }
      router.push('/admin/activities');
    } catch (error) {
      console.error('Failed to save activity:', error);
      alert('保存失败，请检查输入是否完整');
    } finally {
      saving.value = false;
    }
  };

  const cancel = () => {
    router.push('/admin/activities');
  };
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <h1 class="text-2xl font-semibold text-[#c9c9c9] flex items-center gap-3">
          {{ isEdit ? '编辑活动' : '新建活动' }}
          <span v-if="isEdit && !loading && activity.index" class="text-lg text-[#888] font-normal"
            >#{{ activity.index }}</span
          >
        </h1>
      </div>
      <div class="flex gap-3">
        <button
          tabindex="-1"
          class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors inline-flex items-center gap-2"
          @click="cancel"
        >
          <AppIcon name="close" class-name="w-4 h-4" />
          取消
        </button>
        <button
          tabindex="-1"
          class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors flex items-center gap-2"
          :disabled="saving"
          @click="saveActivity"
        >
          <AppIcon v-if="saving" name="refresh" class-name="w-4 h-4 animate-spin" />
          <AppIcon v-else name="save" class-name="w-4 h-4" />
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
    </div>

    <div v-else class="grid grid-cols-1 gap-6">
      <div class="space-y-6">
        <!-- 基本信息 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
          <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3 flex items-center gap-2">
            <AppIcon name="info" class-name="w-5 h-5 text-red-300" />
            基本信息
          </h2>

          <AdminInput
            v-model="activity.title"
            label="名称"
            placeholder="活动名称"
            required
            :error="titleError"
            @clear="titleError = ''"
          />

          <AdminInput v-model="activity.location" label="地点" placeholder="活动地点" />
        </div>

        <!-- 时间段管理 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
          <div class="flex items-center justify-between border-b border-[#c9c9c9]/20 pb-3">
            <h2 class="text-lg font-semibold text-[#c9c9c9] flex items-center gap-2">
              <AppIcon name="clock" class-name="w-5 h-5 text-red-300" />
              时间段
            </h2>
          </div>

          <!-- 时间段列表 -->
          <div v-if="!activity.timeSlots || activity.timeSlots.length === 0" class="text-center py-8 text-[#888]">
            暂无时间段，点击下方按钮添加
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(slot, index) in activity.timeSlots"
              :key="index"
              class="bg-black/20 border border-[#c9c9c9]/10 rounded-lg p-4 space-y-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-[#c9c9c9]">时间段 #{{ index + 1 }}</span>
                <div class="flex items-center gap-2">
                  <!-- 仅日期切换按钮 -->
                  <button
                    tabindex="-1"
                    class="flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors"
                    :class="
                      slot.type === 'date'
                        ? 'bg-red-300 text-[rgb(77,0,0)]'
                        : 'bg-white/5 text-[#888] hover:bg-white/10'
                    "
                    @click="toggleSlotType(index)"
                  >
                    <!-- 圆圈勾选图标 -->
                    <div
                      class="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                      :class="slot.type === 'date' ? 'border-[rgb(77,0,0)] bg-[rgb(77,0,0)]' : 'border-current'"
                    >
                      <svg
                        v-if="slot.type === 'date'"
                        class="w-2.5 h-2.5 text-red-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        stroke-width="3"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>仅日期</span>
                  </button>
                  <button
                    tabindex="-1"
                    class="p-1.5 text-[#888] hover:text-red-500 transition-colors"
                    title="删除"
                    @click="removeTimeSlot(index)"
                  >
                    <AppIcon name="trash" class-name="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- 详细时间模式 -->
              <div v-if="slot.type === 'datetime'" class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs text-[#888]">开始时间</label>
                  <input
                    v-model="slot.start"
                    type="datetime-local"
                    class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-[#888]">结束时间</label>
                  <input
                    v-model="slot.end"
                    type="datetime-local"
                    class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                  />
                </div>
              </div>

              <!-- 仅日期模式 -->
              <div v-else class="space-y-1">
                <label class="text-xs text-[#888]">日期</label>
                <input
                  v-model="slot.start"
                  type="date"
                  class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                />
              </div>
            </div>
          </div>

          <button
            tabindex="-1"
            class="w-full py-3 border border-dashed border-[#c9c9c9]/30 rounded-lg text-[#888] hover:text-red-300 hover:border-red-300/50 transition-colors flex items-center justify-center gap-2"
            @click="addTimeSlot"
          >
            <AppIcon name="plus" class-name="w-4 h-4" />
            添加时间段
          </button>
        </div>

        <!-- 标签 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
            <AppIcon name="tag" class-name="w-5 h-5 text-red-300" />
            标签
          </h2>
          <div class="flex flex-wrap gap-2 mb-2">
            <span
              v-for="tag in activity.tags"
              :key="tag"
              class="inline-flex items-center gap-1 px-3 py-1 bg-red-300/10 text-red-300 rounded-full text-sm"
            >
              {{ tag }}
              <button tabindex="-1" class="-m-1 p-1 hover:text-white transition-colors" @click="removeTag(tag)">
                <AppIcon name="close" class-name="w-4 h-4" />
              </button>
            </span>
          </div>
          <div class="flex gap-2">
            <input
              v-model="tagInput"
              type="text"
              placeholder="添加标签"
              class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
              @keyup.enter="addTag"
            />
            <button
              tabindex="-1"
              class="px-4 py-2 bg-white/5 text-[#c9c9c9] rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-1"
              @click="addTag"
            >
              <AppIcon name="plus" class-name="w-4 h-4" />
              添加
            </button>
          </div>
        </div>

        <!-- 活动详情 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <AdminInput
            v-model="activity.description"
            label="详情"
            icon="info"
            type="markdown"
            placeholder="活动详情"
            label-size="lg"
          />
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

  textarea {
    resize: none;
  }
</style>
