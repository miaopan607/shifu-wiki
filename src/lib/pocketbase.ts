import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:1213';
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
        links: mapSongLinks(songRecord.links, name => name.replace(/\n/g, '\\n')),
        otherLinks: mapSongLinks(songRecord.otherLinks, name => name.replace(/\n/g, '\\n')),
    } as T;
};
