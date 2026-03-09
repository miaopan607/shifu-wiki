<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pb, parseDateFromBackend, normalizeDateForStorage } from '@/lib/pocketbase';
import { marked } from 'marked';
import { acquireEditLock, findConflictingEditLock, forceAcquireEditLock, formatEditLockDateTime, releaseEditLock, type EditLockRecord } from '@/lib/editLock';
import { uploadStore } from '@/stores/uploadStore';
import EditLockConflictDialog from '@/components/EditLockConflictDialog.vue';
import VersionConflictDialog from '@/components/VersionConflictDialog.vue';
import type { Album } from '@/types';
import type { BatchUploadTask } from '@/types/upload';

const route = useRoute();
const router = useRouter();
const isEdit = ref(route.params.id !== undefined);
const loading = ref(false);
const saving = ref(false);
const datePicker = ref<HTMLInputElement | null>(null);
const showPreview = ref(false);
const titleError = ref('');
const error = ref('');
const lockWarning = ref('');
let isDisposed = false;
const showVersionConflictDialog = ref(false);
const latestConflictUpdated = ref<string | null>(null);
let versionConflictResolver: ((force: boolean) => void) | null = null;
const showEditLockConflictDialog = ref(false);
const editLockConflictMessage = ref('');
let editLockConflictResolver: ((force: boolean) => void) | null = null;

// 版本控制（用于冲突检测）
const originalUpdated = ref<string | null>(null);

// 当前批量上传任务
const currentBatchTask = ref<BatchUploadTask | null>(null);

// 当前编辑锁ID
const currentLockId = ref<string | null>(null);
const conflictingLock = ref<EditLockRecord | null>(null);
const takingOverLock = ref(false);

const album = ref<Partial<Album>>({
	title: '',
	releaseDate: '',
	description: '',
});

const renderMarkdown = (content: string | undefined) => {
	if (!content) return '';
	return marked.parse(content, { async: false }) as string;
};

const filterNewlines = (value: string) => {
	return value.replace(/\r\n|\r|\n/g, ' ');
};

// 封面相关
const coverPreview = ref<string | null>(null);
const coverFile = ref<File | null>(null);
const originalCoverUrl = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isCoverDragOver = ref(false);
const hasChanges = ref(false);
const coverMarkedForDeletion = ref(false);

// 是否有未保存的封面
const hasUnsavedCover = computed(() => coverFile.value !== null || coverMarkedForDeletion.value);

// 保存按钮可用条件
const canSave = computed(() => {
	return !saving.value && (album.value.title?.trim().length ?? 0) > 0;
});

const getLockWarningMessage = (lock?: EditLockRecord | null, fallbackUsername?: string): string => {
	const lockingUser = lock?.username?.trim() || fallbackUsername || '未知用户';
	const lockedAt = formatEditLockDateTime(lock?.created || lock?.updated);
	return `当前记录正在由 ${lockingUser} 编辑，加锁时间：${lockedAt}。`;
};

const setConflictingLockState = (lock: EditLockRecord | null, fallbackUsername?: string) => {
	conflictingLock.value = lock;
	lockWarning.value = lock || fallbackUsername ? getLockWarningMessage(lock, fallbackUsername) : '';
};

const requestEditLockConflictResolution = (message?: string): Promise<boolean> => {
	editLockConflictMessage.value = message || '仍有其他终端正在编辑此页面，请稍后再试。';
	showEditLockConflictDialog.value = true;

	return new Promise((resolve) => {
		editLockConflictResolver = resolve;
	});
};

const resolveEditLockConflict = (force: boolean) => {
	showEditLockConflictDialog.value = false;
	const resolver = editLockConflictResolver;
	editLockConflictResolver = null;
	resolver?.(force);
};

// 创建编辑锁
const createEditLock = async (): Promise<boolean> => {
	if (!isEdit.value) return true;
	if (currentLockId.value) return true;

	try {
		const result = await acquireEditLock('albums', route.params.id as string);
		if (!result.ok) {
			setConflictingLockState(result.conflictingLock || null, result.lockingUser);
			return false;
		}

		if (isDisposed && result.lockId) {
			await releaseEditLock(result.lockId);
			return false;
		}

		currentLockId.value = result.lockId || null;
		setConflictingLockState(null);
		return true;
	} catch (err) {
		console.error('Failed to create edit lock:', err);
		return true;
	}
};

const handoffEditLockToTask = async (task: BatchUploadTask, targetId: string) => {
	let lockId = currentLockId.value;

	if (!lockId) {
		const result = await acquireEditLock('albums', targetId);
		if (!result.ok || !result.lockId) {
			throw new Error(`无法为后台上传创建编辑锁：${result.lockingUser || '锁创建失败'}`);
		}
		lockId = result.lockId;
	}

	uploadStore.attachTaskLock(task.id, lockId, 'albums');
	currentLockId.value = null;
};

// 删除编辑锁
const removeEditLock = async () => {
	if (currentLockId.value) {
		try {
			await releaseEditLock(currentLockId.value);
		} catch (err) {
			console.error('Failed to remove edit lock:', err);
		}
		currentLockId.value = null;
	}

	setConflictingLockState(null);
};

onMounted(async () => {
	loading.value = true;
	try {
		if (isEdit.value) {
			const record = await pb.collection('albums').getOne(route.params.id as string);
			// 记录原始更新时间用于版本控制
			originalUpdated.value = record.updated;

			album.value = {
				...record,
				releaseDate: record.releaseDate ? parseDateFromBackend(record.releaseDate) : '',
			} as unknown as Album;

			if (record.cover) {
				const url = pb.files.getURL(record, record.cover, { thumb: '400x400' });
				coverPreview.value = url;
				originalCoverUrl.value = url;
			}
		}
	} catch (err) {
		console.error('Failed to initialize album edit:', err);
		error.value = '初始化失败';
		alert('初始化失败');
		router.push('/admin/albums');
	} finally {
		loading.value = false;
		if (isEdit.value && !error.value) {
			window.setTimeout(() => {
				void createEditLock();
			}, 0);
		}
	}
});

const setCoverFile = (file: File) => {
	if (!file.type.startsWith('image/')) {
		alert('仅支持图片文件');
		return;
	}

	// 如果已经有未保存的封面，先释放URL
	if (coverPreview.value && coverPreview.value.startsWith('blob:')) {
		URL.revokeObjectURL(coverPreview.value);
	}

	coverFile.value = file;
	coverPreview.value = URL.createObjectURL(file);
	coverMarkedForDeletion.value = false;
	markChanged();

	if (currentBatchTask.value) {
		uploadStore.replaceTaskFiles(currentBatchTask.value.id, {
			files: [file],
		});
		return;
	}

	currentBatchTask.value = uploadStore.addBatchTask({
		type: 'album_cover',
		targetId: (route.params.id as string) || 'new',
		targetType: 'album',
		targetName: album.value.title || '新建专辑',
		files: [file],
	});
};

const removeCover = () => {
	if (coverPreview.value && coverPreview.value.startsWith('blob:')) {
		URL.revokeObjectURL(coverPreview.value);
	}
	coverFile.value = null;
	coverMarkedForDeletion.value = true;
	markChanged();

	if (currentBatchTask.value) {
		uploadStore.discardTask(currentBatchTask.value.id);
		currentBatchTask.value = null;
	}
};

const cancelRemoveCover = () => {
	coverMarkedForDeletion.value = false;
	coverPreview.value = originalCoverUrl.value;
	markChanged();
};

const handleCoverChange = (event: Event) => {
	const input = event.target as HTMLInputElement;
	if (input.files && input.files[0]) {
		setCoverFile(input.files[0]);
	}
};

const handleCoverDragEnter = () => {
	isCoverDragOver.value = true;
};

const handleCoverDragLeave = () => {
	isCoverDragOver.value = false;
};

const handleCoverDrop = (event: DragEvent) => {
	isCoverDragOver.value = false;
	const file = event.dataTransfer?.files?.[0];
	if (file) {
		setCoverFile(file);
	}
};

const markChanged = () => {
	hasChanges.value = true;
};

// 检查编辑锁（提交时检测）
const checkEditLock = async (): Promise<string | null> => {
	if (!isEdit.value) return null;

	try {
		const lock = await findConflictingEditLock('albums', route.params.id as string, currentLockId.value);
		if (lock) {
			setConflictingLockState(lock);
			return getLockWarningMessage(lock);
		}

		setConflictingLockState(null);
		return null;
	} catch (err) {
		console.error('Failed to check edit lock:', err);
		return null;
	}
};

const ensureEditLock = async (): Promise<boolean> => {
	if (!isEdit.value || currentLockId.value) return true;
	return createEditLock();
};

const forceTakeoverEditLock = async (): Promise<boolean> => {
	if (!isEdit.value) return true;

	try {
		const result = await forceAcquireEditLock('albums', route.params.id as string, currentLockId.value);
		if (!result.ok || !result.lockId) {
			error.value = '无法强行接管编辑锁，请重试';
			return false;
		}

		currentLockId.value = result.lockId;
		setConflictingLockState(null);
		return true;
	} catch (err) {
		console.error('Failed to force acquire edit lock:', err);
		error.value = '无法强行接管编辑锁，请重试';
		return false;
	}
};

const takeOverConflictingEditLock = async () => {
	if (takingOverLock.value || currentLockId.value) {
		return;
	}

	takingOverLock.value = true;
	error.value = '';

	try {
		await forceTakeoverEditLock();
	} finally {
		takingOverLock.value = false;
	}
};

const latestEditPath = computed(() => {
	if (!isEdit.value) {
		return router.resolve({ name: 'admin-album-new' }).href;
	}

	return router.resolve({ name: 'admin-album-edit', params: { id: route.params.id as string } }).href;
});

const requestVersionConflictResolution = (latestUpdated?: string | null): Promise<boolean> => {
	latestConflictUpdated.value = latestUpdated || null;
	showVersionConflictDialog.value = true;

	return new Promise((resolve) => {
		versionConflictResolver = resolve;
	});
};

const resolveVersionConflict = (force: boolean) => {
	showVersionConflictDialog.value = false;
	const resolver = versionConflictResolver;
	versionConflictResolver = null;
	resolver?.(force);
};

// 检查版本冲突（提交时检测）
const checkVersionConflict = async (): Promise<{ hasConflict: boolean; currentUpdated?: string }> => {
	if (!isEdit.value || !originalUpdated.value) return { hasConflict: false };

	try {
		const current = await pb.collection('albums').getOne(route.params.id as string);

		if (current.updated !== originalUpdated.value) {
			return { hasConflict: true, currentUpdated: current.updated };
		}
		return { hasConflict: false };
	} catch (err) {
		console.error('Failed to check version:', err);
		return { hasConflict: false };
	}
};

const saveAlbum = async () => {
	titleError.value = '';
	error.value = '';

	if (!album.value.title?.trim()) {
		titleError.value = '专辑标题不能为空';
		return;
	}

	saving.value = true;

	try {
		// 1. 检查并处理编辑锁冲突
		const lockMessage = await checkEditLock();
		if (lockMessage) {
			saving.value = false;
			const shouldForceSubmit = await requestEditLockConflictResolution(lockMessage);
			if (!shouldForceSubmit) {
				return;
			}
			const tookOverLock = await forceTakeoverEditLock();
			if (!tookOverLock) {
				return;
			}
			saving.value = true;
		}

		const hasLock = await ensureEditLock();
		if (!hasLock) {
			saving.value = false;
			const shouldForceSubmit = await requestEditLockConflictResolution(lockWarning.value);
			if (!shouldForceSubmit) {
				return;
			}
			const tookOverLock = await forceTakeoverEditLock();
			if (!tookOverLock) {
				return;
			}
			saving.value = true;
		}

		// 2. 检查版本冲突
		const { hasConflict, currentUpdated } = await checkVersionConflict();
		if (hasConflict) {
			saving.value = false;
			const shouldForce = await requestVersionConflictResolution(currentUpdated);
			if (!shouldForce) {
				saving.value = false;
				return;
			}
			saving.value = true;
		}

		// 3. 保存专辑基本信息
		const formData = new FormData();
		formData.append('title', album.value.title.trim());
		formData.append('releaseDate', normalizeDateForStorage(album.value.releaseDate));
		formData.append('description', album.value.description || '');

		// 处理封面删除（仅编辑模式）
		if (isEdit.value && coverMarkedForDeletion.value) {
			formData.append('cover', '');
		}

		let targetAlbumId: string;

		if (isEdit.value) {
			await pb.collection('albums').update(route.params.id as string, formData);
			targetAlbumId = route.params.id as string;
		} else {
			const created = await pb.collection('albums').create(formData);
			targetAlbumId = created.id;
		}

		// 4. 更新批量任务的目标 ID 和名称
		if (currentBatchTask.value) {
			currentBatchTask.value.targetId = targetAlbumId;
			currentBatchTask.value.targetName = album.value.title;
		}

		// 5. 启动后台上传（如果有封面文件）
		if (currentBatchTask.value) {
			await handoffEditLockToTask(currentBatchTask.value, targetAlbumId);
			uploadStore.startPendingTasks(targetAlbumId, 'album');
			currentBatchTask.value = null;
		} else {
			await removeEditLock();
		}

		coverFile.value = null;
		coverMarkedForDeletion.value = false;
		hasChanges.value = false;

		// 6. 立即跳转回列表页
		router.push('/admin/albums');
	} catch (err) {
		console.error('Failed to save album:', err);
		error.value = '保存失败，请检查输入是否完整';
	} finally {
		saving.value = false;
	}
};

const cancel = () => {
	if (hasChanges.value || hasUnsavedCover.value) {
		if (!confirm('有未保存的更改，确定要离开吗？')) {
			return;
		}
	}

	if (currentBatchTask.value?.status === 'pending') {
		uploadStore.discardTask(currentBatchTask.value.id);
		currentBatchTask.value = null;
	}

	router.push('/admin/albums');
};

// 阻止关闭标签页
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
	if (hasChanges.value || hasUnsavedCover.value) {
		e.preventDefault();
		e.returnValue = '';
		return '';
	}
};

onMounted(() => {
	window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
	isDisposed = true;
	window.removeEventListener('beforeunload', handleBeforeUnload);
	// 清理本地预览 URL
	if (coverPreview.value && coverPreview.value.startsWith('blob:')) {
		URL.revokeObjectURL(coverPreview.value);
	}
	if (currentBatchTask.value?.status === 'pending') {
		uploadStore.discardTask(currentBatchTask.value.id);
		currentBatchTask.value = null;
	}
	// 删除编辑锁
	removeEditLock();
});

const openDatePicker = () => {
	if (!datePicker.value) return;
	try {
		if (typeof (datePicker.value as any).showPicker === 'function') {
			(datePicker.value as any).showPicker();
		} else {
			datePicker.value.click();
		}
	} catch (e) {
		console.error('Failed to open date picker:', e);
		datePicker.value.click();
	}
};

const handleDateInput = (e: Event) => {
	const input = e.target as HTMLInputElement;
	let value = input.value.replace(/\D/g, '');
	if (value.length > 8) value = value.slice(0, 8);

	let formatted = '';
	if (value.length > 0) {
		formatted = value.slice(0, 4);
		if (value.length > 4) {
			formatted += '/' + value.slice(4, 6);
			if (value.length > 6) {
				formatted += '/' + value.slice(6, 8);
			}
		}
	}
	album.value.releaseDate = formatted;
	markChanged();
};
</script>

<template>
	<div class="max-w-4xl mx-auto space-y-6">
		<div class="flex items-center justify-between">
			<div class="flex-1">
				<h1 class="text-2xl font-semibold text-[#c9c9c9]">
					{{ isEdit ? '编辑专辑' : '新建专辑' }}
				</h1>
			</div>
			<div class="flex gap-3">
				<button @click="cancel" class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors">取消</button>
				<button
					@click="saveAlbum"
					:disabled="!canSave"
					class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
				>
					<svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
					{{ saving ? '保存中...' : '保存' }}
				</button>
			</div>
		</div>

		<div v-if="error" class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
			<p class="text-red-300">{{ error }}</p>
		</div>

		<div v-if="lockWarning" class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-3">
			<p class="text-yellow-400 flex items-center gap-2">
				<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<span>{{ lockWarning }}</span>
			</p>

			<div v-if="conflictingLock" class="space-y-1 pl-7 text-sm text-yellow-100/85">
				<p>
					<span class="text-[#888]">锁用户：</span>
					<span>{{ conflictingLock.username || '未知用户' }}</span>
				</p>
				<p>
					<span class="text-[#888]">加锁时间：</span>
					<span>{{ formatEditLockDateTime(conflictingLock.created || conflictingLock.updated) }}</span>
				</p>
			</div>

			<p v-if="!currentLockId" class="pl-7 text-sm text-yellow-100/85">如果你认为原有锁已失效，或者你知道你在做什么，可以点击下方按钮移除原有锁。</p>

			<div v-if="!currentLockId" class="pl-7">
				<button
					type="button"
					class="rounded-lg border border-yellow-400/40 px-4 py-2 text-sm text-yellow-100 hover:bg-yellow-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					:disabled="takingOverLock || saving"
					@click="takeOverConflictingEditLock"
				>
					{{ takingOverLock ? '正在移除原有锁...' : '移除原有锁并继续编辑' }}
				</button>
			</div>
		</div>

		<div v-if="loading" class="flex items-center justify-center py-20">
			<div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
		</div>

		<div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-2 space-y-6">
				<!-- 基本信息 -->
				<div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
					<h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3">基本信息</h2>

					<div class="space-y-2">
						<label class="text-sm text-[#888]">专辑名 <span class="text-red-300">*</span></label>
						<div class="relative group">
							<textarea
								v-model="album.title"
								v-autosize
								rows="1"
								placeholder="专辑名"
								class="w-full px-4 py-2.5 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10 resize-none overflow-hidden"
								:class="titleError ? 'border-red-400/70' : 'border-[#c9c9c9]/20'"
								@input="
									titleError = '';
									album.title = filterNewlines(album.title || '');
									markChanged();
								"
								@keydown.enter.prevent
							></textarea>
							<button
								v-if="album.title"
								@click="
									album.title = '';
									markChanged();
								"
								class="absolute right-3 top-3 text-[#888] hover:text-red-300 transition-colors"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						<p v-if="titleError" class="text-xs text-red-300">{{ titleError }}</p>
					</div>

					<div class="space-y-2">
						<label class="text-sm text-[#888]">发布日期</label>
						<div class="relative group">
							<input
								:value="album.releaseDate"
								@input="handleDateInput"
								type="text"
								placeholder="YYYY/MM/DD"
								class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-24"
							/>
							<div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
								<button
									v-if="album.releaseDate"
									@click="
										album.releaseDate = '';
										markChanged();
									"
									class="p-1.5 text-[#888] hover:text-red-300 transition-colors"
									title="清空"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
								<button @click="openDatePicker" class="p-1.5 text-[#888] hover:text-red-300 transition-colors" title="选择日期">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</button>
								<input
									ref="datePicker"
									type="date"
									class="absolute opacity-0 pointer-events-none w-0 h-0"
									@change="
										(e: any) => {
											album.releaseDate = e.target.value;
											markChanged();
										}
									"
								/>
							</div>
						</div>
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<label class="text-sm text-[#888]">描述</label>
								<svg class="w-4 h-4 text-[#888]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
									<path d="M7 15V9l2 2 2-2v6" />
									<path d="m14 11 2-2 2 2" />
									<path d="M16 9v6" />
								</svg>
							</div>
							<div class="flex items-center gap-3">
								<button @click="showPreview = !showPreview" class="text-xs text-red-300 hover:text-[#fca5a5] transition-colors">
									{{ showPreview ? '编辑模式' : '预览模式' }}
								</button>
								<button
									v-if="album.description"
									@click="
										album.description = '';
										markChanged();
									"
									class="text-xs text-[#888] hover:text-red-300 transition-colors"
								>
									清空
								</button>
							</div>
						</div>
						<div
							v-if="showPreview"
							class="w-full px-4 py-3 bg-black/10 border border-[#c9c9c9]/10 rounded-lg text-[#e0e0e0] min-h-25 prose prose-invert prose-sm max-w-none"
							v-html="renderMarkdown(album.description)"
						></div>
						<textarea
							v-else
							v-model="album.description"
							v-autosize
							rows="1"
							placeholder="专辑描述"
							class="w-full px-4 py-3 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all leading-relaxed resize-none"
							@input="markChanged()"
						></textarea>
					</div>
				</div>
			</div>

			<div class="space-y-6">
				<!-- 封面图 -->
				<div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
					<h2 class="text-lg font-medium text-[#c9c9c9]">专辑封面</h2>
					<div
						class="aspect-square rounded-lg border-2 border-dashed border-[#c9c9c9]/20 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-red-300/50 transition-colors"
						:class="[isCoverDragOver ? 'border-red-300 bg-red-300/10' : '', coverMarkedForDeletion ? 'border-red-500/50 bg-red-500/10' : '']"
						@click="fileInput?.click()"
						@dragenter.prevent="handleCoverDragEnter"
						@dragover.prevent="handleCoverDragEnter"
						@dragleave.prevent="handleCoverDragLeave"
						@drop.prevent="handleCoverDrop"
					>
						<img v-if="coverPreview && !coverMarkedForDeletion" :src="coverPreview" class="w-full h-full object-cover" />
						<div v-else class="text-center p-4">
							<svg class="w-12 h-12 mx-auto text-[#888] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
							<p class="text-sm text-[#888]">{{ coverMarkedForDeletion ? '封面将被删除' : '点击或拖动上传封面' }}</p>
						</div>
						<div v-if="coverPreview && !coverMarkedForDeletion" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
							<p class="text-white text-sm">更换封面</p>
						</div>

						<input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleCoverChange" />
					</div>
					<div v-if="isEdit && (coverPreview || coverMarkedForDeletion)" class="flex justify-end">
						<button
							v-if="!coverMarkedForDeletion"
							@click="removeCover"
							class="text-sm text-red-300 hover:text-red-200 transition-colors flex items-center gap-1"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
							删除封面
						</button>
						<button
							v-else
							@click="cancelRemoveCover"
							class="text-sm text-[#888] hover:text-red-300 transition-colors flex items-center gap-1"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
							取消删除
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<VersionConflictDialog
		:visible="showVersionConflictDialog"
		title="该专辑"
		:latest-edit-path="latestEditPath"
		:original-updated="originalUpdated"
		:latest-updated="latestConflictUpdated"
		@cancel="resolveVersionConflict(false)"
		@force="resolveVersionConflict(true)"
	/>

	<EditLockConflictDialog
		:visible="showEditLockConflictDialog"
		:message="editLockConflictMessage"
		:locking-user="conflictingLock?.username || null"
		:locked-at="conflictingLock?.created || conflictingLock?.updated || null"
		@close="resolveEditLockConflict(false)"
		@force="resolveEditLockConflict(true)"
	/>
</template>

<style scoped>
@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
.animate-spin {
	animation: spin 1s linear infinite;
}

.custom-scrollbar::-webkit-scrollbar {
	width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background: rgba(201, 201, 201, 0.1);
	border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
	background: rgba(201, 201, 201, 0.2);
}

textarea {
	resize: none;
}
</style>
