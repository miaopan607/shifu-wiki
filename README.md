# 黄诗扶 Wiki (Shifu Wiki)

一个基于 [Astro](https://astro.build/) 构建的黄诗扶 Wiki。

## 项目结构

```text
/
├── src/
│   ├── content/       # 内容库 (Markdown 文件)
│   │   └── songs/     # 歌曲信息
│   ├── layouts/       # 页面布局
│   ├── pages/         # 页面路由
│   └── styles/        # 全局样式
├── public/            # 静态资源
├── astro.config.mjs   # Astro 配置
└── tailwind.config.mjs # Tailwind 配置
```

## 开发指南

### 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产构建

```bash
# 构建静态站点
npm run build

# 预览构建结果
npm run preview
```

## 开源协议

本项目采用 [MIT](LICENSE) 协议开源。
