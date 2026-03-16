// === Batch Operations for Gallery Images ===

// Batch delete gallery images
// POST /api/shifu/gallery-images/batch-delete
// Body: { ids: string[] }
// Response: { deleted: number, failed: string[] }
routerAdd('POST', '/api/shifu/gallery-images/batch-delete', e => {
  if (!e.auth) {
    throw new UnauthorizedError('请先登录');
  }

  const data = new DynamicModel({
    ids: [],
  });

  e.bindBody(data);

  const ids = data.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return e.json(200, { deleted: 0, failed: [] });
  }

  let deleted = 0;
  const failed = [];

  for (const id of ids) {
    if (typeof id !== 'string' || !id) {
      failed.push(id);
      continue;
    }

    try {
      const record = e.app.findRecordById('gallery_images', id);
      e.app.delete(record);
      deleted++;
    } catch (err) {
      console.log('[batch-delete] failed to delete gallery_image:', id, err);
      failed.push(id);
    }
  }

  return e.json(200, { deleted, failed, total: ids.length });
});

// Batch update gallery images sort order
// POST /api/shifu/gallery-images/batch-update-sort
// Body: { items: { id: string, sort: number }[] }
// Response: { updated: number, failed: string[] }
routerAdd('POST', '/api/shifu/gallery-images/batch-update-sort', e => {
  if (!e.auth) {
    throw new UnauthorizedError('请先登录');
  }

  const data = new DynamicModel({
    items: [],
  });

  e.bindBody(data);

  const items = data.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    return e.json(200, { updated: 0, failed: [] });
  }

  let updated = 0;
  const failed = [];

  for (const item of items) {
    const id = item.id;
    const sort = item.sort;

    if (typeof id !== 'string' || !id) {
      failed.push(id);
      continue;
    }

    try {
      const record = e.app.findRecordById('gallery_images', id);
      record.set('sort', sort);
      e.app.save(record);
      updated++;
    } catch (err) {
      console.log('[batch-update-sort] failed:', id, err);
      failed.push(id);
    }
  }

  return e.json(200, { updated, failed, total: items.length });
});
