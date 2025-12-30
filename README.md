# 黄诗扶 Wiki

一个基于 [Astro](https://astro.build/) 构建的黄诗扶 Wiki。

## 项目结构

```text
/
├── src/
│   ├── layouts/       # 页面布局
│   ├── lib/           # 工具库 (PocketBase 配置)
│   ├── pages/         # 页面路由
│   └── styles/        # 全局样式
├── public/            # 静态资源
├── astro.config.mjs   # Astro 配置
└── tailwind.config.mjs # Tailwind 配置
```

## 开发指南

### 数据库配置

项目使用 [PocketBase](https://pocketbase.io/) 作为后端数据库。在 SSR 模式下，页面会实时从数据库获取内容。

1. 确保 PocketBase 服务已启动。
2. 在 `src/lib/pocketbase.ts` 中配置数据库连接地址。

### 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产构建

```bash
# 构建 SSR 站点
npm run build

# 启动 Node.js 服务器
node ./dist/server/entry.mjs
```

## 开源协议

本项目采用 [MIT](LICENSE) 协议开源。
