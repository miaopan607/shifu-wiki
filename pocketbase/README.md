# PocketBase 上传批次接入说明

这个目录放的是给 `PocketBase` 服务端用的文件，不是前端直接运行的。

## 需要复制到哪里

- 把 `pocketbase/pb_hooks` 整个目录复制到你的 `pocketbase.exe` 同级目录
- 把 `pocketbase/pb_migrations` 整个目录复制到你的 `pocketbase.exe` 同级目录

最终类似这样：

```text
your-pocketbase/
  pocketbase.exe
  pb_hooks/
    10_gallery_upload_batches.pb.js
  pb_migrations/
    1730900000_gallery_upload_batches.js
    1730901000_album_cover_upload_batch_snapshot.js
```

## 怎么执行

1. 先停止 `PocketBase`
2. 复制上面的两个目录
3. 在 `pocketbase.exe` 所在目录执行：

```powershell
.\pocketbase.exe migrate up
```

4. 再启动 `PocketBase`

## 这次加了什么

- 给 `gallery_images` 增加两个字段：`uploadBatchId`、`clientUploadId`
- 新增一个 `upload_batches` 集合，用来追踪一次批量上传任务
- 给 `upload_batches` 增加两个字段：`snapshotCoverName`、`snapshotFile`
- 新增三个自定义接口：
    - `POST /api/shifu/upload-batches`
    - `POST /api/shifu/upload-batches/{batchId}/cancel`
    - `POST /api/shifu/upload-batches/{batchId}/complete`
- 新增一个专辑封面上传接口：
    - `PATCH /api/shifu/upload-batches/{batchId}/album-cover`
- 给 `gallery_images` 的创建请求加了校验和兜底清理
- 给 `album_cover` 接上了同样的批次取消与回滚逻辑

## 作用

- 前端取消上传时，不再只靠浏览器 `abort()`
- 后端会先把整个上传批次标记为取消，再按批次删除图片
- 即使某个上传请求“晚到一步”才创建记录，钩子也会把那条迟到记录删掉
- 专辑封面上传如果在服务器端“晚到一步”落库，也会按快照回滚到取消前的封面状态

## 备注

- 这套代码现在同时接了 `gallery_images` 和 `album_cover`
