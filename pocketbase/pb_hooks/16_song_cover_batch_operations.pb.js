// === Batch Operations for Song Covers ===

// Batch delete song covers
// POST /api/shifu/song-covers/batch-delete
// Body: { ids: string[] }
// Response: { deleted: number, failed: string[] }
routerAdd('POST', '/api/shifu/song-covers/batch-delete', e => {
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
      const record = e.app.findRecordById('song_covers', id);
      e.app.delete(record);
      deleted++;
    } catch (err) {
      console.log('[batch-delete] failed to delete song_cover:', id, err);
      failed.push(id);
    }
  }

  return e.json(200, { deleted, failed, total: ids.length });
});
