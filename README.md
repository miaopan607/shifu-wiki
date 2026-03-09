# 黄诗扶 Wiki

一个基于 [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) 构建的黄诗扶 Wiki。

## 项目结构

```text
/
├── src/
│   ├── assets/            # 静态资源 (样式、图标)
│   ├── components/        # 公用组件
│   ├── lib/               # 工具库 (PocketBase 配置)
│   ├── router/            # 路由配置
│   ├── stores/            # 全局状态（主要是上传队列）
│   ├── types/             # 类型定义
│   ├── views/             # 页面视图 (原 Astro 页面迁移)
│   │   └── admin/         # 管理后台页面
│   ├── App.vue            # 根组件
│   └── main.ts            # 入口文件
├── pocketbase/            # PocketBase hooks / migrations / 部署说明
├── public/                # 公共静态资源
├── index.html             # 入口 HTML
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
└── vite.config.ts         # Vite 配置
```

## 开发指南

### 数据库配置

项目使用 [PocketBase](https://pocketbase.io/) 作为后端数据库。

1. 确保 PocketBase 服务已启动。
2. 在 `src/lib/pocketbase.ts` 中配置数据库连接地址，或通过 `.env` 文件配置。
3. 如果修改了 `pocketbase/pb_hooks` 或 `pocketbase/pb_migrations`，需要同步到 PocketBase 服务目录并重启服务。

### 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 生产构建

```bash
# 构建项目
pnpm build

# 预览构建产物
pnpm preview

# 类型检查
pnpm type-check
```

## 备注

- 后台有一套基于 `upload_batches` 的上传队列，用于处理图库图片和专辑封面的取消、回滚与兜底清理。
- PocketBase 侧的部署说明见 `pocketbase/README.md`。

## 开源协议

本项目采用 [MIT](LICENSE) 协议开源。
