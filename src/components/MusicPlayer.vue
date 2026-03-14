<script setup lang="ts">
  import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
  import { useMusicPlayer } from '@/composables/useMusicPlayer';
  import AppIcon from './AppIcon.vue';

  const {
    currentSong,
    currentMusicData,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    progress,
    error,
    togglePlay,
    stop,
    seek,
    formatTime,
  } = useMusicPlayer();

  const progressRef = ref<HTMLElement | null>(null);
  const isDragging = ref(false);
  const dragProgress = ref(0); // 拖动时的进度预览

  // 计算鼠标位置对应的进度
  const getProgressFromEvent = (e: MouseEvent): number => {
    if (!progressRef.value || duration.value === 0) return 0;
    const rect = progressRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(100, (x / rect.width) * 100));
  };

  // 点击进度条跳转
  const handleProgressClick = (e: MouseEvent) => {
    if (duration.value === 0) return;
    const percentage = getProgressFromEvent(e) / 100;
    const time = percentage * duration.value;
    seek(time);
  };

  // 开始拖动
  const startDrag = (e: MouseEvent) => {
    isDragging.value = true;
    dragProgress.value = getProgressFromEvent(e);
  };

  // 拖动中
  const onDrag = (e: MouseEvent) => {
    if (isDragging.value) {
      dragProgress.value = getProgressFromEvent(e);
    }
  };

  // 结束拖动
  const endDrag = () => {
    if (isDragging.value && duration.value > 0) {
      const time = (dragProgress.value / 100) * duration.value;
      seek(time);
    }
    isDragging.value = false;
  };

  // 显示的进度：拖动时显示拖动进度，否则显示实际播放进度
  const displayProgress = computed(() => (isDragging.value ? dragProgress.value : progress.value));

  onMounted(() => {
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
  });

  onUnmounted(() => {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    // 移除播放器类
    document.body.classList.remove('has-music-player');
  });

  // 监听是否有音乐在播放
  const shouldShowPlayer = computed(() => {
    return currentSong.value && currentMusicData.value;
  });

  // 监听播放器显示状态，动态添加/移除 body 类
  watch(shouldShowPlayer, show => {
    if (show) {
      document.body.classList.add('has-music-player');
    } else {
      document.body.classList.remove('has-music-player');
    }
  });
</script>

<template>
  <Teleport to="body">
    <!-- 迷你播放器 -->
    <Transition name="slide-up">
      <div
        v-if="shouldShowPlayer"
        class="fixed bottom-0 left-0 right-0 z-50 bg-[rgb(40,0,0)]/95 backdrop-blur-md border-t border-red-300/20 shadow-2xl"
      >
        <!-- 进度条 -->
        <div ref="progressRef" class="h-1 bg-[#c9c9c9]/20 cursor-pointer group select-none" @mousedown="startDrag">
          <div class="h-full bg-red-400 relative" :class="{ 'transition-all': !isDragging }" :style="{ width: `${displayProgress}%` }">
            <div
              class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            ></div>
          </div>
        </div>

        <!-- 播放器主体 -->
        <div class="px-6 py-4 flex items-center gap-4 max-w-7xl mx-auto">
          <!-- 封面 -->
          <div class="shrink-0 w-12 h-12 rounded overflow-hidden shadow-lg">
            <img
              v-if="currentMusicData?.cover"
              :src="currentMusicData.cover"
              :alt="currentMusicData.name"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-gradient-to-br from-red-900 to-red-950 flex items-center justify-center"
            >
              <AppIcon name="music-note" class-name="w-6 h-6 text-red-300/50" />
            </div>
          </div>

          <!-- 歌曲信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <div class="text-[#c9c9c9] font-medium truncate text-sm">
                {{ currentMusicData?.name || currentSong?.title }}
              </div>
              <!-- 平台图标 -->
              <AppIcon
                v-if="currentMusicData?.platform === 'qq'"
                name="qq-music"
                class-name="w-4 h-4 text-[#c9c9c9]/50 shrink-0"
              />
              <AppIcon
                v-else-if="currentMusicData?.platform === 'netease'"
                name="netease"
                class-name="w-4 h-4 text-[#c9c9c9]/50 shrink-0"
              />
            </div>
            <div class="text-[#c9c9c9]/60 text-xs truncate mt-0.5">
              {{ currentMusicData?.artists?.join(' / ') || '' }}
            </div>
          </div>

          <!-- 时间显示 -->
          <div class="text-[#c9c9c9]/60 text-xs tabular-nums shrink-0">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </div>

          <!-- 控制按钮 -->
          <div class="flex items-center gap-3">
            <!-- 播放/暂停 -->
            <button
              @click="togglePlay"
              class="w-10 h-10 rounded-full bg-red-400/20 hover:bg-red-400/30 flex items-center justify-center transition-colors"
              :disabled="isLoading"
            >
              <div
                v-if="isLoading"
                class="w-5 h-5 border-2 border-red-300 border-t-transparent rounded-full animate-spin"
              ></div>
              <AppIcon v-else :name="isPlaying ? 'pause' : 'play'" class-name="w-5 h-5 text-red-300" />
            </button>

            <!-- 关闭 -->
            <button
              @click="stop"
              class="w-8 h-8 rounded-full hover:bg-[#c9c9c9]/10 flex items-center justify-center transition-colors"
            >
              <AppIcon name="close" class-name="w-4 h-4 text-[#c9c9c9]/60" />
            </button>
          </div>
        </div>

        <!-- 错误提示 -->
        <Transition name="fade">
          <div
            v-if="error"
            class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-2 bg-red-900/90 backdrop-blur-sm rounded-lg text-red-300 text-sm whitespace-nowrap shadow-xl"
          >
            {{ error }}
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: transform 0.3s ease;
  }

  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateY(100%);
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
