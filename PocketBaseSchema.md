# 数据库结构定义 (PocketBase Schema)

## 1. 核心业务集合

### songs (单曲)

| 字段名             | 类型     | 说明                                                     |
| :----------------- | :------- | :------------------------------------------------------- |
| `id`               | text     | 主键                                                     |
| `index`            | number   | 索引                                                     |
| `title`            | text     | 标题 (必填)                                              |
| `artist`           | json     | 艺人标签数组 (必填)                                      |
| `lyricist`         | json     | 词作标签数组                                             |
| `composer`         | json     | 曲作标签数组                                             |
| `lyrics`           | text     | 歌词                                                     |
| `credits`          | text     | 制作人员名单                                             |
| `releaseDate`      | date     | 发布日期                                                 |
| `links`            | json     | 平台链接                                                 |
| `otherLinks`       | json     | 其他相关链接                                             |
| `description`      | text     | 描述                                                     |
| `defaultAlbum`     | relation | 关联到 albums（可选，站内有此专辑时使用）                |
| `defaultAlbumName` | text     | 专辑名称文本（可选，站内无此专辑时使用）                 |
| `defaultCover`     | text     | 默认封面：空=缺省封面, `album`=专辑封面, `song_cover:ID` |
| `qqId`             | text     | QQ音乐ID (用于在线播放)                                  |
| `neteaseId`        | text     | 网易云音乐ID (用于在线播放)                              |
| `enabledPlatform`  | text     | 启用的播放平台: `qq`, `netease`, 或空字符串              |
| `instrumentalFor`  | json     | 此歌曲作为伴奏关联的歌曲ID数组                           |
| `created`          | autodate | 创建时间                                                 |
| `updated`          | autodate | 更新时间                                                 |

### song_covers (音乐封面 - 关联 songs)

| 字段名           | 类型     | 说明                |
| :--------------- | :------- | :------------------ |
| `id`             | text     | 主键                |
| `image`          | file     | 封面图片 (必填)     |
| `song`           | relation | 关联到 songs (必填) |
| `sort`           | number   | 排序权重            |
| `uploadBatchId`  | text     | 批量上传ID          |
| `clientUploadId` | text     | 客户端上传标识      |
| `created`        | autodate | 创建时间            |
| `updated`        | autodate | 更新时间            |

### albums (专辑)

| 字段名         | 类型     | 说明                               |
| :------------- | :------- | :--------------------------------- |
| `id`           | text     | 主键                               |
| `index`        | number   | 索引                               |
| `title`        | text     | 专辑名 (必填)                      |
| `releaseDate`  | date     | 发布日期                           |
| `description`  | text     | 描述                               |
| `links`        | json     | 平台链接                           |
| `otherLinks`   | json     | 其他相关链接                       |
| `cover`        | file     | [废弃] 专辑封面图片 (单图)         |
| `defaultCover` | text     | 默认封面: 空, `album_cover:ID`     |
| `tracks`       | json     | Disc 与歌曲关联 (AlbumDisc[] JSON) |
| `created`      | autodate | 创建时间                           |
| `updated`      | autodate | 更新时间                           |

### album_covers (专辑封面 - 关联 albums)

| 字段名           | 类型     | 说明                 |
| :--------------- | :------- | :------------------- |
| `id`             | text     | 主键                 |
| `image`          | file     | 封面图片 (必填)      |
| `album`          | relation | 关联到 albums (必填) |
| `sort`           | number   | 排序权重             |
| `uploadBatchId`  | text     | 批量上传ID           |
| `clientUploadId` | text     | 客户端上传标识       |
| `created`        | autodate | 创建时间             |
| `updated`        | autodate | 更新时间             |

`tracks` JSON 结构示例:

```json
[
  { "disc": 1, "name": "CD", "songs": ["SONG_ID_1", "SONG_ID_2"] },
  { "disc": 2, "name": "DVD", "songs": ["SONG_ID_3"] }
]
```

- `disc`: Disc 编号（必填）
- `name`: Disc 名称（可选），如 "CD"、"DVD"、"Disc 1" 等，用于多 Disc 专辑展示
- `songs`: 歌曲 ID 数组

### activities (活动)

| 字段名            | 类型     | 说明                            |
| :---------------- | :------- | :------------------------------ |
| `id`              | text     | 主键                            |
| `index`           | number   | 索引                            |
| `title`           | text     | 标题 (必填)                     |
| `timeSlots`       | json     | 时间段数组 (ActivityTimeSlot[]) |
| `location`        | text     | 地点                            |
| `saleStartTimes`  | json     | 起售时间数组 (string[])         |
| `ticketTiers`     | json     | 票档数组 (TicketTier[])         |
| `ticketPlatforms` | json     | 开票平台数组 (TicketPlatform[]) |
| `lineup`          | json     | 阵容数组 (string[])             |
| `tags`            | json     | 标签数组 (string[])             |
| `description`     | text     | 活动详情 (Markdown)             |
| `created`         | autodate | 创建时间                        |
| `updated`         | autodate | 更新时间                        |

`timeSlots` JSON 结构示例:

```json
[
  { "type": "datetime", "start": "2024-01-15T19:00:00.000Z", "end": "2024-01-15T21:00:00.000Z" },
  { "type": "date", "start": "2024-02-20T00:00:00.000Z" }
]
```

- `type`: 时间类型 - `datetime`(详细时间) 或 `date`(仅日期)
- `start`: 开始时间 (ISO8601 格式)。若 `type` 为 `date`，时间固定为零点 (`00:00:00.000Z`)
- `end`: 可选的结束时间 (ISO8601 格式)。规则同 `start`

`saleStartTimes` JSON 结构示例:

```json
["2024-01-10T10:00:00.000Z", "2024-01-12T14:00:00.000Z"]
```

ISO8601 格式的起售时间字符串数组。

`ticketTiers` JSON 结构示例:

```json
[{ "price": "￥580", "name": "VIP票", "description": "前排座位+签名海报" }, { "price": "￥280" }]
```

- `price`: 价格文本（必填）
- `name`: 票档名称（可选）
- `description`: 票档描述/权益说明（可选）

`ticketPlatforms` JSON 结构示例:

```json
[
  { "name": "大麦", "url": "https://www.damai.cn/..." },
  { "name": "猫眼", "url": "https://www.maoyan.com/..." }
]
```

- `name`: 平台名称（必填）
- `url`: 购票链接（可选）

`lineup` JSON 结构示例:

```json
["黄诗扶", "特邀嘉宾A", "主持人B"]
```

简单的艺人名称字符串数组。

### activity_images (活动图片 - 关联 activities)

| 字段名           | 类型     | 说明                     |
| :--------------- | :------- | :----------------------- |
| `id`             | text     | 主键                     |
| `image`          | file     | 图片文件 (必填)          |
| `activity`       | relation | 关联到 activities (必填) |
| `sort`           | number   | 排序权重                 |
| `uploadBatchId`  | text     | 批量上传ID               |
| `clientUploadId` | text     | 客户端上传标识           |
| `created`        | autodate | 创建时间                 |
| `updated`        | autodate | 更新时间                 |

### galleries (图集)

| 字段名        | 类型     | 说明        |
| :------------ | :------- | :---------- |
| `id`          | text     | 主键        |
| `index`       | number   | 索引        |
| `title`       | text     | 标题 (必填) |
| `description` | text     | 描述        |
| `published`   | bool     | 发布状态    |
| `date`        | date     | 日期        |
| `created`     | autodate | 创建时间    |
| `updated`     | autodate | 更新时间    |

### gallery_images (图集图片 - 关联 galleries)

| 字段名           | 类型     | 说明                    |
| :--------------- | :------- | :---------------------- |
| `id`             | text     | 主键                    |
| `image`          | file     | 图片文件 (必填)         |
| `gallery`        | relation | 关联到 galleries (必填) |
| `sort`           | number   | 排序权重                |
| `uploadBatchId`  | text     | 批量上传ID              |
| `clientUploadId` | text     | 客户端上传标识          |
| `created`        | autodate | 创建时间                |
| `updated`        | autodate | 更新时间                |

### misc (杂记)

| 字段名        | 类型     | 说明        |
| :------------ | :------- | :---------- |
| `id`          | text     | 主键        |
| `index`       | number   | 索引        |
| `title`       | text     | 标题 (必填) |
| `content`     | text     | 内容 (必填) |
| `description` | text     | 描述        |
| `published`   | bool     | 是否发布    |
| `created`     | autodate | 创建时间    |
| `updated`     | autodate | 更新时间    |

### profile (个人介绍)

| 字段名    | 类型     | 说明     |
| :-------- | :------- | :------- |
| `id`      | text     | 主键     |
| `content` | text     | 简介内容 |
| `created` | autodate | 创建时间 |
| `updated` | autodate | 更新时间 |

## 2. 系统与辅助集合

### edit_locks (编辑锁)

| 字段名       | 类型     | 说明             |
| :----------- | :------- | :--------------- |
| `id`         | text     | 主键             |
| `collection` | text     | 被锁定的集合名   |
| `recordId`   | text     | 被锁定的记录ID   |
| `userId`     | text     | 执行锁定的用户ID |
| `username`   | text     | 用户名           |
| `created`    | autodate | 创建时间         |
| `updated`    | autodate | 更新时间         |

### upload_batches (上传批次)

| 字段名              | 类型     | 说明                                                     |
| :------------------ | :------- | :------------------------------------------------------- |
| `id`                | text     | 主键                                                     |
| `status`            | text     | 批次状态: `open`, `cancelling`, `cancelled`, `completed` |
| `ownerId`           | text     | 创建者用户ID                                             |
| `targetType`        | text     | 目标类型: `gallery`、`song` 或 `activity`                |
| `targetId`          | text     | 目标记录ID                                               |
| `targetName`        | text     | 目标名称（用于显示）                                     |
| `snapshotCoverName` | text     | 封面快照名称（可选）                                     |
| `snapshotFile`      | file     | 快照文件（可选）                                         |
| `created`           | autodate | 创建时间                                                 |
| `updated`           | autodate | 更新时间                                                 |
