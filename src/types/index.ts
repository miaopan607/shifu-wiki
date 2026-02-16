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
    index: string; // Using index instead of slug
    content: string; // Markdown content
    description?: string;
    published?: boolean;
}
