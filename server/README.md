# 音乐播放后端服务

为 shifu-wiki 提供音乐直链获取服务。

## 功能

- 获取QQ音乐播放直链
- 获取网易云音乐播放直链
- 自动缓存音乐信息
- 通过数据库ID查询歌曲，只接受站内请求

## 安装

```bash
pnpm install
```

## 配置

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

**环境变量说明：**

- `PORT`: 服务器端口（默认 3001）
- `POCKETBASE_URL`: PocketBase 数据库地址（**必需**，用于查询歌曲信息）

**注意：**

- `.env.example` 是配置模板文件，提交到 git
- `.env` 是实际使用的配置文件，**不要提交到 git**（已在 .gitignore 中排除）
- 前端的环境变量在根目录的 `.env` 文件中配置

## 运行

```bash
# 生产模式
pnpm start

# 开发模式（支持热重载）
pnpm dev
```

## 更新代码后如何应用

在本地仓库根目录执行：

```bash
pnpm deploy-server
```

这个命令会自动把本地 `server/` 同步到服务器的 `music-server/`，然后仅重新构建并重启 `shifu-wiki-music-server`，不会触碰 `shifu-wiki-backend`。

说明：缓存目录已挂载到宿主机，重新部署不会清空已有缓存数据。

## API接口

### 获取音乐播放链接

```
GET /api/music/play?id={songId}
```

**参数：**

- `id`: 歌曲数据库ID（**只接受站内歌曲ID**）

**说明：**

- 后端会自动从数据库查询歌曲的平台信息和ID
- 无需前端传递平台参数，更安全可靠
- 只返回有启用平台且配置了对应平台ID的歌曲

**返回示例：**

```json
{
  "success": true,
  "platform": "qq",
  "musicId": "001ABC123",
  "name": "歌曲名称",
  "artists": ["歌手1", "歌手2"],
  "musicUrl": "https://...",
  "cover": "https://..."
}
```

**错误返回：**

```json
{
  "success": false,
  "message": "错误信息"
}
```

## 技术说明

### QQ音乐

通过QQ音乐的公开API获取歌曲元数据和vkey，拼接成可播放的直链。

### 网易云音乐

使用网易云音乐的外链播放器接口，格式为：

```
https://music.163.com/song/media/outer/url?id={ID}.mp3
```
