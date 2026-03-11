import { ref, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import {
  acquireEditLock,
  findConflictingEditLock,
  forceAcquireEditLock,
  formatEditLockDateTime,
  releaseEditLock,
  type EditLockRecord,
} from '@/lib/editLock';

export interface UseEditLockOptions {
  collection: string;
  recordId: Ref<string | null>;
  isEdit: Ref<boolean>;
}

export function useEditLock(options: UseEditLockOptions) {
  const { collection, recordId, isEdit } = options;

  // 状态
  const currentLockId = ref<string | null>(null);
  const conflictingLock = ref<EditLockRecord | null>(null);
  const lockWarning = ref('');
  const takingOverLock = ref(false);
  const showEditLockConflictDialog = ref(false);
  const editLockConflictMessage = ref('');
  let editLockConflictResolver: ((force: boolean) => void) | null = null;
  let isDisposed = false;

  // 生成锁警告消息
  const getLockWarningMessage = (lock?: EditLockRecord | null, fallbackUsername?: string): string => {
    const lockingUser = lock?.username?.trim() || fallbackUsername || '未知用户';
    const lockedAt = formatEditLockDateTime(lock?.created || lock?.updated);
    return `当前记录正在由 ${lockingUser} 编辑，加锁时间：${lockedAt}。`;
  };

  // 设置冲突锁状态
  const setConflictingLockState = (lock: EditLockRecord | null, fallbackUsername?: string) => {
    conflictingLock.value = lock;
    lockWarning.value = lock || fallbackUsername ? getLockWarningMessage(lock, fallbackUsername) : '';
  };

  // 请求编辑锁冲突解决
  const requestEditLockConflictResolution = (message?: string): Promise<boolean> => {
    editLockConflictMessage.value = message || '仍有其他终端正在编辑此页面，请稍后再试。';
    showEditLockConflictDialog.value = true;
    return new Promise(resolve => {
      editLockConflictResolver = resolve;
    });
  };

  // 解决编辑锁冲突
  const resolveEditLockConflict = (force: boolean) => {
    showEditLockConflictDialog.value = false;
    const resolver = editLockConflictResolver;
    editLockConflictResolver = null;
    resolver?.(force);
  };

  // 创建编辑锁
  const createEditLock = async (): Promise<boolean> => {
    if (!isEdit.value) return true;
    if (!recordId.value) return true;
    if (currentLockId.value) return true;

    try {
      const result = await acquireEditLock(collection, recordId.value);
      if (!result.ok) {
        setConflictingLockState(result.conflictingLock || null, result.lockingUser);
        return false;
      }

      if (isDisposed && result.lockId) {
        await releaseEditLock(result.lockId);
        return false;
      }

      currentLockId.value = result.lockId || null;
      setConflictingLockState(null);
      return true;
    } catch (err) {
      console.error('Failed to create edit lock:', err);
      return true;
    }
  };

  // 删除编辑锁
  const removeEditLock = async () => {
    if (currentLockId.value) {
      try {
        await releaseEditLock(currentLockId.value);
      } catch (err) {
        console.error('Failed to remove edit lock:', err);
      }
      currentLockId.value = null;
    }
    setConflictingLockState(null);
  };

  // 检查编辑锁
  const checkEditLock = async (): Promise<string | null> => {
    if (!isEdit.value || !recordId.value) return null;

    try {
      const lock = await findConflictingEditLock(collection, recordId.value, currentLockId.value);
      if (lock) {
        setConflictingLockState(lock);
        return getLockWarningMessage(lock);
      }
      setConflictingLockState(null);
      return null;
    } catch (err) {
      console.error('Failed to check edit lock:', err);
      return null;
    }
  };

  // 确保有编辑锁
  const ensureEditLock = async (): Promise<boolean> => {
    if (!isEdit.value || currentLockId.value) return true;
    return createEditLock();
  };

  // 强行接管编辑锁
  const forceTakeoverEditLock = async (): Promise<boolean> => {
    if (!isEdit.value || !recordId.value) return true;

    try {
      const result = await forceAcquireEditLock(collection, recordId.value, currentLockId.value);
      if (!result.ok || !result.lockId) {
        return false;
      }
      currentLockId.value = result.lockId;
      setConflictingLockState(null);
      return true;
    } catch (err) {
      console.error('Failed to force acquire edit lock:', err);
      return false;
    }
  };

  // 接管冲突的编辑锁
  const takeOverConflictingEditLock = async () => {
    if (takingOverLock.value || currentLockId.value) return;
    takingOverLock.value = true;
    try {
      await forceTakeoverEditLock();
    } finally {
      takingOverLock.value = false;
    }
  };

  // 清理资源
  const dispose = async () => {
    isDisposed = true;
    await removeEditLock();
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    void dispose();
  });

  return {
    // 状态
    currentLockId,
    conflictingLock,
    lockWarning,
    takingOverLock,
    showEditLockConflictDialog,
    editLockConflictMessage,

    // 方法
    createEditLock,
    removeEditLock,
    checkEditLock,
    ensureEditLock,
    forceTakeoverEditLock,
    takeOverConflictingEditLock,
    requestEditLockConflictResolution,
    resolveEditLockConflict,

    // 清理
    dispose,
  };
}
