import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// PocketBase 客户端
const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');

const CACHE_DIR = process.env.CACHE_DIR ? path.resolve(process.env.CACHE_DIR) : path.join(__dirname, 'data');
const CACHE_FILE = process.env.CACHE_FILE
  ? path.resolve(process.env.CACHE_FILE)
  : path.join(CACHE_DIR, 'music-cache.json');

// --- 缓存逻辑 ---
let musicCache = {};

function ensureCacheDir() {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
}

function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      musicCache = JSON.parse(data);
      console.log(`[Cache] Loaded ${Object.keys(musicCache).length} cached songs.`);
    } catch (e) {
      console.error('[Cache] Failed to load music cache:', e);
      musicCache = {};
    }
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(musicCache, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Cache] Failed to save music cache:', e);
  }
}

// 初始加载缓存
ensureCacheDir();
loadCache();

function getFromCache(type, id) {
  const key = `${type}:${id}`;
  return musicCache[key] || null;
}

function setToCache(type, id, data) {
  const key = `${type}:${id}`;
  // 限制缓存数量
  if (Object.keys(musicCache).length >= 10000) {
    const firstKey = Object.keys(musicCache)[0];
    delete musicCache[firstKey];
  }
  musicCache[key] = data;
  saveCache();
}

// --- API路由 ---

/**
 * 获取音乐播放链接
 * GET /api/music/play?id=xxx
 * 参数：id - 歌曲数据库ID
 */
app.get('/api/music/play', async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: id',
    });
  }

  try {
    // 从数据库查询歌曲信息
    const song = await pb.collection('songs').getOne(id.toString());

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found',
      });
    }

    // 检查是否有启用的平台
    const platform = song.enabledPlatform;
    if (!platform) {
      return res.status(400).json({
        success: false,
        message: 'No enabled platform for this song',
      });
    }

    // 获取对应平台的 ID
    let platformId = '';
    if (platform === 'qq' && song.qqId) {
      platformId = song.qqId;
    } else if (platform === 'netease' && song.neteaseId) {
      platformId = song.neteaseId;
    } else {
      return res.status(400).json({
        success: false,
        message: `Missing ${platform} ID for this song`,
      });
    }

    // 检查缓存
    const cachedMusic = getFromCache(platform, platformId);
    if (cachedMusic) {
      console.log(`[Cache] Hit for ${platform}:${platformId}`);
      return res.json({
        success: true,
        platform: platform,
        ...cachedMusic,
      });
    }

    // 获取播放数据
    let musicData = null;
    if (platform === 'qq') {
      musicData = await getQQMusicPlayData(platformId);
    } else if (platform === 'netease') {
      musicData = await getNeteaseMusicPlayData(platformId);
    } else {
      return res.status(400).json({
        success: false,
        message: `Unsupported platform: ${platform}`,
      });
    }

    if (musicData) {
      // 写入缓存
      setToCache(platform, platformId, musicData);

      return res.json({
        success: true,
        platform: platform,
        ...musicData,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Failed to fetch music data',
      });
    }
  } catch (error) {
    console.error('Music API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch music data',
    });
  }
});

// --- QQ音乐处理逻辑 ---

/**
 * 通过 ID/MID 获取QQ音乐播放数据
 */
async function getQQMusicPlayData(id) {
  try {
    // 判断 ID 类型
    const isSongMid = isNaN(Number(id));
    console.log(`[QQ Music] Fetching for ID: ${id} (isMid: ${isSongMid})`);

    // 构造 API 请求体
    const payload = {
      comm: { ct: 24, cv: 0 },
      songinfo: {
        method: 'get_song_detail_yqq',
        module: 'music.pf_song_detail_svr',
        param: {
          song_mid: isSongMid ? id : '',
          song_id: isSongMid ? 0 : parseInt(id),
        },
      },
    };

    const apiUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Referer: 'https://y.qq.com/',
      },
    });
    const json = await response.json();

    const trackInfo = json?.songinfo?.data?.track_info;

    if (!trackInfo) {
      console.error('[QQ Music] Metadata not found for ID:', id);
      return null;
    }

    // 获取播放链接
    const mid = trackInfo.mid;
    const mediaId = trackInfo.file ? trackInfo.file.media_mid : trackInfo.mid;
    const playUrl = await getQQMusicPlayUrl(mid, mediaId);

    return {
      musicId: mid,
      name: trackInfo.name,
      artists: trackInfo.singer ? trackInfo.singer.map(s => s.name) : [],
      musicUrl: playUrl || '',
      cover: trackInfo.album ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${trackInfo.album.mid}.jpg` : '',
    };
  } catch (e) {
    console.error('[QQ Music] Error in getQQMusicPlayData:', e);
    return null;
  }
}

/**
 * 获取QQ音乐播放链接
 */
async function getQQMusicPlayUrl(mid, mediaId) {
  const guid = Math.floor(Math.random() * 10000000000).toString();
  const filename = mediaId ? `C400${mediaId}.m4a` : `C400${mid}.m4a`;

  const payload = {
    req: {
      module: 'CDN.SrfCdnDispatchServer',
      method: 'GetCdnDispatch',
      param: { guid, calltype: 0, userip: '' },
    },
    req_0: {
      module: 'vkey.GetVkeyServer',
      method: 'CgiGetVkey',
      param: {
        guid,
        songmid: [mid],
        songtype: [0],
        uin: '0',
        loginflag: 1,
        platform: '20',
        filename: [filename],
      },
    },
    comm: { uin: 0, format: 'json', ct: 24, cv: 0 },
  };

  try {
    const apiUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
    const res = await fetch(apiUrl, {
      headers: {
        Referer: 'https://y.qq.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const json = await res.json();

    const midurlinfos = json?.req_0?.data?.midurlinfo;
    const sip = 'https://aqqmusic.tc.qq.com/amobile.music.tc.qq.com/';

    if (midurlinfos && midurlinfos[0] && midurlinfos[0].purl) {
      return sip + midurlinfos[0].purl;
    }

    // Fallback
    if (json?.req?.data?.vkey) {
      const vkey = json.req.data.vkey;
      console.log(`[QQ Music] Using fallback vkey for: ${filename}`);
      return `${sip}${filename}?vkey=${vkey}&guid=${guid}&uin=0&fromtag=66`;
    }
  } catch (e) {
    console.error('[QQ Music] Error fetching VKey:', e);
  }
  return null;
}

// --- 网易云音乐处理逻辑 ---

/**
 * 获取网易云音乐播放数据
 */
async function getNeteaseMusicPlayData(id) {
  try {
    let musicId = id.toString();

    // 如果是链接，提取 ID
    if (musicId.startsWith('http')) {
      const match = musicId.match(/id=(\d+)/);
      if (match) {
        musicId = match[1];
      }
    }

    console.log(`[Netease Music] Fetching for ID: ${musicId}`);

    // 获取歌曲详情
    const apiUrl = `https://music.163.com/api/song/detail/?id=${musicId}&ids=[${musicId}]`;
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Referer: 'https://music.163.com/',
      },
    });
    const data = await response.json();

    if (data.songs && data.songs.length > 0) {
      const song = data.songs[0];

      return {
        musicId: musicId,
        name: song.name,
        artists: song.artists ? song.artists.map(a => a.name) : [],
        // 使用外链播放器直链
        musicUrl: `https://music.163.com/song/media/outer/url?id=${musicId}.mp3`,
        cover: song.album ? song.album.picUrl : '',
      };
    }
  } catch (e) {
    console.error('[Netease Music] Error in getNeteaseMusicPlayData:', e);
  }
  return null;
}

// --- 启动服务器 ---
app.listen(PORT, () => {
  console.log(`🎵 Music Backend is running at http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/music/play`);
});
