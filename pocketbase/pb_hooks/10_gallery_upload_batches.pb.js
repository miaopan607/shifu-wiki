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
  if (targetType !== 'gallery' && targetType !== 'album') {
    throw new BadRequestError('当前只支持图库图片或专辑封面的上传批次');
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
      while (true) {
        const records = e.app.findRecordsByFilter('gallery_images', 'uploadBatchId = {:batchId}', '-created', 500, 0, {
          batchId: batch.id,
        });
        if (!records.length) {
          break;
        }

        for (const record of records) {
          e.app.delete(record);
        }
      }
    } catch (error) {
      cleanupSucceeded = false;
      console.log('[upload batch] cancel cleanup gallery failed:', batch.id, error);
    }
  } else if (targetType === 'album') {
    try {
      const readSingleFileName = (record, fieldName) => {
        const value = record.get(fieldName);
        if (Array.isArray(value)) {
          return String(value[0] || '');
        }
        return String(value || '');
      };

      const targetId = String(batch.get('targetId') || '');
      const snapshotCoverName = String(batch.get('snapshotCoverName') || '');
      const snapshotFileName = readSingleFileName(batch, 'snapshotFile');
      let shouldSaveBatch = false;

      if (targetId && targetId !== 'new' && snapshotCoverName) {
        const album = e.app.findRecordById('albums', targetId);

        if (snapshotCoverName === '__none__') {
          album.set('cover', '');
          e.app.save(album);
        } else {
          if (!snapshotFileName) {
            throw new Error('snapshot file missing');
          }

          let snapshotFilesystem = null;
          try {
            snapshotFilesystem = e.app.newFilesystem();
            album.set(
              'cover',
              snapshotFilesystem.getReuploadableFile(batch.baseFilesPath() + '/' + snapshotFileName, true)
            );
            e.app.save(album);
          } finally {
            if (snapshotFilesystem) {
              snapshotFilesystem.close();
            }
          }
        }
      }

      if (snapshotCoverName || snapshotFileName) {
        batch.set('snapshotCoverName', '');
        batch.set('snapshotFile', '');
        shouldSaveBatch = true;
      }

      if (shouldSaveBatch) {
        e.app.save(batch);
      }
    } catch (error) {
      cleanupSucceeded = false;
      console.log('[upload batch] cancel cleanup album failed:', batch.id, error);
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

  if (String(batch.get('targetType') || '') === 'album') {
    const snapshotCoverName = String(batch.get('snapshotCoverName') || '');
    const snapshotFileValue = batch.get('snapshotFile');
    const snapshotFileName = Array.isArray(snapshotFileValue)
      ? String(snapshotFileValue[0] || '')
      : String(snapshotFileValue || '');

    if (snapshotCoverName || snapshotFileName) {
      batch.set('snapshotCoverName', '');
      batch.set('snapshotFile', '');
    }
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

routerAdd('POST', '/api/shifu/upload-batches/{batchId}/album-cover', e => {
  if (!e.auth) {
    throw new UnauthorizedError('请先登录后再上传专辑封面');
  }

  const readSingleFileName = (record, fieldName) => {
    const value = record.get(fieldName);
    if (Array.isArray(value)) {
      return String(value[0] || '');
    }
    return String(value || '');
  };

  const batchId = e.request.pathValue('batchId');
  const batch = e.app.findRecordById('upload_batches', batchId);
  const ownerId = String(batch.get('ownerId') || '');

  if (ownerId && ownerId !== e.auth.id) {
    throw new ForbiddenError('你不能向其他人的上传批次写入专辑封面');
  }

  const currentStatus = String(batch.get('status') || '');
  if (currentStatus === 'cancelling' || currentStatus === 'cancelled' || currentStatus === 'completed') {
    throw new BadRequestError('上传批次已取消或已关闭，请刷新页面后重试.');
  }

  const data = new DynamicModel({
    albumId: '',
    clientUploadId: '',
  });

  e.bindBody(data);

  const uploadedFiles = e.findUploadedFiles('cover');
  if (!uploadedFiles || !uploadedFiles.length) {
    throw new BadRequestError('请选择要上传的专辑封面');
  }

  const albumId = String(data.albumId || batch.get('targetId') || '');
  if (!albumId || albumId === 'new') {
    throw new BadRequestError('上传专辑封面缺少目标专辑 ID');
  }

  let shouldSaveBatch = false;
  const batchTargetType = String(batch.get('targetType') || '');
  if (batchTargetType !== 'album') {
    batch.set('targetType', 'album');
    shouldSaveBatch = true;
  }

  const batchTargetId = String(batch.get('targetId') || '');
  if (!batchTargetId || batchTargetId === 'new') {
    batch.set('targetId', albumId);
    shouldSaveBatch = true;
  } else if (batchTargetId !== albumId) {
    throw new BadRequestError('上传批次与目标专辑不匹配');
  }

  const album = e.app.findRecordById('albums', albumId);
  if (!String(batch.get('targetName') || '')) {
    batch.set('targetName', String(album.get('title') || ''));
    shouldSaveBatch = true;
  }

  const snapshotCoverName = String(batch.get('snapshotCoverName') || '');
  let snapshotFilesystem = null;
  try {
    if (!snapshotCoverName) {
      const currentCoverName = readSingleFileName(album, 'cover');

      if (currentCoverName) {
        snapshotFilesystem = e.app.newFilesystem();
        batch.set(
          'snapshotFile',
          snapshotFilesystem.getReuploadableFile(album.baseFilesPath() + '/' + currentCoverName, true)
        );
        batch.set('snapshotCoverName', currentCoverName);
      } else {
        batch.set('snapshotFile', '');
        batch.set('snapshotCoverName', '__none__');
      }

      shouldSaveBatch = true;
    }

    if (shouldSaveBatch) {
      e.app.save(batch);
    }
  } finally {
    if (snapshotFilesystem) {
      snapshotFilesystem.close();
    }
  }

  album.set('cover', uploadedFiles[0]);
  e.app.save(album);

  const latestBatch = e.app.findRecordById('upload_batches', batch.id);
  const latestStatus = String(latestBatch.get('status') || '');
  if (latestStatus === 'cancelling' || latestStatus === 'cancelled') {
    try {
      const latestAlbum = e.app.findRecordById('albums', albumId);
      const latestSnapshotCoverName = String(latestBatch.get('snapshotCoverName') || '');
      const latestSnapshotFileName = readSingleFileName(latestBatch, 'snapshotFile');

      if (latestSnapshotCoverName === '__none__') {
        latestAlbum.set('cover', '');
        e.app.save(latestAlbum);
      } else if (latestSnapshotCoverName) {
        if (!latestSnapshotFileName) {
          throw new Error('snapshot file missing');
        }

        let latestSnapshotFilesystem = null;
        try {
          latestSnapshotFilesystem = e.app.newFilesystem();
          latestAlbum.set(
            'cover',
            latestSnapshotFilesystem.getReuploadableFile(
              latestBatch.baseFilesPath() + '/' + latestSnapshotFileName,
              true
            )
          );
          e.app.save(latestAlbum);
        } finally {
          if (latestSnapshotFilesystem) {
            latestSnapshotFilesystem.close();
          }
        }
      }

      if (latestSnapshotCoverName || latestSnapshotFileName) {
        latestBatch.set('snapshotCoverName', '');
        latestBatch.set('snapshotFile', '');
      }

      if (latestStatus === 'cancelling') {
        latestBatch.set('status', 'cancelled');
      }

      e.app.save(latestBatch);
    } catch (error) {
      console.log('[upload batch] late album cover rollback failed:', latestBatch.id, error);
    }

    throw new BadRequestError('上传批次已取消，请刷新页面后重试.');
  }

  return e.json(200, {
    id: album.id,
    cover: album.get('cover'),
    updated: album.get('updated'),
  });
});

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

cronAdd('gallery-upload-batch-cancel-cleanup', '*/10 * * * *', () => {
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
      const readSingleFileName = (record, fieldName) => {
        const value = record.get(fieldName);
        if (Array.isArray(value)) {
          return String(value[0] || '');
        }
        return String(value || '');
      };

      let shouldSaveBatch = false;
      let cleanupSucceeded = true;
      const targetType = String(batch.get('targetType') || '');

      if (targetType === 'gallery') {
        while (true) {
          const records = $app.findRecordsByFilter('gallery_images', 'uploadBatchId = {:batchId}', '-created', 500, 0, {
            batchId: batch.id,
          });
          if (!records.length) {
            break;
          }

          for (const record of records) {
            $app.delete(record);
          }
        }
      } else if (targetType === 'album') {
        const targetId = String(batch.get('targetId') || '');
        const snapshotCoverName = String(batch.get('snapshotCoverName') || '');
        const snapshotFileName = readSingleFileName(batch, 'snapshotFile');

        if (targetId && targetId !== 'new' && snapshotCoverName) {
          const album = $app.findRecordById('albums', targetId);

          if (snapshotCoverName === '__none__') {
            album.set('cover', '');
            $app.save(album);
          } else {
            if (!snapshotFileName) {
              throw new Error('snapshot file missing');
            }

            let snapshotFilesystem = null;
            try {
              snapshotFilesystem = $app.newFilesystem();
              album.set(
                'cover',
                snapshotFilesystem.getReuploadableFile(batch.baseFilesPath() + '/' + snapshotFileName, true)
              );
              $app.save(album);
            } finally {
              if (snapshotFilesystem) {
                snapshotFilesystem.close();
              }
            }
          }
        }

        if (snapshotCoverName || snapshotFileName) {
          batch.set('snapshotCoverName', '');
          batch.set('snapshotFile', '');
          shouldSaveBatch = true;
        }
      }

      if (cleanupSucceeded && String(batch.get('status') || '') === 'cancelling') {
        batch.set('status', 'cancelled');
        shouldSaveBatch = true;
      }

      if (shouldSaveBatch) {
        $app.save(batch);
      }
    } catch (error) {
      console.log('[gallery upload batch] cron cleanup failed:', batch.id, error);
    }
  }
});
