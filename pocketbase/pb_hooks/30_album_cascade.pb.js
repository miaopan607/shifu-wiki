// === Album Cascade: cleanup song references when album is deleted ===

// API endpoint to check how many songs reference a given album
routerAdd('GET', '/api/shifu/albums/{albumId}/referencing-songs', e => {
  if (!e.auth) {
    throw new UnauthorizedError('请先登录');
  }

  const albumId = e.request.pathValue('albumId');

  const songs = e.app.findRecordsByFilter('songs', 'defaultAlbum = {:albumId}', '', 0, 0, {
    albumId: albumId,
  });

  return e.json(200, {
    count: songs.length,
    songTitles: songs.slice(0, 10).map(s => String(s.get('title') || '')),
  });
});

// After album is deleted, clear defaultAlbum, defaultAlbumName, and defaultCover on affected songs
onRecordAfterDeleteSuccess(e => {
  const deletedAlbumId = e.record.id;

  try {
    const songs = e.app.findRecordsByFilter('songs', 'defaultAlbum = {:albumId}', '', 0, 0, {
      albumId: deletedAlbumId,
    });

    for (const song of songs) {
      song.set('defaultAlbum', '');
      song.set('defaultAlbumName', '');

      const defaultCover = String(song.get('defaultCover') || '');
      if (defaultCover === 'album') {
        song.set('defaultCover', '');
      }

      e.app.save(song);
    }

    if (songs.length > 0) {
      console.log(
        '[album cascade] cleared defaultAlbum on',
        songs.length,
        'songs after album deletion:',
        deletedAlbumId
      );
    }
  } catch (error) {
    console.log('[album cascade] failed to clean up songs after album deletion:', deletedAlbumId, error);
  }

  return e.next();
}, 'albums');
