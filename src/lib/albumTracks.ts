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

  return parsed
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;

      const { disc, songs } = entry as { disc?: unknown; songs?: unknown };
      const discNumber = Number(disc);

      return {
        disc: Number.isInteger(discNumber) && discNumber > 0 ? discNumber : index + 1,
        songs: normalizeSongs(songs),
      };
    })
    .filter((disc): disc is AlbumDisc => disc !== null)
    .sort((a, b) => a.disc - b.disc);
};
