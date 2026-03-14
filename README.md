# 黄诗扶 Wiki

一个基于 [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) 构建的黄诗扶 Wiki。

## 项目结构

```text
/
├── src/
│   ├── assets/            # 静态资源 (样式、图标)
│   ├── components/        # 公用组件
│   ├── composables/       # Vue Composables (可复用逻辑)
│   ├── lib/               # 工具库 (PocketBase 配置)
│   ├── router/            # 路由配置
│   ├── stores/            # 全局状态（主要是上传队列）
│   ├── types/             # 类型定义
│   ├── views/             # 页面视图 (原 Astro 页面迁移)
│   │   └── admin/         # 管理后台页面
│   ├── App.vue            # 根组件
│   └── main.ts            # 入口文件
├── server/                # 音乐播放后端服务
├── pocketbase/            # PocketBase hooks
├── public/                # 公共静态资源
├── index.html             # 入口 HTML
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
└── vite.config.ts         # Vite 配置
```

## 技术栈

### 核心依赖

| 依赖                                     | 版本    | 说明                       |
| ---------------------------------------- | ------- | -------------------------- |
| [Vue](https://vuejs.org/)                | ^3.5.27 | 前端框架                   |
| [Vue Router](https://router.vuejs.org/)  | ^4.6.4  | 路由管理                   |
| [Tailwind CSS](https://tailwindcss.com/) | ^4.1.18 | CSS 框架                   |
| [PocketBase](https://pocketbase.io/)     | ^0.26.8 | 后端数据库                 |
| [VueUse](https://vueuse.org/)            | ^14.2.1 | Vue Composition API 工具集 |
| [marked](https://marked.js.org/)         | ^17.0.2 | Markdown 解析器            |

### 开发依赖

| 依赖                                                          | 版本   | 说明                  |
| ------------------------------------------------------------- | ------ | --------------------- |
| [Vite](https://vitejs.dev/)                                   | ^7.3.1 | 构建工具              |
| [TypeScript](https://www.typescriptlang.org/)                 | ~5.9.3 | 类型支持              |
| [vue-tsc](https://github.com/vuejs/language-tools)            | ^3.2.4 | Vue TypeScript 编译器 |
| [Prettier](https://prettier.io/)                              | ^3.8.1 | 代码格式化            |
| [vite-plugin-vue-devtools](https://github.com/vuejs/devtools) | ^8.0.5 | Vue 开发者工具        |

## 开发指南

### 数据库配置

项目使用 [PocketBase](https://pocketbase.io/) 作为后端数据库。

1. 确保 PocketBase 服务已启动。
2. 在 `src/lib/pocketbase.ts` 中配置数据库连接地址，或通过 `.env` 文件配置。
3. 如果修改了 `pocketbase/pb_hooks` 或 `pocketbase/pb_migrations`，需要同步到 PocketBase 服务目录并重启服务。

### 音乐播放服务

项目支持在线音乐播放功能（QQ音乐、网易云音乐）。

1. 进入 `server/` 目录安装依赖并启动服务：

```bash
cd server
pnpm install
pnpm dev  # 开发模式（支持热重载）
# 或
pnpm start  # 生产模式
```

2. 在 `.env` 文件中配置音乐服务器地址（默认为 `http://localhost:3001`）

### 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 代码规范

```bash
# 格式化代码
pnpm format
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
- 音乐播放功能需要启动 `server/` 目录下的音乐服务器，详见 `server/README.md`。
- PocketBase 侧的部署说明见 `pocketbase/README.md`。
- 数据库结构定义见 `PocketBaseSchema.md`。

## 开源协议

本项目采用 [MIT](LICENSE) 协议开源。
