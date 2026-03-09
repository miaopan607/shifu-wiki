# AGENTS.md - AI 协作者指南

## 项目概述

基于 **Vue 3 + Vite + PocketBase** 的黄诗扶 Wiki。

- **前端**: Vue 3 (Composition API) + Tailwind CSS v4
- **后端**: PocketBase
- **包管理器**: pnpm

## 常用命令

```bash
# 类型检查
pnpm type-check
```

## 项目结构

```
src/
├── components/       # 公用组件
├── lib/              # 工具库
│   ├── pocketbase.ts
│   ├── editLock.ts
│   ├── uploadManager.ts
│   └── uploadBatches.ts
├── stores/
│   └── uploadStore.ts
├── types/
│   ├── index.ts      # 数据模型类型
│   └── upload.ts     # 上传相关类型
└── views/
    ├── [public]/     # 公开页面
    └── admin/        # 管理后台 (Admin*.vue)

pocketbase/
├── pb_hooks/         # 服务端钩子
└── pb_migrations/    # 数据库迁移
```

## 核心功能

### 1. 上传批次系统

解决上传取消时残留图片的问题。

- `upload_batches` 集合追踪上传任务状态
- 状态流转: `pending` → `uploading` → `completed`/`cancelled`
- 前端: `uploadStore.ts`, `uploadBatches.ts`, `uploadManager.ts`
- 后端: `pb_hooks/10_gallery_upload_batches.pb.js`

### 2. 编辑锁系统

防止多人同时编辑同一资源。

```typescript
import { acquireEditLock, releaseEditLock } from '@/lib/editLock';

const lock = await acquireEditLock({ collection, recordId, recordTitle });
await releaseEditLock(lock.id);
```

### 3. 数据模型

- `songs`, `albums`, `galleries`, `gallery_images`
- `activities`, `misc`
- `upload_batches`, `edit_locks`

## 开发注意

- **上传逻辑修改**: 确保调用 `cancelUploadBatch()`，后端钩子会清理残留
- **PocketBase 修改**: 复制到服务目录后执行 `pocketbase migrate up` 并重启
- **样式**: 保持和主站设计一致。
