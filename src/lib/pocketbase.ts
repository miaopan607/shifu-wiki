import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_POCKETBASE_URL;
export const pb = new PocketBase(PB_URL);

pb.autoCancellation(false);

type SongLink = {
  name?: string;
  url?: string;
};

type SongLikeRecord = {
  links?: SongLink[];
  otherLinks?: SongLink[];
};

const mapSongLinks = (links: SongLink[] | undefined, mapName: (name: string) => string) => {
  if (!Array.isArray(links)) return links;
  return links.map(link => ({
    ...link,
    name: mapName(link.name || ''),
  }));
};

export const decodeSongLinkNames = <T>(record: T): T => {
  const songRecord = record as T & SongLikeRecord;
  return {
    ...record,
    links: mapSongLinks(songRecord.links, name => name.replace(/\\n/g, '\n')),
    otherLinks: mapSongLinks(songRecord.otherLinks, name => name.replace(/\\n/g, '\n')),
  } as T;
};

export const encodeSongLinkNames = <T>(record: T): T => {
  const songRecord = record as T & SongLikeRecord;
  return {
    ...record,
    links: mapSongLinks(songRecord.links, name => name.replace(/\n/g, '\n')),
    otherLinks: mapSongLinks(songRecord.otherLinks, name => name.replace(/\n/g, '\n')),
  } as T;
};

// 日期格式工具函数
// 将各种日期格式统一转换为 YYYY/MM/DD 格式用于展示
export const formatDateToDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  // PocketBase 返回的日期格式可能是 "YYYY-MM-DD HH:MM:SS.SSSZ"
  // 我们只取日期部分并显示为 YYYY/MM/DD
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    // 降级处理：尝试直接字符串分割
    const datePart = dateStr.split(' ')[0];
    return datePart ? datePart.replace(/-/g, '/') : dateStr;
  }
};

// 将日期时间格式转换为 YYYY/MM/DD HH:mm 格式用于展示
export const formatDateTimeToDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
};

// 将日期时间格式转换为 HH:mm 格式用于展示（仅时间）
export const formatTimeToDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
};

// 将日期转换为 YYYY-MM-DD 00:00:00.000Z 格式用于存储到 PocketBase date 类型字段
export const normalizeDateForStorage = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // 提取数字：YYYYMMDD 或 YYYY/MM/DD 或 YYYY-MM-DD
  const digits = dateStr.replace(/\D/g, '');
  if (digits.length < 8) return dateStr;
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  // PocketBase 的 date 类型字段建议使用 YYYY-MM-DD HH:MM:SS 格式
  // 用户要求只用到日期的就把时间定为零点
  return `${year}-${month}-${day} 00:00:00.000Z`;
};

// 处理从后端获取的日期，兼容新老格式
export const parseDateFromBackend = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // 后端返回的是 ISO8601 或 YYYY-MM-DD HH:MM:SS
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // 降级：如果不是标准日期，尝试按空格分割
      const part = dateStr.split(' ')[0];
      return part ? part.replace(/-/g, '/') : '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    return '';
  }
};

// 将后端的日期时间格式转换为 datetime-local 输入格式 (YYYY-MM-DDTHH:mm)
export const parseDateTimeFromBackend = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    // 转换为本地时间字符串格式 YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
};

// 将 datetime-local 格式转换为 ISO 格式存储
export const normalizeDateTimeForStorage = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString();
  } catch {
    return '';
  }
};
