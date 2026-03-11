export interface Gallery {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  title: string;
  index: number;
  description?: string;
  published?: boolean;
  date: string; // ISO8601 string from PocketBase Date/Time field
}

export interface GalleryImage {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  image: string;
  gallery: string; // Relation ID
  sort?: number;
  uploadBatchId?: string;
  clientUploadId?: string;
  expand?: {
    gallery?: Gallery;
  };
}

export interface Misc {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  title: string;
  index: number;
  content: string; // Markdown content
  description?: string;
  published?: boolean;
}

export interface AlbumDisc {
  disc: number;
  name?: string; // Disc名称，如 "Disc 1"、"CD 1"、"DVD" 等
  songs: string[]; // Song record IDs
}

export interface Song {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  title: string;
  index: number;
  artist: string;
  releaseDate: string;
  lyricist?: string;
  composer?: string;
  lyrics?: string; // 对应 JSON 中的 lyric
  credits?: string;
  description?: string;
  links?: { name: string; url: string }[];
  otherLinks?: { name: string; url: string }[];
  defaultAlbum?: string; // Relation ID → albums
  defaultAlbumName?: string; // 专辑名称文本（站内无此专辑时使用）
  defaultCover?: string; // 空=缺省封面, 'album'=专辑封面, 'song_cover:{id}'=某张自有封面
  qqId?: string; // QQ音乐ID
  neteaseId?: string; // 网易云音乐ID
  enabledPlatform?: 'qq' | 'netease' | ''; // 启用的平台
}

export interface SongCover {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  image: string;
  song: string; // Relation ID
  sort?: number;
  uploadBatchId?: string;
  clientUploadId?: string;
}

export interface Album {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  title: string;
  index: number;
  releaseDate: string;
  description?: string;
  cover?: string; // 单封面文件名
  tracks?: AlbumDisc[];
}

// 活动时间段类型
export interface ActivityTimeSlot {
  type: 'datetime' | 'date'; // datetime=详细时间, date=仅日期
  start: string; // ISO8601 格式或 YYYY-MM-DD
  end?: string; // 可选的结束时间
}

// 默认时间段输入模式配置
export const DEFAULT_TIME_INPUT_MODE: 'datetime' | 'date' = 'datetime';

export interface Activity {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  title: string;
  index: number;
  timeSlots?: ActivityTimeSlot[]; // 多个时间段（替代原来的 date 字段）
  location?: string;
  tags?: string[];
  description?: string;
}
