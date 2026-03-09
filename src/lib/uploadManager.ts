import type { BatchUploadTask, FileUploadInfo, CreateBatchTaskParams, FileUploadStatus } from '@/types/upload';

export interface UploadRequestHandle {
  promise: Promise<unknown>;
  abort: () => void;
}

// 生成唯一ID
export function generateUploadId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 创建批量上传任务
export function createBatchUploadTask(params: CreateBatchTaskParams): BatchUploadTask {
  const files: FileUploadInfo[] = params.files.map((file, index) => ({
    id: generateUploadId(),
    fileName: file.name,
    fileSize: file.size,
    status: 'pending',
    progress: 0,
    sort: params.sorts?.[index],
    clientId: params.clientIds?.[index],
    file: file, // 保存 File 对象供后续上传使用
  }));

  return {
    id: generateUploadId(),
    type: params.type,
    targetId: params.targetId,
    targetType: params.targetType,
    targetName: params.targetName,
    status: 'pending',
    files,
    createdAt: Date.now(),
    totalProgress: 0,
    successCount: 0,
    errorCount: 0,
    totalCount: files.length,
  };
}

// 计算任务总体进度
export function calculateTaskProgress(task: BatchUploadTask): number {
  if (task.files.length === 0) return 0;
  const totalProgress = task.files.reduce((sum, f) => sum + f.progress, 0);
  return Math.round(totalProgress / task.files.length);
}

// 更新任务统计信息
export function updateTaskStats(task: BatchUploadTask): void {
  task.successCount = task.files.filter(f => f.status === 'success').length;
  task.errorCount = task.files.filter(f => f.status === 'error').length;
  task.totalProgress = calculateTaskProgress(task);

  if (task.files.length === 0) {
    task.totalCount = 0;
    return;
  }

  task.totalCount = task.files.length;

  if (task.status === 'paused' || task.status === 'cancelled') {
    return;
  }

  const pendingCount = task.files.filter(f => f.status === 'pending').length;
  const uploadingCount = task.files.filter(f => f.status === 'uploading').length;
  const pausedCount = task.files.filter(f => f.status === 'paused').length;
  const cancelledCount = task.files.filter(f => f.status === 'cancelled').length;

  if (task.successCount === task.files.length) {
    task.status = 'success';
  } else if (task.errorCount === task.files.length) {
    task.status = 'error';
  } else if (cancelledCount === task.files.length) {
    task.status = 'cancelled';
  } else if (uploadingCount > 0 || (pendingCount > 0 && task.status === 'uploading')) {
    task.status = 'uploading';
  } else if (pausedCount > 0) {
    task.status = 'paused';
  } else if (pendingCount > 0) {
    task.status = 'pending';
  } else if (task.successCount > 0 && (task.errorCount > 0 || cancelledCount > 0)) {
    task.status = 'partial_success';
  } else if (task.errorCount > 0 && cancelledCount > 0) {
    task.status = 'error';
  }
}

// 检查任务是否活跃
export function isTaskActive(task: BatchUploadTask): boolean {
  return task.status === 'pending' || task.status === 'uploading' || task.status === 'paused';
}

// 检查任务是否已完成
export function isTaskCompleted(task: BatchUploadTask): boolean {
  return (
    task.status === 'success' ||
    task.status === 'error' ||
    task.status === 'partial_success' ||
    task.status === 'cancelled'
  );
}

// 使用 XHR 上传文件（支持进度回调和取消）
export function uploadFileWithXHR(
  url: string,
  formData: FormData,
  authToken: string | null,
  onProgress: (progress: number) => void,
  method: 'POST' | 'PATCH' = 'POST'
): UploadRequestHandle {
  const xhr = new XMLHttpRequest();

  const promise = new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('上传已取消'));
    });

    xhr.open(method, url);
    if (authToken) {
      xhr.setRequestHeader('Authorization', authToken);
    }
    xhr.send(formData);
  });

  return {
    promise,
    abort: () => xhr.abort(),
  };
}

// 获取状态文本
export function getStatusText(status: FileUploadStatus | string): string {
  const statusMap: Record<string, string> = {
    pending: '待保存',
    uploading: '上传中',
    paused: '已暂停',
    success: '完成',
    error: '失败',
    cancelled: '已取消',
    partial_success: '部分成功',
  };
  return statusMap[status] || status;
}

// 获取状态颜色
export function getStatusColor(status: FileUploadStatus | string): string {
  const colorMap: Record<string, string> = {
    pending: 'text-yellow-400',
    uploading: 'text-blue-400',
    paused: 'text-orange-400',
    success: 'text-green-400',
    error: 'text-red-400',
    cancelled: 'text-gray-400',
    partial_success: 'text-yellow-400',
  };
  return colorMap[status] || 'text-gray-400';
}
