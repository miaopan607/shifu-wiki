import { pb } from '@/lib/pocketbase';

export type EditLockRecord = {
  id: string;
  collection: string;
  recordId: string;
  userId?: string;
  username?: string;
  updated?: string;
  created?: string;
};

export function formatEditLockDateTime(value?: string | null): string {
  if (!value) return '未知';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function getCurrentLockUsername(): string {
  const record = pb.authStore.record as Record<string, unknown> | null;
  const candidates = [record?.username, record?.name, record?.email];
  const displayName = candidates.find(value => typeof value === 'string' && value.trim().length > 0);
  return typeof displayName === 'string' ? displayName.trim() : '未知用户';
}

async function listLocks(collection: string, recordId: string): Promise<EditLockRecord[]> {
  return (await pb.collection('edit_locks').getFullList({
    filter: `collection = "${collection}" && recordId = "${recordId}"`,
    sort: '-updated',
  })) as EditLockRecord[];
}

export async function acquireEditLock(
  collection: string,
  recordId: string
): Promise<{
  ok: boolean;
  lockId?: string;
  lockingUser?: string;
  conflictingLock?: EditLockRecord;
}> {
  const locks = await listLocks(collection, recordId);
  if (locks.length > 0) {
    return {
      ok: false,
      lockingUser: locks[0]?.username || '未知用户',
      conflictingLock: locks[0],
    };
  }

  const lock = await pb.collection('edit_locks').create({
    collection,
    recordId,
    userId: pb.authStore.record?.id,
    username: getCurrentLockUsername(),
  });

  return {
    ok: true,
    lockId: lock.id,
  };
}

export async function forceAcquireEditLock(
  collection: string,
  recordId: string,
  currentLockId: string | null | undefined
): Promise<{
  ok: boolean;
  lockId?: string;
}> {
  const locks = await listLocks(collection, recordId);
  const conflictingLocks = locks.filter(lock => lock.id !== currentLockId);

  if (conflictingLocks.length > 0) {
    await Promise.allSettled(conflictingLocks.map(lock => pb.collection('edit_locks').delete(lock.id)));
  }

  if (currentLockId) {
    const currentLockStillExists = locks.some(lock => lock.id === currentLockId);
    if (currentLockStillExists) {
      return {
        ok: true,
        lockId: currentLockId,
      };
    }
  }

  const lock = await pb.collection('edit_locks').create({
    collection,
    recordId,
    userId: pb.authStore.record?.id,
    username: getCurrentLockUsername(),
  });

  return {
    ok: true,
    lockId: lock.id,
  };
}

export async function releaseEditLock(lockId: string | null | undefined): Promise<void> {
  if (!lockId) return;
  await pb.collection('edit_locks').delete(lockId);
}

export async function findConflictingEditLock(
  collection: string,
  recordId: string,
  currentLockId: string | null | undefined
): Promise<EditLockRecord | null> {
  const locks = await listLocks(collection, recordId);
  return locks.find(lock => lock.id !== currentLockId) || null;
}
