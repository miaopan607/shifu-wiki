// === Upload Batch Management ===

routerAdd('POST', '/api/shifu/upload-batches', e => {
  if (!e.auth) {
    throw new UnauthorizedError('请先登录后再操作上传批次');
  }

  const data = new DynamicModel({
    targetType: 'gallery',
    targetId: '',
    targetName: '',
  });

  e.bindBody(data);

  const targetType = String(data.targetType || 'gallery');
  if (targetType !== 'gallery' && targetType !== 'song') {
    throw new BadRequestError('当前只支持图库图片或音乐封面的上传批次');
  }

  const collection = e.app.findCollectionByNameOrId('upload_batches');
  const record = new Record(collection);

  record.set('ownerId', e.auth.id);
  record.set('targetType', targetType);
  record.set('targetId', String(data.targetId || ''));
  record.set('targetName', String(data.targetName || ''));
  record.set('status', 'open');

  e.app.save(record);

  return e.json(200, {
    id: record.id,
    status: record.get('status'),
    targetType: record.get('targetType'),
    targetId: record.get('targetId'),
    targetName: record.get('targetName'),
  });
});

routerAdd('POST', '/api/shifu/upload-batches/{batchId}/cancel', e => {
  if (!e.auth) {
    throw new UnauthorizedError('请先登录后再操作上传批次');
  }

  const batchId = e.request.pathValue('batchId');
  const batch = e.app.findRecordById('upload_batches', batchId);
  const ownerId = String(batch.get('ownerId') || '');

  if (ownerId && ownerId !== e.auth.id) {
    throw new ForbiddenError('你不能操作其他人的上传批次');
  }

  const currentStatus = String(batch.get('status') || '');
  if (currentStatus === 'cancelled') {
    return e.json(200, {
      id: batch.id,
      status: currentStatus,
      targetType: batch.get('targetType'),
      targetId: batch.get('targetId'),
      targetName: batch.get('targetName'),
    });
  }

  batch.set('status', 'cancelling');
  e.app.save(batch);

  let cleanupSucceeded = true;
  const targetType = String(batch.get('targetType') || '');

  if (targetType === 'gallery') {
    try {
      cleanupCollectionByBatchId(e.app, 'gallery_images', batch.id);
    } catch (error) {
      cleanupSucceeded = false;
      console.log('[upload batch] cancel cleanup gallery failed:', batch.id, error);
    }
  } else if (targetType === 'song') {
    try {
      cleanupCollectionByBatchId(e.app, 'song_covers', batch.id);
    } catch (error) {
      cleanupSucceeded = false;
      console.log('[upload batch] cancel cleanup song_covers failed:', batch.id, error);
    }
  }

  if (cleanupSucceeded) {
    batch.set('status', 'cancelled');
    e.app.save(batch);
  }

  return e.json(200, {
    id: batch.id,
    status: batch.get('status'),
    targetType: batch.get('targetType'),
    targetId: batch.get('targetId'),
    targetName: batch.get('targetName'),
  });
});

routerAdd('POST', '/api/shifu/upload-batches/{batchId}/complete', e => {
  if (!e.auth) {
    throw new UnauthorizedError('请先登录后再操作上传批次');
  }

  const batchId = e.request.pathValue('batchId');
  const batch = e.app.findRecordById('upload_batches', batchId);
  const ownerId = String(batch.get('ownerId') || '');

  if (ownerId && ownerId !== e.auth.id) {
    throw new ForbiddenError('你不能操作其他人的上传批次');
  }

  const currentStatus = String(batch.get('status') || '');
  if (currentStatus === 'completed') {
    return e.json(200, {
      id: batch.id,
      status: currentStatus,
      targetType: batch.get('targetType'),
      targetId: batch.get('targetId'),
      targetName: batch.get('targetName'),
    });
  }

  if (currentStatus === 'cancelling' || currentStatus === 'cancelled') {
    throw new BadRequestError('上传批次已取消，不能标记为完成');
  }

  batch.set('status', 'completed');
  e.app.save(batch);

  return e.json(200, {
    id: batch.id,
    status: batch.get('status'),
    targetType: batch.get('targetType'),
    targetId: batch.get('targetId'),
    targetName: batch.get('targetName'),
  });
});

// === Helper: cleanup records by uploadBatchId ===

function cleanupCollectionByBatchId(app, collectionName, batchId) {
  while (true) {
    const records = app.findRecordsByFilter(collectionName, 'uploadBatchId = {:batchId}', '-created', 500, 0, {
      batchId: batchId,
    });
    if (!records.length) {
      break;
    }
    for (const record of records) {
      app.delete(record);
    }
  }
}

// === Record hooks for gallery_images ===

onRecordCreateRequest(e => {
  const uploadBatchId = String(e.record.get('uploadBatchId') || '');
  const clientUploadId = String(e.record.get('clientUploadId') || '');

  if (!uploadBatchId || !clientUploadId) {
    return e.next();
  }

  const batch = e.app.findRecordById('upload_batches', uploadBatchId);
  const batchStatus = String(batch.get('status') || '');

  if (batchStatus === 'cancelling' || batchStatus === 'cancelled') {
    throw new BadRequestError('上传批次已取消，请刷新页面后重试');
  }

  const ownerId = String(batch.get('ownerId') || '');
  if (ownerId) {
    if (!e.auth || ownerId !== e.auth.id) {
      throw new ForbiddenError('你不能向其他人的上传批次写入图片');
    }
  }

  let targetType = String(batch.get('targetType') || '');
  const targetId = String(batch.get('targetId') || '');
  const recordGalleryId = String(e.record.get('gallery') || '');

  if (!recordGalleryId) {
    throw new BadRequestError('上传图片缺少目标图库 ID');
  }

  if (targetType !== 'gallery') {
    batch.set('targetType', 'gallery');
    e.app.save(batch);
    targetType = 'gallery';
  }

  if (!targetId || targetId === 'new') {
    batch.set('targetId', recordGalleryId);
    e.app.save(batch);
    return e.next();
  }

  if (recordGalleryId !== targetId) {
    throw new BadRequestError('上传批次与目标图库不匹配');
  }

  return e.next();
}, 'gallery_images');

onRecordAfterCreateSuccess(e => {
  const uploadBatchId = String(e.record.get('uploadBatchId') || '');

  if (!uploadBatchId) {
    return e.next();
  }

  try {
    const batch = e.app.findRecordById('upload_batches', uploadBatchId);
    const batchStatus = String(batch.get('status') || '');
    if (batchStatus === 'cancelling' || batchStatus === 'cancelled') {
      e.app.delete(e.record);
    }
  } catch (error) {
    console.log('[gallery upload batch] remove late record failed batch check:', error);
    try {
      e.app.delete(e.record);
    } catch (deleteError) {
      console.log('[gallery upload batch] late record cleanup failed:', deleteError);
    }
  }

  return e.next();
}, 'gallery_images');

// === Record hooks for song_covers ===

onRecordCreateRequest(e => {
  const uploadBatchId = String(e.record.get('uploadBatchId') || '');
  const clientUploadId = String(e.record.get('clientUploadId') || '');

  if (!uploadBatchId || !clientUploadId) {
    return e.next();
  }

  const batch = e.app.findRecordById('upload_batches', uploadBatchId);
  const batchStatus = String(batch.get('status') || '');

  if (batchStatus === 'cancelling' || batchStatus === 'cancelled') {
    throw new BadRequestError('上传批次已取消，请刷新页面后重试');
  }

  const ownerId = String(batch.get('ownerId') || '');
  if (ownerId) {
    if (!e.auth || ownerId !== e.auth.id) {
      throw new ForbiddenError('你不能向其他人的上传批次写入封面');
    }
  }

  let targetType = String(batch.get('targetType') || '');
  const targetId = String(batch.get('targetId') || '');
  const recordSongId = String(e.record.get('song') || '');

  if (!recordSongId) {
    throw new BadRequestError('上传封面缺少目标歌曲 ID');
  }

  if (targetType !== 'song') {
    batch.set('targetType', 'song');
    e.app.save(batch);
    targetType = 'song';
  }

  if (!targetId || targetId === 'new') {
    batch.set('targetId', recordSongId);
    e.app.save(batch);
    return e.next();
  }

  if (recordSongId !== targetId) {
    throw new BadRequestError('上传批次与目标歌曲不匹配');
  }

  return e.next();
}, 'song_covers');

onRecordAfterCreateSuccess(e => {
  const uploadBatchId = String(e.record.get('uploadBatchId') || '');

  if (!uploadBatchId) {
    return e.next();
  }

  try {
    const batch = e.app.findRecordById('upload_batches', uploadBatchId);
    const batchStatus = String(batch.get('status') || '');
    if (batchStatus === 'cancelling' || batchStatus === 'cancelled') {
      e.app.delete(e.record);
    }
  } catch (error) {
    console.log('[song_covers upload batch] remove late record failed batch check:', error);
    try {
      e.app.delete(e.record);
    } catch (deleteError) {
      console.log('[song_covers upload batch] late record cleanup failed:', deleteError);
    }
  }

  return e.next();
}, 'song_covers');

// === Cron: cleanup cancelled upload batches ===

cronAdd('upload-batch-cancel-cleanup', '*/10 * * * *', () => {
  const uploadBatchesCollection = $app.findCollectionByNameOrId('upload_batches');
  const batches = $app.findRecordsByFilter(
    uploadBatchesCollection,
    'status = {:cancelling} || status = {:cancelled}',
    '-updated',
    500,
    0,
    {
      cancelling: 'cancelling',
      cancelled: 'cancelled',
    }
  );

  for (const batch of batches) {
    try {
      let shouldSaveBatch = false;
      const targetType = String(batch.get('targetType') || '');

      if (targetType === 'gallery') {
        cleanupCollectionByBatchId($app, 'gallery_images', batch.id);
      } else if (targetType === 'song') {
        cleanupCollectionByBatchId($app, 'song_covers', batch.id);
      }

      if (String(batch.get('status') || '') === 'cancelling') {
        batch.set('status', 'cancelled');
        shouldSaveBatch = true;
      }

      if (shouldSaveBatch) {
        $app.save(batch);
      }
    } catch (error) {
      console.log('[upload batch] cron cleanup failed:', batch.id, error);
    }
  }
});
