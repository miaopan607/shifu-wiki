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
