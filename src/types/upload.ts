// 文件上传状态
export type FileUploadStatus = 'pending' | 'uploading' | 'paused' | 'success' | 'error' | 'cancelled';

// 单个文件的上传信息
export interface FileUploadInfo {
  id: string;
  fileName: string;
  fileSize: number;
  status: FileUploadStatus;
  progress: number;
  error?: string;
  sort?: number;
  clientId?: string;
  uploadedRecordId?: string;
  file?: File; // 实际的 File 对象（保存前使用）
}

// 批量任务类型
export type BatchTaskType = 'gallery_images' | 'song_covers' | 'album_covers';

// 批量上传任务状态
export type BatchTaskStatus =
  | 'pending'
  | 'uploading'
  | 'success'
  | 'error'
  | 'paused'
  | 'partial_success'
  | 'cancelled';

// 批量上传任务
export interface BatchUploadTask {
  id: string;
  type: BatchTaskType;
  targetId: string;
  targetType: 'gallery' | 'song' | 'album';
  targetName: string; // 图集/专辑/音乐名称，用于显示
  serverBatchId?: string;
  lockId?: string;
  lockCollection?: 'galleries' | 'albums' | 'songs';
  isFinalizingCancel?: boolean;
  status: BatchTaskStatus;
  files: FileUploadInfo[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  totalProgress: number; // 总体进度 0-100
  successCount: number;
  errorCount: number;
  totalCount: number;
}

// 创建批量任务的参数
export interface CreateBatchTaskParams {
  type: BatchTaskType;
  targetId: string;
  targetType: 'gallery' | 'song' | 'album';
  targetName: string;
  files: File[];
  sorts?: number[]; // 每个文件的排序值
  clientIds?: string[];
}

// 全局上传面板状态
export interface GlobalUploadPanelState {
  isVisible: boolean;
  isMinimized: boolean;
  hasNewFinishedTasks: boolean;
  expandedTasks: Set<string>; // 展开显示文件详情的任务ID
}

// 上传任务统计
export interface UploadStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalFiles: number;
  uploadedFiles: number;
  failedFiles: number;
}
