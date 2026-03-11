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
  date: string;
}

export interface AlbumDisc {
  disc: number;
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

export interface Activity {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  title: string;
  index: number;
  date: string;
  location?: string;
  tags?: string[];
  content?: string;
}
