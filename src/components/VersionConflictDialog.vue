<script setup lang="ts">
  import AppIcon from '@/components/AppIcon.vue';

  const props = defineProps<{
    visible: boolean;
    title: string;
    latestEditPath?: string;
    originalUpdated?: string | null;
    latestUpdated?: string | null;
    secondaryWarning?: string | null;
  }>();

  const emit = defineEmits<{
    (event: 'cancel'): void;
    (event: 'force'): void;
  }>();

  const formatDateTime = (value?: string | null): string => {
    if (!value) return '未知';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-10020 flex items-center justify-center bg-black/70 px-4"
        @click.self="emit('cancel')"
      >
        <div
          class="w-full max-w-lg rounded-2xl border border-yellow-500/30 bg-[rgb(60,0,0)] shadow-2xl overflow-hidden"
        >
          <div class="border-b border-[#c9c9c9]/10 bg-black/10 px-6 py-4">
            <h3 class="text-lg font-semibold text-[#f3d38a]">发现版本冲突</h3>
            <p class="mt-2 text-sm text-[#c9c9c9]">
              {{ title }}在你编辑期间已经被更新。
              <span v-if="props.latestEditPath">你可以先打开最新页面参考，再决定是否强行覆盖。</span>
              <span v-else>请先确认差异，再决定是否强行覆盖。</span>
            </p>
          </div>

          <div class="space-y-4 px-6 py-5 text-sm text-[#c9c9c9]">
            <div class="rounded-xl border border-[#c9c9c9]/10 bg-black/10 p-4 space-y-2">
              <p class="flex items-center justify-between gap-4">
                <span class="text-[#888]">你进入编辑页时的版本</span>
                <span>{{ formatDateTime(props.originalUpdated) }}</span>
              </p>
              <p class="flex items-center justify-between gap-4">
                <span class="text-[#888]">服务端当前版本</span>
                <span class="text-yellow-300">{{ formatDateTime(props.latestUpdated) }}</span>
              </p>
            </div>

            <div class="rounded-xl border border-yellow-500/20 bg-yellow-500/8 p-4 text-yellow-100/90 leading-6">
              继续强行覆盖可能会覆盖掉别人刚刚保存的内容。
            </div>

            <div
              v-if="props.secondaryWarning"
              class="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-red-200 leading-6"
            >
              {{ props.secondaryWarning }}
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3 border-t border-[#c9c9c9]/10 px-6 py-4 bg-black/10">
            <a
              v-if="props.latestEditPath"
              :href="props.latestEditPath"
              target="_blank"
              rel="noopener noreferrer"
              class="mr-auto inline-flex items-center gap-2 rounded-lg border border-[#c9c9c9]/20 px-4 py-2 text-sm text-[#c9c9c9] hover:border-red-300/40 hover:text-red-300 hover:bg-white/5 transition-colors"
            >
              <AppIcon name="external-link" class-name="h-4 w-4" />
              打开最新页面
            </a>

            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm text-[#c9c9c9] hover:bg-white/5 transition-colors"
              @click="emit('cancel')"
            >
              取消提交
            </button>
            <button
              type="button"
              class="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-[rgb(77,0,0)] hover:bg-yellow-300 transition-colors"
              @click="emit('force')"
            >
              强行覆盖
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
