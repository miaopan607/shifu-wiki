import { computed, ref, type Ref } from 'vue';
import type {
  BatchUploadTask,
  CreateBatchTaskParams,
  FileUploadInfo,
  FileUploadStatus,
  GlobalUploadPanelState,
  UploadStats,
} from '@/types/upload';
import {
  createBatchUploadTask,
  isTaskActive,
  isTaskCompleted,
  uploadFileWithXHR,
  updateTaskStats,
} from '@/lib/uploadManager';
import { cancelUploadBatch, completeUploadBatch, createUploadBatch } from '@/lib/uploadBatches';
import { releaseEditLock } from '@/lib/editLock';
import { pb } from '@/lib/pocketbase';

type ActiveRequest = {
  taskId: string;
  abort: () => void;
};

const MAX_CONCURRENT_UPLOADS_STORAGE_KEY = 'admin-max-concurrent-uploads';
const DEFAULT_MAX_CONCURRENT_UPLOADS = 2;
const MAX_CONCURRENT_UPLOADS_LIMIT = 50;

function loadMaxConcurrentUploads(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_MAX_CONCURRENT_UPLOADS;
  }

  const rawValue = window.localStorage.getItem(MAX_CONCURRENT_UPLOADS_STORAGE_KEY);
  const parsedValue = Number(rawValue);
  if (!Number.isInteger(parsedValue)) {
    return DEFAULT_MAX_CONCURRENT_UPLOADS;
  }

  return Math.min(MAX_CONCURRENT_UPLOADS_LIMIT, Math.max(1, parsedValue));
}

const tasks: Ref<BatchUploadTask[]> = ref([]);
const isProcessing = ref(false);
const currentTaskId = ref<string | undefined>(undefined);
const activeRequests = new Map<string, ActiveRequest>();
const batchCreationPromises = new Map<string, Promise<string>>();
const maxConcurrentUploads = ref(loadMaxConcurrentUploads());
const panelState: Ref<GlobalUploadPanelState> = ref({
  isVisible: false,
  isMinimized: false,
  hasNewFinishedTasks: false,
  expandedTasks: new Set(),
});

const activeTasks = computed(() => tasks.value.filter(task => isTaskActive(task)));
const completedTasks = computed(() => tasks.value.filter(task => isTaskCompleted(task)));
const hasActiveTasks = computed(() => activeTasks.value.length > 0);
const hasUnsavedTasks = computed(() => tasks.value.some(task => task.status === 'pending'));
const hasBlockingTasks = computed(() =>
  tasks.value.some(task => task.status === 'pending' || task.status === 'uploading' || task.status === 'paused')
);

const stats = computed<UploadStats>(() => {
  const totalFiles = tasks.value.reduce((sum, task) => sum + task.files.length, 0);
  const uploadedFiles = tasks.value.reduce((sum, task) => sum + task.successCount, 0);
  const failedFiles = tasks.value.reduce((sum, task) => sum + task.errorCount, 0);

  return {
    totalTasks: tasks.value.length,
    activeTasks: activeTasks.value.length,
    completedTasks: completedTasks.value.length,
    totalFiles,
    uploadedFiles,
    failedFiles,
  };
});

const totalProgress = computed(() => {
  if (tasks.value.length === 0) return 0;
  const total = tasks.value.reduce((sum, task) => sum + task.totalProgress, 0);
  return Math.round(total / tasks.value.length);
});

function getTask(taskId: string): BatchUploadTask | undefined {
  return tasks.value.find(task => task.id === taskId);
}

function taskUsesRemoteUploadBatch(task: BatchUploadTask): boolean {
  return task.type === 'gallery_images' || task.type === 'song_covers' || task.type === 'album_covers';
}

function getActiveRequestCount(taskId?: string): number {
  let count = 0;
  for (const request of activeRequests.values()) {
    if (!taskId || request.taskId === taskId) {
      count += 1;
    }
  }
  return count;
}

function refreshSchedulerState(): void {
  const nextQueuedTask = tasks.value.find(
    task => task.status === 'uploading' && task.files.some(file => file.status === 'pending')
  );
  const activeRequest = activeRequests.values().next().value as ActiveRequest | undefined;

  isProcessing.value = activeRequests.size > 0 || Boolean(nextQueuedTask);
  currentTaskId.value = activeRequest?.taskId ?? nextQueuedTask?.id;
}

function releaseTaskLock(task: BatchUploadTask): void {
  if (!task.lockId) return;

  const lockId = task.lockId;
  task.lockId = undefined;
  task.lockCollection = undefined;
  void releaseEditLock(lockId).catch(error => {
    console.error('Failed to release task edit lock:', error);
  });
}

function finalizeTaskIfCompleted(task: BatchUploadTask): void {
  if (isTaskCompleted(task)) {
    releaseTaskLock(task);
  }
}

function removeTask(taskId: string): void {
  const task = getTask(taskId);
  if (task) {
    releaseTaskLock(task);
  }
  batchCreationPromises.delete(taskId);
  tasks.value = tasks.value.filter(task => task.id !== taskId);
  panelState.value.expandedTasks.delete(taskId);
  if (currentTaskId.value === taskId) {
    currentTaskId.value = undefined;
  }
}

function addBatchTask(params: CreateBatchTaskParams): BatchUploadTask {
  const task = createBatchUploadTask(params);
  tasks.value.push(task);
  return task;
}

function appendFilesToTask(
  taskId: string,
  params: Pick<CreateBatchTaskParams, 'files' | 'sorts' | 'clientIds'>
): FileUploadInfo[] {
  const task = getTask(taskId);
  if (!task) return [];

  const appendedFiles = createBatchUploadTask({
    type: task.type,
    targetId: task.targetId,
    targetType: task.targetType,
    targetName: task.targetName,
    files: params.files,
    sorts: params.sorts,
    clientIds: params.clientIds,
  }).files;

  task.files.push(...appendedFiles);
  task.totalCount = task.files.length;
  updateTaskStats(task);
  return appendedFiles;
}

function replaceTaskFiles(
  taskId: string,
  params: Pick<CreateBatchTaskParams, 'files' | 'sorts' | 'clientIds'>
): FileUploadInfo[] {
  const task = getTask(taskId);
  if (!task) return [];

  abortActiveRequests(taskId);

  task.files = createBatchUploadTask({
    type: task.type,
    targetId: task.targetId,
    targetType: task.targetType,
    targetName: task.targetName,
    files: params.files,
    sorts: params.sorts,
    clientIds: params.clientIds,
  }).files;
  task.status = 'pending';
  task.startedAt = undefined;
  task.completedAt = undefined;
  task.totalProgress = 0;
  task.successCount = 0;
  task.errorCount = 0;
  task.totalCount = task.files.length;
  updateTaskStats(task);
  return task.files;
}

function removeFileFromTask(taskId: string, fileId: string): void {
  const task = getTask(taskId);
  if (!task) return;

  const nextFiles = task.files.filter(file => file.id !== fileId);
  if (nextFiles.length === task.files.length) {
    return;
  }

  task.files = nextFiles;
  task.totalCount = task.files.length;
  if (task.files.length === 0) {
    removeTask(taskId);
    return;
  }

  updateTaskStats(task);
}

function discardTask(taskId: string): void {
  abortActiveRequests(taskId);
  batchCreationPromises.delete(taskId);
  removeTask(taskId);
  refreshSchedulerState();
}

function attachTaskLock(
  taskId: string,
  lockId: string,
  lockCollection: 'galleries' | 'songs' | 'albums'
): void {
  const task = getTask(taskId);
  if (!task) return;

  task.lockId = lockId;
  task.lockCollection = lockCollection;
}

function findTaskByTargetId(
  targetId: string,
  targetType: 'gallery' | 'song' | 'album'
): BatchUploadTask | undefined {
  return tasks.value.find(task => task.targetId === targetId && task.targetType === targetType);
}

function startPendingTasks(targetId: string, targetType: 'gallery' | 'song' | 'album'): void {
  tasks.value.forEach(task => {
    if (
      task.targetType === targetType &&
      (task.targetId === targetId || task.targetId === 'new') &&
      task.status === 'pending'
    ) {
      if (taskUsesRemoteUploadBatch(task) && task.targetId !== targetId) {
        task.serverBatchId = undefined;
      }
      task.targetId = targetId;
      task.status = 'uploading';
      task.startedAt = Date.now();
      task.completedAt = undefined;
      task.files.forEach(file => {
        if (file.status === 'paused') {
          file.status = 'pending';
          file.progress = 0;
        }
      });
    }
  });

  refreshSchedulerState();
  processQueue();
}

function updateFileStatus(
  taskId: string,
  fileId: string,
  status: FileUploadStatus,
  updates?: Partial<FileUploadInfo>
): void {
  const task = getTask(taskId);
  if (!task) return;

  const file = task.files.find(item => item.id === fileId);
  if (!file) return;

  file.status = status;
  if (updates) {
    Object.assign(file, updates);
  }

  updateTaskStats(task);
  finalizeTaskIfCompleted(task);

  if (status === 'success' || status === 'error' || status === 'cancelled') {
    panelState.value.hasNewFinishedTasks = true;
  }

  refreshSchedulerState();
}

function updateFileProgress(taskId: string, fileId: string, progress: number): void {
  const task = getTask(taskId);
  if (!task) return;

  const file = task.files.find(item => item.id === fileId);
  if (!file) return;

  file.progress = progress;
  task.totalProgress = Math.round(task.files.reduce((sum, item) => sum + item.progress, 0) / task.files.length);
  refreshSchedulerState();
}

function abortActiveRequests(taskId: string): void {
  for (const [, request] of activeRequests.entries()) {
    if (request.taskId === taskId) {
      request.abort();
    }
  }
}

async function ensureTaskUploadBatch(task: BatchUploadTask): Promise<string> {
  if (!taskUsesRemoteUploadBatch(task)) {
    throw new Error('当前上传任务不支持远端上传批次');
  }

  if (task.serverBatchId) {
    return task.serverBatchId;
  }

  const existingPromise = batchCreationPromises.get(task.id);
  if (existingPromise) {
    return existingPromise;
  }

  const createPromise = (async () => {
    const response = await createUploadBatch({
      targetType: task.targetType,
      targetId: task.targetId,
      targetName: task.targetName,
    });

    task.serverBatchId = response.id;

    if (task.status === 'cancelled') {
      await cancelUploadBatch(response.id).catch(error => {
        console.error('Failed to cancel upload batch created for a cancelled task:', error);
      });
      throw new Error('上传已取消');
    }

    return response.id;
  })();

  batchCreationPromises.set(task.id, createPromise);

  try {
    return await createPromise;
  } finally {
    batchCreationPromises.delete(task.id);
  }
}

async function rollbackCancelledTaskUploads(task: BatchUploadTask): Promise<void> {
  const serverBatchId = task.serverBatchId;

  if (serverBatchId) {
    await cancelUploadBatch(serverBatchId).catch(error => {
      console.error('Failed to cancel upload batch:', error);
    });
  }

  const collectionName =
    task.type === 'gallery_images' ? 'gallery_images' : task.type === 'song_covers' ? 'song_covers' : null;

  if (collectionName) {
    const uploadedIds = new Set(
      task.files.map(file => file.uploadedRecordId).filter((id): id is string => Boolean(id))
    );

    if (serverBatchId) {
      await pb
        .collection(collectionName)
        .getFullList<{ id: string }>({
          filter: `uploadBatchId = "${serverBatchId}"`,
          fields: 'id',
          requestKey: null,
        })
        .then(records => {
          records.forEach(record => {
            uploadedIds.add(record.id);
          });
        })
        .catch(error => {
          console.error(`Failed to query ${collectionName} by upload batch:`, error);
        });
    }

    if (uploadedIds.size > 0) {
      await Promise.allSettled(Array.from(uploadedIds).map(recordId => pb.collection(collectionName).delete(recordId)));
    }
  }

  task.files.forEach(file => {
    file.uploadedRecordId = undefined;
    file.status = 'cancelled';
    file.progress = 0;
    file.error = undefined;
  });
  task.serverBatchId = undefined;
  updateTaskStats(task);
}

async function finalizeCancelledTask(task: BatchUploadTask): Promise<void> {
  if (task.status !== 'cancelled' || task.isFinalizingCancel) {
    return;
  }

  if (getActiveRequestCount(task.id) > 0 || task.files.some(file => file.status === 'uploading')) {
    return;
  }

  task.isFinalizingCancel = true;

  try {
    if (taskUsesRemoteUploadBatch(task)) {
      await rollbackCancelledTaskUploads(task);
    } else {
      task.files.forEach(file => {
        file.status = 'cancelled';
        file.progress = 0;
        file.error = undefined;
      });
      updateTaskStats(task);
    }

    task.completedAt = task.completedAt ?? Date.now();
    finalizeTaskIfCompleted(task);
  } finally {
    task.isFinalizingCancel = false;
    refreshSchedulerState();
  }
}

function finalizeActiveTask(task: BatchUploadTask): void {
  updateTaskStats(task);

  if (task.files.some(file => file.status === 'pending' || file.status === 'uploading')) {
    refreshSchedulerState();
    return;
  }

  task.completedAt = task.completedAt ?? Date.now();

  if (task.status === 'success' && task.serverBatchId) {
    void completeUploadBatch(task.serverBatchId).catch(error => {
      console.error('Failed to complete upload batch:', error);
    });
  }

  finalizeTaskIfCompleted(task);
  refreshSchedulerState();
}

function pauseTask(taskId: string): void {
  const task = getTask(taskId);
  if (!task || task.status !== 'uploading') return;

  task.status = 'paused';
  task.files.forEach(file => {
    if (file.status === 'uploading') {
      file.status = 'paused';
      file.progress = 0;
      file.error = undefined;
    }
  });
  abortActiveRequests(taskId);
  updateTaskStats(task);
  refreshSchedulerState();
}

function resumeTask(taskId: string): void {
  const task = getTask(taskId);
  if (!task || task.status !== 'paused') return;

  task.files.forEach(file => {
    if (file.status === 'paused') {
      file.status = 'pending';
      file.progress = 0;
      file.error = undefined;
    }
  });
  task.status = 'uploading';
  task.completedAt = undefined;
  updateTaskStats(task);
  refreshSchedulerState();
  processQueue();
}

function cancelTask(taskId: string): void {
  const task = getTask(taskId);
  if (!task) return;

  task.status = 'cancelled';
  task.files.forEach(file => {
    file.status = 'cancelled';
    file.progress = 0;
    file.error = undefined;
  });

  if (task.serverBatchId) {
    void cancelUploadBatch(task.serverBatchId).catch(error => {
      console.error('Failed to cancel upload batch:', error);
    });
  }

  abortActiveRequests(taskId);

  updateTaskStats(task);
  panelState.value.hasNewFinishedTasks = true;
  releaseTaskLock(task);
  refreshSchedulerState();

  void finalizeCancelledTask(task);
}

function cancelAllTasks(): void {
  tasks.value.forEach(task => {
    if (isTaskActive(task)) {
      cancelTask(task.id);
    }
  });
}

function retryTask(taskId: string): void {
  const task = getTask(taskId);
  if (!task) return;

  task.files.forEach(file => {
    if (file.status === 'error') {
      file.status = 'pending';
      file.progress = 0;
      file.error = undefined;
      if (
        task.type === 'gallery_images' ||
        task.type === 'song_covers' ||
        task.type === 'album_covers'
      ) {
        file.uploadedRecordId = undefined;
      }
    }
  });

  task.status = 'uploading';
  task.startedAt = task.startedAt ?? Date.now();
  task.completedAt = undefined;
  task.errorCount = 0;
  if (taskUsesRemoteUploadBatch(task)) {
    task.serverBatchId = undefined;
  }
  updateTaskStats(task);
  refreshSchedulerState();
  processQueue();
}

function clearCompletedTasks(): void {
  tasks.value = tasks.value.filter(task => !isTaskCompleted(task));
  panelState.value.expandedTasks.forEach(taskId => {
    if (!tasks.value.some(task => task.id === taskId)) {
      panelState.value.expandedTasks.delete(taskId);
    }
  });
}

function toggleTaskExpanded(taskId: string): void {
  if (panelState.value.expandedTasks.has(taskId)) {
    panelState.value.expandedTasks.delete(taskId);
  } else {
    panelState.value.expandedTasks.add(taskId);
  }
}

function isTaskExpanded(taskId: string): boolean {
  return panelState.value.expandedTasks.has(taskId);
}

async function processQueue(): Promise<void> {
  refreshSchedulerState();

  while (activeRequests.size < maxConcurrentUploads.value) {
    const nextTask = tasks.value.find(
      task => task.status === 'uploading' && task.files.some(file => file.status === 'pending')
    );
    if (!nextTask) {
      refreshSchedulerState();
      return;
    }

    const nextFile = nextTask.files.find(file => file.status === 'pending');
    if (!nextFile) {
      refreshSchedulerState();
      return;
    }

    activeRequests.set(nextFile.id, {
      taskId: nextTask.id,
      abort: () => undefined,
    });

    void uploadSingleFile(nextTask, nextFile).finally(() => {
      if (nextTask.status === 'cancelled') {
        void finalizeCancelledTask(nextTask).finally(() => {
          void processQueue();
        });
        return;
      }

      finalizeActiveTask(nextTask);
      void processQueue();
    });
  }

  refreshSchedulerState();
}

async function uploadSingleFile(task: BatchUploadTask, fileInfo: FileUploadInfo): Promise<void> {
  const file = fileInfo.file;
  if (!file) {
    updateFileStatus(task.id, fileInfo.id, 'error', {
      error: '文件对象丢失',
      progress: 0,
    });
    return;
  }

  updateFileStatus(task.id, fileInfo.id, 'uploading', {
    error: undefined,
  });

  try {
    const formData = new FormData();
    let uploadBatchId: string | undefined;
    if (taskUsesRemoteUploadBatch(task)) {
      uploadBatchId = await ensureTaskUploadBatch(task);

      if (task.status === 'cancelled') {
        updateFileStatus(task.id, fileInfo.id, 'cancelled', { progress: 0, uploadedRecordId: undefined });
        return;
      }

      if (task.status === 'paused') {
        updateFileStatus(task.id, fileInfo.id, 'paused', { progress: 0, error: undefined });
        return;
      }
    }

    if (task.type === 'gallery_images') {
      formData.append('image', file);
      formData.append('gallery', task.targetId);
      formData.append('uploadBatchId', uploadBatchId || '');
      formData.append('clientUploadId', fileInfo.clientId || fileInfo.id);
      if (fileInfo.sort !== undefined) {
        formData.append('sort', String(fileInfo.sort));
      }
    } else if (task.type === 'song_covers') {
      formData.append('image', file);
      formData.append('song', task.targetId);
      formData.append('uploadBatchId', uploadBatchId || '');
      formData.append('clientUploadId', fileInfo.clientId || fileInfo.id);
      if (fileInfo.sort !== undefined) {
        formData.append('sort', String(fileInfo.sort));
      }
    }

    if (task.status === 'cancelled') {
      updateFileStatus(task.id, fileInfo.id, 'cancelled', { progress: 0, uploadedRecordId: undefined });
      return;
    }

    if (task.status === 'paused') {
      updateFileStatus(task.id, fileInfo.id, 'paused', { progress: 0, error: undefined });
      return;
    }

    const method = 'POST';
    const uploadCollectionName = task.type === 'gallery_images' ? 'gallery_images' : 'song_covers';
    const url = `${pb.baseUrl}/api/collections/${uploadCollectionName}/records`;
    const request = uploadFileWithXHR(
      url,
      formData,
      pb.authStore.token,
      progress => {
        updateFileProgress(task.id, fileInfo.id, progress);
      },
      method
    );

    activeRequests.set(fileInfo.id, {
      taskId: task.id,
      abort: request.abort,
    });

    const response = await request.promise;
    activeRequests.delete(fileInfo.id);
    const latestTask = getTask(task.id) ?? task;

    if (latestTask.status === 'cancelled') {
      const cancelCollectionName =
        latestTask.type === 'gallery_images'
          ? 'gallery_images'
          : latestTask.type === 'song_covers'
            ? 'song_covers'
            : null;
      if (cancelCollectionName && typeof response === 'object' && response && 'id' in response) {
        await pb
          .collection(cancelCollectionName)
          .delete(String((response as { id: string }).id))
          .catch(() => undefined);
      }
      updateFileStatus(task.id, fileInfo.id, 'cancelled', { progress: 0, uploadedRecordId: undefined });
      return;
    }

    if (latestTask.status === 'paused') {
      updateFileStatus(task.id, fileInfo.id, 'paused', { progress: 0 });
      return;
    }

    updateFileStatus(task.id, fileInfo.id, 'success', {
      progress: 100,
      uploadedRecordId:
        typeof response === 'object' && response && 'id' in response
          ? String((response as { id: string }).id)
          : undefined,
    });
  } catch (error) {
    activeRequests.delete(fileInfo.id);
    const latestTask = getTask(task.id) ?? task;

    if (latestTask.status === 'cancelled') {
      updateFileStatus(task.id, fileInfo.id, 'cancelled', { progress: 0, error: undefined });
      return;
    }

    if (latestTask.status === 'paused') {
      updateFileStatus(task.id, fileInfo.id, 'paused', { progress: 0, error: undefined });
      return;
    }

    updateFileStatus(task.id, fileInfo.id, 'error', {
      error: error instanceof Error ? error.message : '上传失败',
      progress: 0,
    });
  } finally {
    activeRequests.delete(fileInfo.id);
    refreshSchedulerState();
  }
}

function setMaxConcurrentUploads(value: number): void {
  const normalizedValue = Math.min(MAX_CONCURRENT_UPLOADS_LIMIT, Math.max(1, Math.round(value)));
  maxConcurrentUploads.value = normalizedValue;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MAX_CONCURRENT_UPLOADS_STORAGE_KEY, String(normalizedValue));
  }
  refreshSchedulerState();
  void processQueue();
}

function showPanel(): void {
  panelState.value.isVisible = true;
  panelState.value.isMinimized = false;
  panelState.value.hasNewFinishedTasks = false;
}

function hidePanel(): void {
  panelState.value.isVisible = false;
}

function togglePanel(): void {
  panelState.value.isVisible = !panelState.value.isVisible;
  if (panelState.value.isVisible) {
    panelState.value.hasNewFinishedTasks = false;
  }
}

function minimizePanel(): void {
  panelState.value.isMinimized = true;
}

function maximizePanel(): void {
  panelState.value.isMinimized = false;
}

export function useUploadStore() {
  return uploadStore;
}

export const uploadStore = {
  tasks,
  isProcessing,
  currentTaskId,
  panelState,
  maxConcurrentUploads,
  activeTasks,
  completedTasks,
  hasActiveTasks,
  hasUnsavedTasks,
  hasBlockingTasks,
  stats,
  totalProgress,
  addBatchTask,
  appendFilesToTask,
  replaceTaskFiles,
  removeFileFromTask,
  discardTask,
  attachTaskLock,
  findTaskByTargetId,
  startPendingTasks,
  updateFileStatus,
  updateFileProgress,
  pauseTask,
  resumeTask,
  cancelTask,
  cancelAllTasks,
  retryTask,
  clearCompletedTasks,
  setMaxConcurrentUploads,
  toggleTaskExpanded,
  isTaskExpanded,
  showPanel,
  hidePanel,
  togglePanel,
  minimizePanel,
  maximizePanel,
};
