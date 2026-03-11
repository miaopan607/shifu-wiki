import { pb } from '@/lib/pocketbase';

export type UploadBatchStatus = 'open' | 'cancelling' | 'completed' | 'cancelled';

interface UploadBatchResponse {
  id: string;
  status: UploadBatchStatus;
  targetType: 'gallery' | 'song';
  targetId: string;
  targetName: string;
}

type CreateUploadBatchPayload = {
  targetType: 'gallery' | 'song';
  targetId: string;
  targetName: string;
};

export async function createUploadBatch(payload: CreateUploadBatchPayload): Promise<UploadBatchResponse> {
  return pb.send<UploadBatchResponse>('/api/shifu/upload-batches', {
    method: 'POST',
    body: payload,
    requestKey: null,
  });
}

export async function cancelUploadBatch(batchId: string): Promise<UploadBatchResponse> {
  return pb.send<UploadBatchResponse>(`/api/shifu/upload-batches/${batchId}/cancel`, {
    method: 'POST',
    requestKey: null,
  });
}

export async function completeUploadBatch(batchId: string): Promise<UploadBatchResponse> {
  return pb.send<UploadBatchResponse>(`/api/shifu/upload-batches/${batchId}/complete`, {
    method: 'POST',
    requestKey: null,
  });
}
