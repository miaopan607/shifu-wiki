## 项目概述

基于 **Vue 3 + Vite + PocketBase** 的黄诗扶 Wiki。

- **前端**: Vue 3 (Composition API) + Tailwind CSS v4
- **后端**: PocketBase
- **包管理器**: pnpm

## 常用命令

```bash
pnpm type-check
pnpm format
```

## 项目结构

```
src/
├── components/       # 公用组件
├── composables/      # Vue Composables (可复用逻辑)
│   ├── useEditLock.ts
│   └── useMusicPlayer.ts
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

server/              # 音乐播放后端服务
├── index.js         # Express 服务器
├── package.json
└── README.md

pocketbase/
├── pb_hooks/         # 服务端钩子
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
import { useEditLock } from '@/composables/useEditLock';

const editLock = useEditLock({
  collection: 'galleries',
  recordId: computed(() => id),
  isEdit: computed(() => !isNew.value),
});

await editLock.createEditLock();
```

### 3. 音乐播放系统

为歌曲提供在线播放功能。

- 支持QQ音乐和网易云音乐
- 通过后端服务获取播放直链
- 前端: `useMusicPlayer.ts` (播放状态管理), `MusicPlayer.vue` (播放器组件)
- 后端: `server/` 目录下的 Express 服务
- 配置: 需要在 `.env` 中设置 `VITE_MUSIC_SERVER_URL`

```typescript
import { useMusicPlayer } from '@/composables/useMusicPlayer';

const { playSong, isPlaying, isLoading } = useMusicPlayer();
await playSong(song);
```

### 4. 数据模型

- `songs`, `albums`, `galleries`, `gallery_images`
- `activities`, `misc`
- `upload_batches`, `edit_locks`

详见 `PocketBaseSchema.md`。

## 开发注意

- **上传逻辑修改**: 确保调用 `cancelUploadBatch()`，后端钩子会清理残留。
- **PocketBase 结构修改**: 必须在 `PocketBaseSchema.md` 中更新。
- **样式**: 保持和主站设计一致。
- **代码规范**: 修改代码后必须先进行类型检查和格式化。
- **音乐播放**: 需要启动 `server/` 目录下的音乐服务器 (见 server/README.md)

### 批量操作规范

禁止前端循环发送多个请求（如 `Promise.allSettled` 循环 DELETE/UPDATE）。应使用批量 API：前端发送 1 个请求，后端批量处理。参考 `src/lib/batchOperations.ts`。

## 图标使用规范

SVG 图标统一使用 `AppIcon` 组件，位于 `src/components/AppIcon.vue`。

```vue
<AppIcon name="home" class-name="w-5 h-5" />
```
