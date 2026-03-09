import { pb } from '@/lib/pocketbase';

export const USER_SKIP_SINGLE_LOCK_DELETE_CONFIRM_FIELD = 'skipSingleLockDeleteConfirm';

type AuthUserRecord = {
	id: string;
	[USER_SKIP_SINGLE_LOCK_DELETE_CONFIRM_FIELD]?: boolean;
};

function getCurrentAuthUserRecord(): AuthUserRecord | null {
	return (pb.authStore.record as AuthUserRecord | null) ?? null;
}

export function getSkipSingleLockDeleteConfirmPreference(): boolean {
	return Boolean(getCurrentAuthUserRecord()?.[USER_SKIP_SINGLE_LOCK_DELETE_CONFIRM_FIELD]);
}

export async function updateSkipSingleLockDeleteConfirmPreference(skip: boolean): Promise<boolean> {
	const currentUser = getCurrentAuthUserRecord();
	if (!currentUser?.id) {
		throw new Error('当前未登录，无法保存用户设置。');
	}

	const updatedUser = await pb.collection('users').update(currentUser.id, {
		[USER_SKIP_SINGLE_LOCK_DELETE_CONFIRM_FIELD]: skip,
	});

	pb.authStore.save(pb.authStore.token, updatedUser);
	return Boolean(updatedUser[USER_SKIP_SINGLE_LOCK_DELETE_CONFIRM_FIELD]);
}
