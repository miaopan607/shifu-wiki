<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { pb, parseDateFromBackend, normalizeDateForStorage } from '@/lib/pocketbase';
import { marked } from 'marked';
import { acquireEditLock, findConflictingEditLock, forceAcquireEditLock, formatEditLockDateTime, releaseEditLock, type EditLockRecord } from '@/lib/editLock';
import { uploadStore } from '@/stores/uploadStore';
import EditLockConflictDialog from '@/components/EditLockConflictDialog.vue';
import VersionConflictDialog from '@/components/VersionConflictDialog.vue';
import type { GalleryFormData, GalleryImageWithFile } from '@/types/admin';
import type { BatchUploadTask } from '@/types/upload';

type GalleryPreviewSlot = { type: 'image'; image: GalleryImageWithFile; originalIndex: number } | { type: 'placeholder'; key: string };

const router = useRouter();
const route = useRoute();

// 通过路由名判断当前页面是"新建"还是"编辑"。
const isNew = computed(() => route.name === 'admin-gallery-new');
// 编辑态下从路由参数提取图集 ID；新建态为空字符串。
const galleryId = computed(() => {
	const id = route.params.id;
	return typeof id === 'string' ? id : '';
});

// 页面和表单全局状态。
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const lockWarning = ref('');
const successMessage = ref('');
const titleError = ref('');
const datePicker = ref<HTMLInputElement | null>(null);
const showPreview = ref(false);
let isDisposed = false;
const showVersionConflictDialog = ref(false);
const latestConflictUpdated = ref<string | null>(null);
const versionConflictSecondaryWarning = ref<string | null>(null);
let versionConflictResolver: ((force: boolean) => void) | null = null;
const showEditLockConflictDialog = ref(false);
const editLockConflictMessage = ref('');
let editLockConflictResolver: ((force: boolean) => void) | null = null;

// 版本控制（用于冲突检测）
const originalUpdated = ref<string | null>(null);

// 当前批量上传任务（用于关联待上传文件）
const currentBatchTask = ref<BatchUploadTask | null>(null);

// 当前编辑锁ID
const currentLockId = ref<string | null>(null);
const conflictingLock = ref<EditLockRecord | null>(null);
const takingOverLock = ref(false);

const renderMarkdown = (content: string | undefined) => {
	if (!content) return '';
	return marked.parse(content, { async: false }) as string;
};

const filterNewlines = (value: string) => {
	return value.replace(/\r\n|\r|\n/g, ' ');
};

// 图集基础信息，默认日期为今天（YYYY-MM-DD）。
const form = ref<GalleryFormData>({
	title: '',
	slug: '',
	description: '',
	published: false,
	date: '',
});

// 图片列表与上传任务状态。
const images = ref<GalleryImageWithFile[]>([]);
const imagesToDelete = ref<string[]>([]);
const draggedIndex = ref<number | null>(null);
const dropTargetIndex = ref<number | null>(null);
const isDraggingOver = ref(false);
const dragCounter = ref(0);
let dragPreviewElement: HTMLElement | null = null;
let dragStartTimer: number | null = null;

const fileInput = ref<HTMLInputElement | null>(null);
const hasChanges = ref(false);

// 是否有未保存的文件
const hasUnsavedFiles = computed(() => currentBatchTask.value !== null);

// 保存按钮可用条件：标题非空 + 非保存中。
const canSave = computed(() => {
	return !saving.value && form.value.title.trim().length > 0;
});

const previewSlots = computed<GalleryPreviewSlot[]>(() => {
	const slots: GalleryPreviewSlot[] = images.value.map((image, originalIndex) => ({
		type: 'image',
		image,
		originalIndex,
	}));

	if (draggedIndex.value === null) {
		return slots;
	}

	const remainingSlots = slots.filter((slot) => slot.type !== 'image' || slot.originalIndex !== draggedIndex.value);
	const insertionIndex = Math.max(0, Math.min(dropTargetIndex.value ?? draggedIndex.value, remainingSlots.length));

	remainingSlots.splice(insertionIndex, 0, {
		type: 'placeholder',
		key: `placeholder-${draggedIndex.value}`,
	});

	return remainingSlots;
});

onMounted(async () => {
	// 监听全局拖拽，实现跨区域拖入文件时的遮罩提示。
	window.addEventListener('dragenter', handleDragEnter);
	window.addEventListener('dragleave', handleDragLeave);
	window.addEventListener('dragover', handleDragOver);
	window.addEventListener('drop', handleDrop);

	// 编辑态拉取数据；新建态直接进入可编辑状态。
	if (!isNew.value) {
		await fetchGallery();
		if (!error.value) {
			window.setTimeout(() => {
				void createEditLock();
			}, 0);
		}
	} else {
		loading.value = false;
	}
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
	if (isNew.value) return true;
	if (currentLockId.value) return true;

	try {
		const result = await acquireEditLock('galleries', galleryId.value);
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
		const result = await acquireEditLock('galleries', targetId);
		if (!result.ok || !result.lockId) {
			throw new Error(`无法为后台上传创建编辑锁：${result.lockingUser || '锁创建失败'}`);
		}
		lockId = result.lockId;
	}

	uploadStore.attachTaskLock(task.id, lockId, 'galleries');
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

// 拉取图集详情和已上传图片列表。
const fetchGallery = async () => {
	if (!galleryId.value) {
		error.value = '图集 ID 无效';
		loading.value = false;
		return;
	}

	try {
		const record = await pb.collection('galleries').getOne(galleryId.value);
		// 记录原始更新时间用于版本控制
		originalUpdated.value = record.updated;

		form.value = {
			title: record.title,
			slug: record.slug,
			description: record.description || '',
			published: record.published,
			date: record.date ? parseDateFromBackend(record.date) : '',
		};

		// 拉取已上传的图片列表，按 sort 排序。
		const imagesRes = await pb.collection('gallery_images').getFullList({
			filter: `gallery = "${galleryId.value}"`,
			sort: 'sort',
		});

		// 在替换 images 之前，释放所有已存在的 localUrl 防止内存泄漏
		images.value.forEach((img) => {
			if (img.localUrl) {
				URL.revokeObjectURL(img.localUrl);
			}
		});

		images.value = imagesRes.map((img) => ({
			...img,
			collectionId: img.collectionId || '',
			collectionName: img.collectionName || 'gallery_images',
			created: img.created,
			updated: img.updated,
			id: img.id,
			image: img.image,
			gallery: img.gallery,
			sort: img.sort,
		})) as GalleryImageWithFile[];
	} catch (err) {
		console.error('Failed to fetch gallery:', err);
		error.value = '获取图集信息失败';
	} finally {
		loading.value = false;
	}
};

// 添加文件：添加到待上传列表，不实际上传
const addFiles = async (files: File[]) => {
	const imageFiles = files.filter((file) => file.type.startsWith('image/'));

	if (imageFiles.length === 0) return;

	markChanged();

	// 使用当前列表最大 sort 值 + 1
	const nextSort = images.value.length > 0 ? Math.max(...images.value.map((img) => img.sort || 0)) + 1 : 1;

	// 准备文件和排序
	const filesToUpload: File[] = [];
	const sorts: number[] = [];
	const clientIds: string[] = [];
	const pendingImages: GalleryImageWithFile[] = [];

	for (let i = 0; i < imageFiles.length; i++) {
		const file = imageFiles[i]!;
		const id = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const localUrl = URL.createObjectURL(file);
		const sort = nextSort + i;

		// 添加到本地图片列表（显示预览）
		const tempImage: GalleryImageWithFile = {
			id,
			collectionId: '',
			collectionName: 'gallery_images',
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
			image: file.name,
			gallery: galleryId.value || '',
			sort,
			file,
			isNew: true,
			localUrl,
		};
		images.value.push(tempImage);
		pendingImages.push(tempImage);

		filesToUpload.push(file);
		sorts.push(sort);
		clientIds.push(id);
	}

	// 创建或更新批量上传任务
	if (currentBatchTask.value) {
		const appendedFiles = uploadStore.appendFilesToTask(currentBatchTask.value.id, {
			files: filesToUpload,
			sorts,
			clientIds,
		});

		pendingImages.forEach((image, index) => {
			image.uploadTaskFileId = appendedFiles[index]?.id;
		});
		return;
	}

	currentBatchTask.value = uploadStore.addBatchTask({
		type: 'gallery_images',
		targetId: galleryId.value || 'new',
		targetType: 'gallery',
		targetName: form.value.title || '新建图集',
		files: filesToUpload,
		sorts,
		clientIds,
	});

	pendingImages.forEach((image, index) => {
		image.uploadTaskFileId = currentBatchTask.value?.files[index]?.id;
	});
};

// 点击上传按钮触发文件选择。
const triggerFileInput = () => {
	fileInput.value?.click();
};

// 选择文件后批量添加。
const handleFileSelect = (event: Event) => {
	const target = event.target as HTMLInputElement;
	if (target.files && target.files.length > 0) {
		addFiles(Array.from(target.files));
		target.value = '';
	}
};

// 删除图片：本地预览直接移除，已持久化图片记录到待删除队列。
const removeImage = async (index: number) => {
	const img = images.value[index];
	if (!img) return;

	// 无论是否是待上传图片，只要有 localUrl 就要释放，防止内存泄漏
	if (img.localUrl) {
		URL.revokeObjectURL(img.localUrl);
	}

	// 检查是否是待上传的图片（id 以 pending- 开头）
	if (img.id.startsWith('pending-')) {
		// 从本地列表移除
		images.value.splice(index, 1);

		// 从批量任务中移除对应的文件
		if (currentBatchTask.value && img.uploadTaskFileId) {
			uploadStore.removeFileFromTask(currentBatchTask.value.id, img.uploadTaskFileId);
			const taskStillExists = uploadStore.tasks.value.some((task) => task.id === currentBatchTask.value?.id);
			if (!taskStillExists) {
				currentBatchTask.value = null;
			}
		}
	} else if (!img.isNew) {
		// 已持久化的图片，记录到待删除队列
		imagesToDelete.value.push(img.id);
		images.value.splice(index, 1);
	}

	markChanged();
};

// 拖拽排序相关。
const cleanupDragPreview = () => {
	if (!dragPreviewElement) {
		return;
	}

	dragPreviewElement.remove();
	dragPreviewElement = null;
};

const clearPendingDragStart = () => {
	if (dragStartTimer !== null) {
		window.clearTimeout(dragStartTimer);
		dragStartTimer = null;
	}
};

const handleDragStart = (index: number, event: DragEvent) => {
	const target = event.currentTarget as HTMLElement | null;

	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.setData('text/plain', String(index));

		if (target) {
			cleanupDragPreview();

			const rect = target.getBoundingClientRect();
			const preview = target.cloneNode(true) as HTMLElement;
			preview.style.position = 'fixed';
			preview.style.top = '-10000px';
			preview.style.left = '-10000px';
			preview.style.width = `${rect.width}px`;
			preview.style.height = `${rect.height}px`;
			preview.style.pointerEvents = 'none';
			preview.style.margin = '0';
			preview.style.transform = 'none';
			preview.style.opacity = '1';
			preview.style.zIndex = '100000';
			document.body.appendChild(preview);
			dragPreviewElement = preview;

			event.dataTransfer.setDragImage(preview, rect.width / 2, rect.height / 2);
		}
	}

	clearPendingDragStart();
	dragStartTimer = window.setTimeout(() => {
		draggedIndex.value = index;
		dropTargetIndex.value = index;
		dragStartTimer = null;
	}, 0);
};

const handleDragEnd = () => {
	clearPendingDragStart();
	cleanupDragPreview();
	draggedIndex.value = null;
	dropTargetIndex.value = null;
};

const isFileDragEvent = (e: DragEvent): boolean => {
	const types = e.dataTransfer?.types;
	if (!types) return false;
	return Array.from(types).includes('Files');
};

const handleSortPreview = (index: number) => {
	if (draggedIndex.value === null) {
		return;
	}

	dropTargetIndex.value = index;
};

const handleDragEnter = (e: DragEvent) => {
	e.preventDefault();

	if (draggedIndex.value !== null || !isFileDragEvent(e)) {
		return;
	}

	dragCounter.value++;
	if (dragCounter.value === 1) {
		isDraggingOver.value = true;
	}
};

const handleDragLeave = (e: DragEvent) => {
	e.preventDefault();

	if (draggedIndex.value !== null || !isFileDragEvent(e)) {
		return;
	}

	dragCounter.value--;
	if (dragCounter.value === 0) {
		isDraggingOver.value = false;
	}
};

const handleDragOver = (e: DragEvent) => {
	if (draggedIndex.value !== null || isFileDragEvent(e)) {
		e.preventDefault();
	}
};

const handleDrop = async (e: DragEvent) => {
	e.preventDefault();
	dragCounter.value = 0;
	isDraggingOver.value = false;
	clearPendingDragStart();

	// 如果是外部文件拖入，调用 addFiles
	if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
		await addFiles(Array.from(e.dataTransfer.files));
		cleanupDragPreview();
		return;
	}

	// 内部排序逻辑
	if (draggedIndex.value !== null && dropTargetIndex.value !== null) {
		const fromIndex = draggedIndex.value;
		const toIndex = dropTargetIndex.value;
		const [moved] = images.value.splice(fromIndex, 1);

		if (moved) {
			images.value.splice(toIndex, 0, moved);
			if (fromIndex !== toIndex) {
				markChanged();
			}
		}
	}

	cleanupDragPreview();
	draggedIndex.value = null;
	dropTargetIndex.value = null;
};

const handleDragOverItem = (slotIndex: number) => {
	if (draggedIndex.value === null) {
		return;
	}

	handleSortPreview(slotIndex);
};

// 标记有变更。
const markChanged = () => {
	hasChanges.value = true;
};

// 检查编辑锁（提交时检测）
const checkEditLock = async (): Promise<string | null> => {
	if (isNew.value) return null;

	try {
		const lock = await findConflictingEditLock('galleries', galleryId.value, currentLockId.value);
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
	if (isNew.value || currentLockId.value) return true;
	return createEditLock();
};

const forceTakeoverEditLock = async (): Promise<boolean> => {
	if (isNew.value) return true;

	try {
		const result = await forceAcquireEditLock('galleries', galleryId.value, currentLockId.value);
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
	if (isNew.value) {
		return router.resolve({ name: 'admin-gallery-new' }).href;
	}

	return router.resolve({ name: 'admin-gallery-edit', params: { id: galleryId.value } }).href;
});

const requestVersionConflictResolution = (latestUpdated?: string | null, secondaryWarning?: string | null): Promise<boolean> => {
	latestConflictUpdated.value = latestUpdated || null;
	versionConflictSecondaryWarning.value = secondaryWarning || null;
	showVersionConflictDialog.value = true;

	return new Promise((resolve) => {
		versionConflictResolver = resolve;
	});
};

const resolveVersionConflict = (force: boolean) => {
	showVersionConflictDialog.value = false;
	versionConflictSecondaryWarning.value = null;
	const resolver = versionConflictResolver;
	versionConflictResolver = null;
	resolver?.(force);
};

const getServerGalleryImageIdSet = async (): Promise<Set<string> | null> => {
	if (isNew.value) {
		return null;
	}

	try {
		const serverImages = await pb.collection('gallery_images').getFullList({
			filter: `gallery = "${galleryId.value}"`,
			sort: 'sort',
		});
		return new Set(serverImages.map((image) => image.id));
	} catch (err) {
		console.error('Failed to fetch current gallery images:', err);
		return null;
	}
};

const getImagesForSave = (serverImageIds?: Set<string> | null): GalleryImageWithFile[] => {
	if (!serverImageIds) {
		return [...images.value];
	}

	return images.value.filter((image) => image.isNew || image.id.startsWith('pending-') || serverImageIds.has(image.id));
};

const getDeletedImagesConflictWarning = async (): Promise<string | null> => {
	const serverImageIds = await getServerGalleryImageIdSet();
	if (!serverImageIds) {
		return null;
	}

	const missingImageCount = images.value.filter((image) => !image.isNew && !image.id.startsWith('pending-') && !serverImageIds.has(image.id)).length;

	if (missingImageCount === 0) {
		return null;
	}

	return `当前页面里仍保留 ${missingImageCount} 张已被服务端删除的图片。继续强行覆盖时，我会自动跳过这些已不存在的图片，并把剩余图片的顺序重新整理好。`;
};

const checkVersionConflict = async (): Promise<{
	hasConflict: boolean;
	currentUpdated?: string;
	deletedImagesWarning?: string | null;
}> => {
	if (isNew.value || !originalUpdated.value) return { hasConflict: false };

	try {
		const current = await pb.collection('galleries').getOne(galleryId.value);

		if (current.updated !== originalUpdated.value) {
			return {
				hasConflict: true,
				currentUpdated: current.updated,
				deletedImagesWarning: await getDeletedImagesConflictWarning(),
			};
		}
		return { hasConflict: false };
	} catch (err) {
		console.error('Failed to check version:', err);
		return { hasConflict: false };
	}
};

// 保存逻辑：
// - 新建态：创建图集，然后跳转并后台上传
// - 编辑态：更新图集，然后跳转并后台上传
const saveGallery = async () => {
	titleError.value = '';
	if (!form.value.title.trim()) {
		titleError.value = '图集标题不能为空';
		return;
	}

	saving.value = true;
	error.value = '';
	successMessage.value = '';

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
		const { hasConflict, currentUpdated, deletedImagesWarning } = await checkVersionConflict();
		if (hasConflict) {
			saving.value = false;
			const shouldForce = await requestVersionConflictResolution(currentUpdated, deletedImagesWarning);
			if (!shouldForce) {
				saving.value = false;
				return;
			}
			saving.value = true;
		}

		// 3. 删除标记为删除的图片
		const imageIdsToDelete = [...imagesToDelete.value];
		const deleteResults = await Promise.allSettled(imageIdsToDelete.map((imageId) => pb.collection('gallery_images').delete(imageId)));
		deleteResults.forEach((result, index) => {
			if (result.status === 'rejected') {
				console.warn('Failed to delete image:', imageIdsToDelete[index], result.reason);
			}
		});
		imagesToDelete.value = [];

		// 4. 保存图集基本信息
		const formData = new FormData();
		formData.append('title', form.value.title.trim());
		formData.append('slug', form.value.slug.trim());
		formData.append('description', form.value.description);
		formData.append('published', String(form.value.published));
		formData.append('date', normalizeDateForStorage(form.value.date));

		let targetGalleryId: string;

		if (isNew.value) {
			const created = await pb.collection('galleries').create(formData);
			targetGalleryId = created.id;
		} else {
			await pb.collection('galleries').update(galleryId.value, formData);
			targetGalleryId = galleryId.value;
		}

		// 5. 更新批量任务的目标 ID 和名称
		if (currentBatchTask.value) {
			currentBatchTask.value.targetId = targetGalleryId;
			currentBatchTask.value.targetName = form.value.title;
		}

		const serverImageIdsForSave = !isNew.value ? await getServerGalleryImageIdSet() : null;
		const imagesForSave = getImagesForSave(serverImageIdsForSave);

		imagesForSave.forEach((img, index) => {
			img.sort = index + 1;
		});

		// 6. 同步待上传图片的排序
		if (currentBatchTask.value) {
			imagesForSave.forEach((img, index) => {
				if (!img.uploadTaskFileId) return;
				const pendingFile = currentBatchTask.value?.files.find((file) => file.id === img.uploadTaskFileId);
				if (pendingFile) {
					pendingFile.sort = index + 1;
				}
			});
		}

		// 7. 更新现有图片的排序
		if (!isNew.value) {
			const sortTargets = imagesForSave
				.map((img, index) => ({ img, sort: index + 1 }))
				.filter(({ img }) => img && !img.isNew && !img.id.startsWith('pending-') && (!serverImageIdsForSave || serverImageIdsForSave.has(img.id)));

			const sortResults = await Promise.allSettled(sortTargets.map(({ img, sort }) => pb.collection('gallery_images').update(img.id, { sort })));
			sortResults.forEach((result, index) => {
				if (result.status === 'rejected') {
					console.warn('Failed to update sort order:', sortTargets[index]?.img.id, result.reason);
				}
			});
		}

		if (currentBatchTask.value) {
			await handoffEditLockToTask(currentBatchTask.value, targetGalleryId);
			uploadStore.startPendingTasks(targetGalleryId, 'gallery');
			currentBatchTask.value = null;
		} else {
			await removeEditLock();
		}

		hasChanges.value = false;

		// 9. 立即跳转回列表页
		router.push('/admin/galleries');
	} catch (err) {
		console.error('Failed to save gallery:', err);
		error.value = '保存失败，请重试';
	} finally {
		saving.value = false;
	}
};

// 取消编辑，返回列表。
const cancelEdit = () => {
	if (hasChanges.value || hasUnsavedFiles.value) {
		if (!confirm('有未保存的更改，确定要离开吗？')) {
			return;
		}
	}

	if (currentBatchTask.value?.status === 'pending') {
		uploadStore.discardTask(currentBatchTask.value.id);
		currentBatchTask.value = null;
	}

	router.push('/admin/galleries');
};

// 阻止关闭标签页
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
	if (hasChanges.value || hasUnsavedFiles.value) {
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
	window.removeEventListener('dragenter', handleDragEnter);
	window.removeEventListener('dragleave', handleDragLeave);
	window.removeEventListener('dragover', handleDragOver);
	window.removeEventListener('drop', handleDrop);
	window.removeEventListener('beforeunload', handleBeforeUnload);

	// 清理本地预览 URL
	images.value.forEach((img) => {
		if (img.localUrl) {
			URL.revokeObjectURL(img.localUrl);
		}
	});

	if (currentBatchTask.value?.status === 'pending') {
		uploadStore.discardTask(currentBatchTask.value.id);
		currentBatchTask.value = null;
	}

	clearPendingDragStart();
	cleanupDragPreview();

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
	form.value.date = formatted;
	markChanged();
};
</script>

<template>
	<div class="max-w-7xl mx-auto space-y-6">
		<div class="flex items-center justify-between">
			<div class="flex-1">
				<h1 class="text-2xl font-semibold text-[#c9c9c9]">
					{{ isNew ? '新建图集' : '编辑图集' }}
				</h1>
			</div>
			<div class="flex gap-3">
				<button @click="cancelEdit" class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors">取消</button>
				<button
					@click="saveGallery"
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

		<div v-if="successMessage" class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
			<p class="text-green-300">{{ successMessage }}</p>
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

		<div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8">
			<div class="lg:col-span-4 lg:order-2 space-y-6 lg:self-start">
				<div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
					<h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3">基本信息</h2>

					<div class="space-y-2">
						<label class="text-sm text-[#888]">标题 <span class="text-red-300">*</span></label>
						<div class="relative group">
							<textarea
								v-model="form.title"
								v-autosize
								rows="1"
								placeholder="图集标题"
								class="w-full px-4 py-2.5 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10 resize-none overflow-hidden"
								:class="titleError ? 'border-red-400/70' : 'border-[#c9c9c9]/20'"
								@input="
									titleError = '';
									form.title = filterNewlines(form.title);
									markChanged();
								"
								@keydown.enter.prevent
							></textarea>
							<button
								v-if="form.title"
								@click="
									form.title = '';
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
						<label class="text-sm text-[#888]">日期</label>
						<div class="relative group">
							<input
								:value="form.date"
								@input="handleDateInput"
								type="text"
								placeholder="YYYY/MM/DD"
								class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-24"
							/>
							<div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
								<button
									v-if="form.date"
									@click="
										form.date = '';
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
											form.date = e.target.value;
											markChanged();
										}
									"
								/>
							</div>
						</div>
					</div>

					<div class="space-y-2">
						<label class="text-sm text-[#888]">语义化标签</label>
						<div class="relative group">
							<textarea
								v-model="form.slug"
								v-autosize
								rows="1"
								placeholder="自定义 URL 路径"
								class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10 resize-none overflow-hidden"
								@input="
									form.slug = filterNewlines(form.slug || '');
									markChanged();
								"
								@keydown.enter.prevent
							></textarea>
							<button
								v-if="form.slug"
								@click="
									form.slug = '';
									markChanged();
								"
								class="absolute right-3 top-3 text-[#888] hover:text-red-300 transition-colors"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
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
									v-if="form.description"
									@click="
										form.description = '';
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
							v-html="renderMarkdown(form.description)"
						></div>
						<textarea
							v-else
							v-model="form.description"
							v-autosize
							rows="1"
							placeholder="图集描述"
							class="w-full px-4 py-3 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all leading-relaxed resize-none"
							@input="markChanged()"
						></textarea>
					</div>

					<div>
						<label class="block text-sm text-[#c9c9c9] mb-1.5">发布状态</label>
						<label class="flex items-center gap-3 cursor-pointer">
							<button
								type="button"
								role="switch"
								:aria-checked="form.published"
								@click="
									form.published = !form.published;
									markChanged();
								"
								:class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors', form.published ? 'bg-red-700' : 'bg-[#888]/30']"
							>
								<span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition-transform', form.published ? 'translate-x-6' : 'translate-x-1']" />
							</button>
							<span class="text-[#c9c9c9]">{{ form.published ? '已发布' : '草稿' }}</span>
						</label>
					</div>
				</div>

				<div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6">
					<h3 class="text-base font-semibold text-[#c9c9c9] mb-3">使用提示</h3>
					<ul class="text-base text-[#888] space-y-2.5 list-disc list-inside leading-7">
						<li>可以拖拽图片调整顺序</li>
						<li>可以从外部拖放图片到页面</li>
						<li>图片将在保存后自动上传</li>
					</ul>
				</div>
			</div>

			<div class="relative lg:col-span-8 lg:order-1 lg:self-start bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 flex flex-col overflow-hidden">
				<div class="relative z-10 bg-[rgb(60,0,0)] flex items-center justify-between border-b border-[#c9c9c9]/20 p-6">
					<div class="flex items-center gap-4">
						<h2 class="text-lg font-semibold text-[#c9c9c9]">图片管理</h2>
						<span class="text-sm text-[#888]">{{ images.length }} 张图片</span>
					</div>
					<button
						@click="triggerFileInput"
						class="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-[#c9c9c9]/20 rounded-lg text-sm text-[#c9c9c9] transition-colors group"
					>
						<svg class="w-4 h-4 text-[#888] group-hover:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						添加图片
					</button>
				</div>

				<div class="p-6">
					<input ref="fileInput" type="file" multiple accept="image/*" class="hidden" @change="handleFileSelect" />

					<Teleport to="body">
						<div v-if="isDraggingOver" class="fixed inset-0 bg-black/80 z-10000 flex items-center justify-center pointer-events-none">
							<div class="text-center">
								<svg class="w-16 h-16 mx-auto text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
								</svg>
								<p class="text-xl text-[#c9c9c9]">拖放图片到此处上传</p>
							</div>
						</div>
					</Teleport>

					<div v-if="images.length === 0">
						<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							<div
								@click="triggerFileInput"
								class="aspect-square rounded-lg border-2 border-dashed border-[#c9c9c9]/30 hover:border-red-300/50 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all group"
							>
								<svg class="w-8 h-8 text-[#888] group-hover:text-red-300 mb-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
								<span class="text-sm text-[#888] group-hover:text-red-300 transition-colors">点击或拖动添加图片</span>
							</div>
						</div>
					</div>

					<div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
						<div v-for="(slot, index) in previewSlots" :key="slot.type === 'image' ? slot.image.id : slot.key">
							<div
								v-if="slot.type === 'placeholder'"
								class="relative aspect-square rounded-lg border-2 border-dashed border-red-300/60 bg-black/10"
								@dragenter.prevent.stop="handleSortPreview(index)"
								@dragover.prevent.stop="handleSortPreview(index)"
								@drop.prevent.stop="handleDrop"
							>
								<div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
									{{ index + 1 }}
								</div>
							</div>

							<div
								v-else
								draggable="true"
								@dragstart="handleDragStart(slot.originalIndex, $event)"
								@dragend="handleDragEnd"
								@dragenter.prevent.stop="handleDragOverItem(index)"
								@dragover.prevent.stop="handleDragOverItem(index)"
								@drop.prevent.stop="handleDrop"
								:class="['group relative aspect-square rounded-lg overflow-hidden bg-[rgb(77,0,0)] cursor-move', slot.image.isNew ? 'ring-2 ring-yellow-500/50' : '']"
							>
								<img
									:src="slot.image.localUrl || pb.files.getURL(slot.image, slot.image.image, { thumb: '0x720' })"
									:alt="`Image ${index + 1}`"
									class="w-full h-full object-cover"
									draggable="false"
								/>

								<div v-if="slot.image.isNew" class="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500/80 text-black text-xs font-medium rounded">未上传</div>

								<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
									<button @click.stop="removeImage(slot.originalIndex)" class="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors" title="删除">
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>

								<div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
									{{ index + 1 }}
								</div>
							</div>
						</div>

						<div
							@click="triggerFileInput"
							@dragenter.prevent.stop="handleSortPreview(images.length)"
							@dragover.prevent.stop="handleSortPreview(images.length)"
							@drop.prevent.stop="handleDrop"
							class="aspect-square rounded-lg border-2 border-dashed border-[#c9c9c9]/30 hover:border-red-300/50 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all group"
						>
							<svg class="w-8 h-8 text-[#888] group-hover:text-red-300 mb-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							<span class="text-sm text-[#888] group-hover:text-red-300 transition-colors">点击或拖动添加图片</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<VersionConflictDialog
		:visible="showVersionConflictDialog"
		title="该图集"
		:latest-edit-path="latestEditPath"
		:original-updated="originalUpdated"
		:latest-updated="latestConflictUpdated"
		:secondary-warning="versionConflictSecondaryWarning"
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
