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
  // 兼容 YYYY-MM-DD 和 YYYY/MM/DD 格式
  const normalized = dateStr.replace(/-/g, '/');
  try {
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    return dateStr;
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

// 将日期转换为 YYYY/MM/DD 格式用于存储
export const normalizeDateForStorage = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // 移除所有非数字字符，然后格式化为 YYYY/MM/DD
  const digits = dateStr.replace(/\D/g, '');
  if (digits.length !== 8) return dateStr;
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return `${year}/${month}/${day}`;
};

// 处理从后端获取的日期，兼容新老格式
export const parseDateFromBackend = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // 后端可能返回 YYYY-MM-DD HH:MM:SS 或 YYYY/MM/DD 格式
  // 先取日期部分
  const datePart = dateStr.split(' ')[0];
  if (!datePart) return '';
  // 将 - 替换为 / 以统一格式
  return datePart.replace(/-/g, '/');
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
