export interface Gallery {
    id: string;
    collectionId: string;
    collectionName: string;
    created: string;
    updated: string;
    title: string;
    slug?: string;
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
    slug?: string;
    content: string; // Markdown content
    description?: string;
    published?: boolean;
    date: string;
}

export interface Song {
    id: string;
    collectionId: string;
    collectionName: string;
    created: string;
    updated: string;
    title: string;
    index: number;
    album: string;
    artist: string;
    releaseDate: string;
    lyricist?: string;
    composer?: string;
    lyrics?: string; // 对应 JSON 中的 lyric
    credits?: string;
    description?: string;
    links?: { name: string; url: string }[];
    otherLinks?: { name: string; url: string }[];
}

export interface Album {
    id: string;
    collectionId: string;
    collectionName: string;
    created: string;
    updated: string;
    title: string;
    releaseDate: string;
    cover?: string;
    description?: string;
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
