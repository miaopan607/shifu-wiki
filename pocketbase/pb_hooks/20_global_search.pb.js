// pb_hooks/20_global_search.pb.js
const parseTracks = value => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
};

routerAdd('GET', '/api/shifu/search', e => {
  const q = e.request.url.query().get('q') || '';
  const keyword = String(q).trim();

  if (!keyword) {
    return e.json(200, {
      songs: [],
      albums: [],
      activities: [],
      galleries: [],
      misc: [],
    });
  }

  const bindings = { keyword: keyword };

  const results = {
    songs: [],
    albums: [],
    activities: [],
    galleries: [],
    misc: [],
  };

  const limit = 10; // limit per category

  try {
    // 1. Search Songs - direct field matching
    const songs = $app.findRecordsByFilter(
      'songs',
      'title ~ {:keyword} || artist ~ {:keyword} || defaultAlbumName ~ {:keyword} || lyricist ~ {:keyword} || composer ~ {:keyword} || lyrics ~ {:keyword} || credits ~ {:keyword} || description ~ {:keyword}',
      '-releaseDate',
      limit,
      0,
      bindings
    );
    const foundSongIds = new Set();
    for (const record of songs) {
      foundSongIds.add(record.id);
      results.songs.push({
        id: record.id,
        title: record.get('title'),
        artist: record.get('artist'),
        defaultAlbumName: record.get('defaultAlbumName'),
        index: record.get('index'),
      });
    }

    // 1b. Also find songs via associated album titles (albums.tracks reverse lookup)
    if (results.songs.length < limit) {
      try {
        const matchingAlbums = $app.findRecordsByFilter('albums', 'title ~ {:keyword}', '', 50, 0, bindings);
        for (const album of matchingAlbums) {
          if (results.songs.length >= limit) break;
          const tracks = parseTracks(album.get('tracks'));
          if (tracks.length === 0) continue;
          for (const disc of tracks) {
            if (results.songs.length >= limit) break;
            if (!disc.songs || !Array.isArray(disc.songs)) continue;
            for (const songId of disc.songs) {
              if (results.songs.length >= limit) break;
              if (foundSongIds.has(songId)) continue;
              try {
                const songRecord = $app.findRecordById('songs', songId);
                foundSongIds.add(songId);
                results.songs.push({
                  id: songRecord.id,
                  title: songRecord.get('title'),
                  artist: songRecord.get('artist'),
                  defaultAlbumName: songRecord.get('defaultAlbumName') || album.get('title'),
                  index: songRecord.get('index'),
                });
              } catch (songErr) {
                // Song referenced in tracks may have been deleted
              }
            }
          }
        }
      } catch (albumErr) {
        console.log('Error querying albums for song search:', albumErr);
      }
    }
  } catch (err) {
    console.log('Error querying songs: ', err);
  }

  try {
    // 2. Search Albums
    const albums = $app.findRecordsByFilter(
      'albums',
      'title ~ {:keyword} || description ~ {:keyword}',
      '-releaseDate',
      limit,
      0,
      bindings
    );
    for (const record of albums) {
      results.albums.push({
        id: record.id,
        title: record.get('title'),
        releaseDate: record.get('releaseDate'),
        description: record.get('description'),
        index: record.get('index'),
        cover: record.getString('cover'),
      });
    }
  } catch (err) {
    console.log('Error querying albums: ', err);
  }

  try {
    // 3. Search Activities
    const activities = $app.findRecordsByFilter(
      'activities',
      'title ~ {:keyword} || location ~ {:keyword} || tags ~ {:keyword}',
      '-date',
      limit,
      0,
      bindings
    );
    for (const record of activities) {
      results.activities.push({
        id: record.id,
        title: record.get('title'),
        index: record.get('index'),
        date: record.get('date'),
        location: record.get('location'),
      });
    }
  } catch (err) {
    console.log('Error querying activities: ', err);
  }

  try {
    // 4. Search Galleries
    const galleries = $app.findRecordsByFilter(
      'galleries',
      '(title ~ {:keyword} || description ~ {:keyword}) && published = true',
      '-date',
      limit,
      0,
      bindings
    );
    for (const record of galleries) {
      results.galleries.push({
        id: record.id,
        title: record.get('title'),
        date: record.get('date'),
        index: record.get('index'),
        description: record.get('description'),
      });
    }
  } catch (err) {
    console.log('Error querying galleries: ', err);
  }

  try {
    // 5. Search Misc
    const misc = $app.findRecordsByFilter(
      'misc',
      '(title ~ {:keyword} || content ~ {:keyword} || description ~ {:keyword}) && published = true',
      '-created',
      limit,
      0,
      bindings
    );
    for (const record of misc) {
      results.misc.push({
        id: record.id,
        title: record.get('title'),
        date: record.get('created'),
        index: record.get('index'),
        description: record.get('description'),
      });
    }
  } catch (err) {
    console.log('Error querying misc: ', err);
  }

  return e.json(200, results);
});
