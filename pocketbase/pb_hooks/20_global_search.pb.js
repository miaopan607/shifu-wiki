// pb_hooks/20_global_search.pb.js
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

  // Helper function to build a safe LIKE expression pattern
  // We don't need % for the ~ operator in PocketBase filter syntax
  // As it automatically does a LIKE %keyword% match when using ~
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
    // 1. Search Songs
    const songs = $app.findRecordsByFilter(
      'songs',
      'title ~ {:keyword} || artist ~ {:keyword} || album ~ {:keyword} || lyricist ~ {:keyword} || composer ~ {:keyword} || lyrics ~ {:keyword} || credits ~ {:keyword} || description ~ {:keyword}',
      '-releaseDate',
      limit,
      0,
      bindings
    );
    for (const record of songs) {
      results.songs.push({
        id: record.id,
        title: record.get('title'),
        album: record.get('album'),
        artist: record.get('artist'),
        index: record.get('index'),
      });
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
