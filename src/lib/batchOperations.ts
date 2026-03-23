import { pb } from '@/lib/pocketbase';

export interface BatchDeleteResponse {
  deleted: number;
  failed: string[];
  total: number;
}

export interface BatchUpdateSortResponse {
  updated: number;
  failed: string[];
  total: number;
}

export interface SortItem {
  id: string;
  sort: number;
}

export interface SongDisplayUpdateItem {
  id: string;
  defaultAlbum?: string;
  defaultAlbumName?: string;
  defaultCover?: string;
}

// === Gallery Images ===

export async function batchDeleteGalleryImages(ids: string[]): Promise<BatchDeleteResponse> {
  return pb.send<BatchDeleteResponse>('/api/shifu/gallery-images/batch-delete', {
    method: 'POST',
    body: { ids },
    requestKey: null,
  });
}

export async function batchUpdateGalleryImageSort(items: SortItem[]): Promise<BatchUpdateSortResponse> {
  return pb.send<BatchUpdateSortResponse>('/api/shifu/gallery-images/batch-update-sort', {
    method: 'POST',
    body: { items },
    requestKey: null,
  });
}

// === Song Covers ===

export async function batchDeleteSongCovers(ids: string[]): Promise<BatchDeleteResponse> {
  return pb.send<BatchDeleteResponse>('/api/shifu/song-covers/batch-delete', {
    method: 'POST',
    body: { ids },
    requestKey: null,
  });
}

// === Album Covers ===

export async function batchDeleteAlbumCovers(ids: string[]): Promise<BatchDeleteResponse> {
  return pb.send<BatchDeleteResponse>('/api/shifu/album-covers/batch-delete', {
    method: 'POST',
    body: { ids },
    requestKey: null,
  });
}

// === Edit Locks ===

export async function batchDeleteEditLocks(ids: string[]): Promise<BatchDeleteResponse> {
  return pb.send<BatchDeleteResponse>('/api/shifu/edit-locks/batch-delete', {
    method: 'POST',
    body: { ids },
    requestKey: null,
  });
}

// === Songs Display Info ===

export async function batchUpdateSongsDisplay(items: SongDisplayUpdateItem[]): Promise<BatchUpdateSortResponse> {
  return pb.send<BatchUpdateSortResponse>('/api/shifu/songs/batch-update-display', {
    method: 'POST',
    body: { items },
    requestKey: null,
  });
}
