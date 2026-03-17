// === Batch Operations for Songs ===

// Batch update songs display info (defaultAlbum, defaultAlbumName, defaultCover)
// POST /api/shifu/songs/batch-update-display
// Body: { items: { id: string, defaultAlbum?: string, defaultAlbumName?: string, defaultCover?: string }[] }
// Response: { updated: number, failed: string[] }
routerAdd('POST', '/api/shifu/songs/batch-update-display', e => {
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
    if (typeof id !== 'string' || !id) {
      failed.push(id);
      continue;
    }

    try {
      const record = e.app.findRecordById('songs', id);

      if (item.defaultAlbum !== undefined) {
        record.set('defaultAlbum', String(item.defaultAlbum || ''));
      }
      if (item.defaultAlbumName !== undefined) {
        record.set('defaultAlbumName', String(item.defaultAlbumName || ''));
      }
      if (item.defaultCover !== undefined) {
        record.set('defaultCover', String(item.defaultCover || ''));
      }

      e.app.save(record);
      updated++;
    } catch (err) {
      console.log('[batch-update-display] failed for song:', id, err);
      failed.push(id);
    }
  }

  return e.json(200, { updated, failed, total: items.length });
});
