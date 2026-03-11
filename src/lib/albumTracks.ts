import type { AlbumDisc } from '@/types';

const parseRawTracks = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeSongs = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((songId): songId is string => typeof songId === 'string')
        .map(songId => songId.trim())
        .filter(Boolean)
    )
  );
};

export const normalizeAlbumTracks = (value: unknown): AlbumDisc[] => {
  const parsed = parseRawTracks(value);

  const result: AlbumDisc[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;

    const { disc, name, songs } = entry as { disc?: unknown; name?: unknown; songs?: unknown };
    const discNumber = Number(disc);

    const discItem: AlbumDisc = {
      disc: Number.isInteger(discNumber) && discNumber > 0 ? discNumber : i + 1,
      songs: normalizeSongs(songs),
    };

    if (typeof name === 'string' && name.trim()) {
      discItem.name = name.trim();
    }

    result.push(discItem);
  }

  return result.sort((a, b) => a.disc - b.disc);
};
