# 黄诗扶 Wiki

一个基于 [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) 构建的黄诗扶 Wiki。

## 项目结构

```text
/
├── src/
│   ├── assets/        # 静态资源 (样式、图标)
│   ├── components/    # 公用组件
│   ├── lib/           # 工具库 (PocketBase 配置)
│   ├── router/        # 路由配置
│   ├── views/         # 页面视图 (原 Astro 页面迁移)
│   ├── App.vue        # 根组件
│   └── main.ts        # 入口文件
├── public/            # 公共静态资源
├── index.html         # 入口 HTML
├── package.json       # 项目配置
├── tsconfig.json      # TypeScript 配置
└── vite.config.ts     # Vite 配置
```

## 开发指南

### 数据库配置

项目使用 [PocketBase](https://pocketbase.io/) 作为后端数据库。

1. 确保 PocketBase 服务已启动。
2. 在 `src/lib/pocketbase.ts` 中配置数据库连接地址，或通过 `.env` 文件配置。

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
```

## 开源协议

本项目采用 [MIT](LICENSE) 协议开源。
