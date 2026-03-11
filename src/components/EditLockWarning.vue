<script setup lang="ts">
  import type { EditLockRecord } from '@/lib/editLock';
  import { formatEditLockDateTime } from '@/lib/editLock';
  import AppIcon from './AppIcon.vue';

  defineProps<{
    lockWarning: string;
    conflictingLock: EditLockRecord | null;
    currentLockId: string | null;
    takingOverLock: boolean;
    saving: boolean;
  }>();

  defineEmits<{
    takeOverLock: [];
  }>();
</script>

<template>
  <div v-if="lockWarning" class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-3">
    <p class="text-yellow-400 flex items-center gap-2">
      <AppIcon name="warning" class-name="w-5 h-5 shrink-0" />
      <span>{{ lockWarning }}</span>
    </p>
    <div v-if="conflictingLock" class="space-y-1 pl-7 text-sm text-yellow-100/85">
      <p>
        <span class="text-[#888]">锁用户：</span>
        <span>{{ conflictingLock.username || '未知用户' }}</span>
      </p>
      <p>
        <span class="text-[#888]">加锁时间：</span>
        <span>{{ formatEditLockDateTime(conflictingLock.created || conflictingLock.updated) }}</span>
      </p>
    </div>
    <div v-if="!currentLockId" class="pl-7">
      <button
        type="button"
        class="rounded-lg border border-yellow-400/40 px-4 py-2 text-sm text-yellow-100 hover:bg-yellow-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="takingOverLock || saving"
        @click="$emit('takeOverLock')"
      >
        {{ takingOverLock ? '正在移除原有锁...' : '移除原有锁并继续编辑' }}
      </button>
    </div>
  </div>
</template>
