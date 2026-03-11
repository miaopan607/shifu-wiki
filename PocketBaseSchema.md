# 数据库结构定义 (PocketBase Schema)

## 1. 核心业务集合

### songs (单曲)

| 字段名             | 类型     | 说明                                                     |
| :----------------- | :------- | :------------------------------------------------------- |
| `id`               | text     | 主键                                                     |
| `index`            | number   | 索引                                                     |
| `title`            | text     | 标题 (必填)                                              |
| `artist`           | text     | 艺人 (必填)                                              |
| `releaseDate`      | text     | 发布日期                                                 |
| `lyricist`         | text     | 词作                                                     |
| `composer`         | text     | 曲作                                                     |
| `lyrics`           | text     | 歌词                                                     |
| `credits`          | text     | 制作人员名单                                             |
| `links`            | json     | 平台链接                                                 |
| `otherLinks`       | json     | 其他相关链接                                             |
| `description`      | text     | 描述                                                     |
| `defaultAlbum`     | relation | 关联到 albums（可选，站内有此专辑时使用）                |
| `defaultAlbumName` | text     | 专辑名称文本（可选，站内无此专辑时使用）                 |
| `defaultCover`     | text     | 默认封面：空=缺省封面, `album`=专辑封面, `song_cover:ID` |
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

| 字段名        | 类型     | 说明                               |
| :------------ | :------- | :--------------------------------- |
| `id`          | text     | 主键                               |
| `index`       | number   | 索引                               |
| `title`       | text     | 专辑名 (必填)                      |
| `releaseDate` | text     | 发布日期                           |
| `description` | text     | 描述                               |
| `cover`       | file     | 专辑封面图片                       |
| `tracks`      | json     | Disc 与歌曲关联 (AlbumDisc[] JSON) |
| `created`     | autodate | 创建时间                           |
| `updated`     | autodate | 更新时间                           |

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

| 字段名      | 类型     | 说明        |
| :---------- | :------- | :---------- |
| `id`        | text     | 主键        |
| `index`     | number   | 索引        |
| `title`     | text     | 标题 (必填) |
| `date`      | text     | 日期        |
| `startTime` | date     | 开始时间    |
| `endTime`   | date     | 结束时间    |
| `location`  | text     | 地点        |
| `tags`      | json     | 标签        |
| `created`   | autodate | 创建时间    |
| `updated`   | autodate | 更新时间    |

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

| 字段名              | 类型 | 说明         |
| :------------------ | :--- | :----------- |
| `id`                | text | 主键         |
| `snapshotCoverName` | text | 封面快照名称 |
| `snapshotFile`      | file | 快照文件     |
