<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { uploadStore } from '@/stores/uploadStore';
import { formatFileSize, getStatusText, getStatusColor } from '@/lib/uploadManager';
import type { BatchTaskStatus, BatchUploadTask, FileUploadInfo } from '@/types/upload';

type TaskFilter = 'all' | Exclude<BatchTaskStatus, 'pending'>;

const tasks = uploadStore.tasks;
const panelState = uploadStore.panelState;

const isMobile = ref(false);
const isDragging = ref(false);
const dragStartY = ref(0);
const currentTranslateY = ref(0);
const taskFilter = ref<TaskFilter>('all');

const listedTasks = computed(() =>
  [...tasks.value]
    .filter(task => task.status !== 'pending')
    .sort((a, b) => b.createdAt - a.createdAt)
);

const taskCounts = computed(() => ({
  all: listedTasks.value.length,
  uploading: listedTasks.value.filter(task => task.status === 'uploading').length,
  paused: listedTasks.value.filter(task => task.status === 'paused').length,
  success: listedTasks.value.filter(task => task.status === 'success').length,
  partial_success: listedTasks.value.filter(task => task.status === 'partial_success').length,
  error: listedTasks.value.filter(task => task.status === 'error').length,
  cancelled: listedTasks.value.filter(task => task.status === 'cancelled').length,
}));

const filterOptions = computed(() => [
  { value: 'all' as const, label: '全部', count: taskCounts.value.all },
  { value: 'uploading' as const, label: '上传中', count: taskCounts.value.uploading },
  { value: 'paused' as const, label: '已暂停', count: taskCounts.value.paused },
  { value: 'success' as const, label: '已完成', count: taskCounts.value.success },
  { value: 'partial_success' as const, label: '部分成功', count: taskCounts.value.partial_success },
  { value: 'error' as const, label: '失败', count: taskCounts.value.error },
  { value: 'cancelled' as const, label: '已取消', count: taskCounts.value.cancelled },
]);

const visibleTasks = computed(() => {
  if (taskFilter.value === 'all') {
    return listedTasks.value;
  }

  return listedTasks.value.filter(task => task.status === taskFilter.value);
});

const hasTasks = computed(() => listedTasks.value.length > 0);
const hasVisibleTasks = computed(() => visibleTasks.value.length > 0);
const activeTaskCount = computed(() =>
  listedTasks.value.filter(task => task.status === 'uploading' || task.status === 'paused').length
);
const completedTaskCount = computed(() => taskCounts.value.success);
const partialSuccessTaskCount = computed(() => taskCounts.value.partial_success);
const errorTaskCount = computed(() => taskCounts.value.error);
const cancelledTaskCount = computed(() => taskCounts.value.cancelled);
const clearableTaskCount = computed(() =>
  listedTasks.value.filter(task => task.status === 'success' || task.status === 'error' || task.status === 'partial_success' || task.status === 'cancelled').length
);

// 检查是否是移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

// 任务操作
const handlePause = (task: BatchUploadTask) => {
  uploadStore.pauseTask(task.id);
};

const handleResume = (task: BatchUploadTask) => {
  uploadStore.resumeTask(task.id);
};

const handleCancel = (task: BatchUploadTask) => {
  if (confirm(`确定要取消 "${task.targetName}" 的上传吗？`)) {
    uploadStore.cancelTask(task.id);
  }
};

const handleRetry = (task: BatchUploadTask) => {
  uploadStore.retryTask(task.id);
};

const handleCancelAll = () => {
  if (confirm('确定要取消所有未完成的任务吗？')) {
    uploadStore.cancelAllTasks();
  }
};

const handleClearCompleted = () => {
  uploadStore.clearCompletedTasks();
};

const handleFilterChange = (filter: TaskFilter) => {
  taskFilter.value = filter;
};

const toggleExpand = (taskId: string) => {
  uploadStore.toggleTaskExpanded(taskId);
};

// 移动端拖拽关闭
const handleTouchStart = (e: TouchEvent) => {
  if (!isMobile.value) return;
  isDragging.value = true;
  dragStartY.value = e.touches[0]?.clientY ?? 0;
  currentTranslateY.value = 0;
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || !isMobile.value) return;
  const touch = e.touches[0];
  if (!touch) return;
  const deltaY = touch.clientY - dragStartY.value;
  if (deltaY > 0) {
    currentTranslateY.value = deltaY;
  }
};

const handleTouchEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (currentTranslateY.value > 100) {
    uploadStore.hidePanel();
  }
  currentTranslateY.value = 0;
};

// 点击外部关闭
const handleBackdropClick = () => {
  uploadStore.hidePanel();
};

// 获取任务类型显示文本
const getTaskTypeText = (task: BatchUploadTask): string => {
  if (task.targetType === 'gallery') return '图集';
  if (task.targetType === 'album') return '专辑';
  return '文件';
};

// 获取进度条颜色
const getProgressColor = (task: BatchUploadTask): string => {
  switch (task.status) {
    case 'success': return 'bg-green-500';
    case 'error': return 'bg-red-500';
    case 'partial_success': return 'bg-yellow-500';
    case 'cancelled': return 'bg-gray-500';
    case 'paused': return 'bg-orange-500';
    default: return 'bg-blue-500';
  }
};

// 获取文件状态颜色
const getFileStatusColor = (status: string): string => {
  switch (status) {
    case 'success': return 'text-green-400';
    case 'error': return 'text-red-400';
    case 'cancelled': return 'text-gray-400';
    case 'paused': return 'text-orange-400';
    case 'uploading': return 'text-blue-400';
    default: return 'text-yellow-400';
  }
};

const getCreatedAtText = (task: BatchUploadTask): string => {
  return new Date(task.createdAt).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const shouldShowFileProgressBar = (file: FileUploadInfo): boolean => {
  return file.status === 'uploading' || file.status === 'success';
};

const getFileProgressWidth = (file: FileUploadInfo): number => {
  if (file.status === 'success') return 100;
  if (file.status === 'uploading') return file.progress;
  return 0;
};

const getFileProgressText = (file: FileUploadInfo): string => {
  switch (file.status) {
    case 'uploading':
      return `${file.progress}%`;
    case 'pending':
      return '等待中';
    case 'paused':
      return '已暂停';
    case 'success':
      return '完成';
    case 'error':
      return '失败';
    case 'cancelled':
      return '已取消';
    default:
      return getStatusText(file.status);
  }
};

const getFilterButtonClass = (filter: TaskFilter, active: boolean): string => {
  const classMap: Record<TaskFilter, { active: string; inactive: string }> = {
    all: {
      active: 'border-[#c9c9c9]/40 bg-white/10 text-[#f3f3f3]',
      inactive: 'border-[#c9c9c9]/10 bg-white/5 text-[#888] hover:text-[#c9c9c9]',
    },
    uploading: {
      active: 'border-blue-400/40 bg-blue-400/15 text-blue-300',
      inactive: 'border-blue-400/15 bg-blue-400/8 text-blue-200/80 hover:text-blue-200',
    },
    paused: {
      active: 'border-orange-400/40 bg-orange-400/15 text-orange-300',
      inactive: 'border-orange-400/15 bg-orange-400/8 text-orange-200/80 hover:text-orange-200',
    },
    success: {
      active: 'border-green-400/40 bg-green-400/15 text-green-300',
      inactive: 'border-green-400/15 bg-green-400/8 text-green-200/80 hover:text-green-200',
    },
    partial_success: {
      active: 'border-yellow-400/40 bg-yellow-400/15 text-yellow-300',
      inactive: 'border-yellow-400/15 bg-yellow-400/8 text-yellow-200/80 hover:text-yellow-200',
    },
    error: {
      active: 'border-red-400/40 bg-red-400/15 text-red-300',
      inactive: 'border-red-400/15 bg-red-400/8 text-red-200/80 hover:text-red-200',
    },
    cancelled: {
      active: 'border-gray-300/35 bg-gray-400/15 text-gray-200',
      inactive: 'border-gray-300/10 bg-gray-400/8 text-gray-300/80 hover:text-gray-200',
    },
  };

  return active ? classMap[filter].active : classMap[filter].inactive;
};
</script>

<template>
  <!-- 遮罩层（仅移动端显示） -->
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="panelState.isVisible"
        class="fixed inset-0 bg-black/60 z-9998"
        @click="handleBackdropClick"
      />
    </Transition>

    <!-- 上传面板 -->
    <Transition :name="isMobile ? 'slide-up' : 'slide-left'">
      <div
        v-if="panelState.isVisible"
        :class="[
          'fixed z-9999 bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 shadow-2xl overflow-hidden flex flex-col',
          isMobile 
            ? 'bottom-0 left-0 right-0 rounded-t-2xl h-[96vh] max-h-[96vh]'
            : 'top-4 right-4 h-[calc(100vh-2rem)] w-[min(48rem,72vw)] rounded-2xl'
        ]"
        :style="isMobile && isDragging ? { transform: `translateY(${currentTranslateY}px)` } : {}"
      >
        <!-- 头部 -->
        <div 
          class="flex items-center justify-between px-4 py-3 border-b border-[#c9c9c9]/20 bg-[rgb(50,0,0)]"
          :class="isMobile ? 'cursor-grab active:cursor-grabbing' : ''"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <div class="flex items-center gap-3">
            <!-- 移动端拖拽指示器 -->
            <div v-if="isMobile" class="w-12 h-1 bg-[#c9c9c9]/30 rounded-full mx-auto absolute top-2 left-1/2 -translate-x-1/2" />
            
            <h3 class="text-[#c9c9c9] font-semibold" :class="isMobile ? 'mt-2' : ''">
              任务列表
              <span v-if="hasTasks" class="text-sm text-[#888] font-normal ml-2">
                ({{ listedTasks.length }})
              </span>
            </h3>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- 取消全部按钮 -->
            <button
              v-if="activeTaskCount > 0"
              @click="handleCancelAll"
              class="px-2 py-1 text-xs text-red-300 hover:bg-red-300/10 rounded transition-colors"
            >
              取消全部
            </button>
            
            <!-- 清空已完成按钮 -->
            <button
              v-if="clearableTaskCount > 0"
              @click="handleClearCompleted"
              class="px-2 py-1 text-xs text-[#888] hover:bg-white/5 rounded transition-colors"
            >
              清空
            </button>
            
            <!-- 关闭按钮 -->
            <button
              @click="uploadStore.hidePanel"
              class="p-1.5 text-[#888] hover:text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="hasTasks" class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#c9c9c9]/10 bg-black/10">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            @click="handleFilterChange(option.value)"
            :class="[
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors',
              getFilterButtonClass(option.value, taskFilter === option.value)
            ]"
          >
            <span>{{ option.label }}</span>
            <span class="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] text-inherit">{{ option.count }}</span>
          </button>
        </div>

        <!-- 任务列表 -->
        <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <div v-if="!hasTasks" class="text-center py-8 text-[#888]">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p>暂无上传任务</p>
          </div>

          <div v-else-if="!hasVisibleTasks" class="text-center py-8 text-[#888]">
            <p>当前筛选下暂无任务</p>
          </div>

          <div
            v-for="task in visibleTasks"
            :key="task.id"
            class="bg-[rgb(50,0,0)] rounded-lg border border-[#c9c9c9]/10 overflow-hidden"
          >
            <!-- 任务头部（可点击展开） -->
            <div 
              class="p-3 cursor-pointer hover:bg-white/5 transition-colors"
              @click="toggleExpand(task.id)"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs px-1.5 py-0.5 bg-[#c9c9c9]/10 rounded text-[#888]">
                      {{ getTaskTypeText(task) }}
                    </span>
                    <p class="text-[#c9c9c9] text-sm font-medium truncate" :title="task.targetName">
                      {{ task.targetName }}
                    </p>
                  </div>
                  <p class="text-xs text-[#888] mt-1">
                    {{ task.successCount }}/{{ task.totalCount }} 个文件
                    <span class="ml-2">创建于 {{ getCreatedAtText(task) }}</span>
                    <span v-if="task.errorCount > 0" class="text-red-400 ml-1">
                      ({{ task.errorCount }} 个失败)
                    </span>
                  </p>
                </div>
                
                <div class="flex items-center gap-2">
                  <!-- 状态标签 -->
                  <span :class="['text-xs font-medium', getStatusColor(task.status)]">
                    {{ getStatusText(task.status) }}
                  </span>
                  
                  <!-- 展开/折叠图标 -->
                  <svg 
                    class="w-4 h-4 text-[#888] transition-transform"
                    :class="uploadStore.isTaskExpanded(task.id) ? 'rotate-180' : ''"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </div>

              <!-- 总体进度条 -->
              <div class="flex items-center gap-3">
                <div class="flex-1 h-2 bg-[#c9c9c9]/10 rounded-full overflow-hidden">
                  <div
                    :class="['h-full transition-all duration-300', getProgressColor(task)]"
                    :style="{ width: `${task.totalProgress}%` }"
                  />
                </div>
                <span class="text-xs text-[#888] w-10 text-right">{{ task.totalProgress }}%</span>
              </div>
            </div>

            <!-- 文件详情列表（展开时显示） -->
            <div 
              v-if="uploadStore.isTaskExpanded(task.id)"
              class="border-t border-[#c9c9c9]/10 bg-black/20"
            >
              <div 
                v-for="file in task.files" 
                :key="file.id"
                class="px-3 py-2 flex items-center gap-3 border-b border-[#c9c9c9]/5 last:border-0"
              >
                <!-- 文件状态图标 -->
                <div class="w-5 h-5 flex items-center justify-center">
                  <svg 
                    v-if="file.status === 'success'"
                    class="w-4 h-4 text-green-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <svg 
                    v-else-if="file.status === 'error'"
                    class="w-4 h-4 text-red-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  <svg 
                    v-else-if="file.status === 'uploading'"
                    class="w-4 h-4 text-blue-400 animate-spin" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <div 
                    v-else
                    class="w-2 h-2 rounded-full"
                    :class="getFileStatusColor(file.status).replace('text-', 'bg-')"
                  />
                </div>

                <!-- 文件名和大小 -->
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-[#c9c9c9] truncate" :title="file.fileName">
                    {{ file.fileName }}
                  </p>
                  <p class="text-[10px] text-[#888]">{{ formatFileSize(file.fileSize) }}</p>
                </div>

                <!-- 文件进度 -->
                <div class="w-20 shrink-0">
                  <div v-if="shouldShowFileProgressBar(file)" class="h-1 bg-[#c9c9c9]/10 rounded-full overflow-hidden">
                    <div
                      :class="['h-full transition-all', getFileStatusColor(file.status).replace('text-', 'bg-')]"
                      :style="{ width: `${getFileProgressWidth(file)}%` }"
                    />
                  </div>
                  <p class="text-[10px] text-right mt-0.5" :class="file.status === 'uploading' ? 'text-blue-300' : 'text-[#888]'">
                    {{ getFileProgressText(file) }}
                  </p>
                </div>

                <!-- 错误提示 -->
                <div v-if="file.error" class="group relative">
                  <svg class="w-4 h-4 text-red-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div class="absolute right-0 bottom-full mb-2 w-48 p-2 bg-[rgb(40,0,0)] border border-red-400/30 rounded text-xs text-red-300 hidden group-hover:block z-10">
                    {{ file.error }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="px-3 py-2 border-t border-[#c9c9c9]/10 flex items-center justify-end gap-1">
              <!-- 暂停/恢复按钮 -->
              <button
                v-if="task.status === 'uploading'"
                @click="handlePause(task)"
                class="px-2 py-1 text-xs text-[#888] hover:text-orange-400 hover:bg-white/5 rounded transition-colors flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"/>
                </svg>
                暂停
              </button>
              
              <button
                v-if="task.status === 'paused'"
                @click="handleResume(task)"
                class="px-2 py-1 text-xs text-[#888] hover:text-green-400 hover:bg-white/5 rounded transition-colors flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                </svg>
                恢复
              </button>
              
              <!-- 重试按钮 -->
              <button
                v-if="task.status === 'error' || task.status === 'partial_success'"
                @click="handleRetry(task)"
                class="px-2 py-1 text-xs text-[#888] hover:text-blue-400 hover:bg-white/5 rounded transition-colors flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                重试
              </button>
              
              <!-- 取消按钮 -->
              <button
                v-if="task.status === 'uploading' || task.status === 'paused'"
                @click="handleCancel(task)"
                class="px-2 py-1 text-xs text-[#888] hover:text-red-400 hover:bg-white/5 rounded transition-colors flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                取消
              </button>
            </div>
          </div>
        </div>

        <!-- 底部统计 -->
        <div v-if="hasTasks" class="px-4 py-2 border-t border-[#c9c9c9]/20 bg-[rgb(50,0,0)] text-xs text-[#888]">
          <div class="flex items-center justify-between">
            <span>进行中: {{ activeTaskCount }}</span>
            <span class="text-green-400">成功: {{ completedTaskCount }}</span>
            <span v-if="partialSuccessTaskCount > 0" class="text-yellow-400">部分成功: {{ partialSuccessTaskCount }}</span>
            <span v-if="errorTaskCount > 0" class="text-red-400">失败: {{ errorTaskCount }}</span>
            <span v-if="cancelledTaskCount > 0" class="text-[#aaa]">取消: {{ cancelledTaskCount }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 从右侧滑入（电脑端） */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* 从底部滑入（手机端） */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(100%);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* 缩放动画 */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.2s ease;
}
.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(201, 201, 201, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 201, 201, 0.2);
}
</style>
