<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { pb } from '@/lib/pocketbase';
import type { GalleryImage } from '@/types';

interface Props {
	images: GalleryImage[];
	initialIndex: number;
	galleryTitle: string;
	modelValue: boolean;
	// 已预加载缩略图的图片ID集合
	preloadedThumbnails?: Set<string>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const currentIndex = ref(props.initialIndex);
const loadedImages = ref<Set<string>>(new Set());
// 所有图片的加载进度 Map
const imageProgressMap = ref<Map<string, { loaded: number; total: number }>>(new Map());
// 正在加载中的图片ID集合，防止重复请求
const loadingImages = ref<Set<string>>(new Set());
// 已加载图片的 Blob URL 缓存
const loadedImageUrls = ref<Map<string, string>>(new Map());
// 当前正在进行的 XHR 请求 Map，用于取消
const activeXhrRequests = ref<Map<string, XMLHttpRequest>>(new Map());

// 当前显示的图片
const currentImage = computed(() => {
	if (props.images.length === 0) return null;
	return props.images[currentIndex.value] || null;
});

// 当前图片是否已加载完成
const isCurrentImageLoaded = computed(() => {
	const img = currentImage.value;
	if (!img) return false;
	return loadedImages.value.has(img.id);
});

// 当前图片的加载进度
const currentImageProgress = computed(() => {
	const img = currentImage.value;
	if (!img) return null;
	return imageProgressMap.value.get(img.id) || null;
});

// 当前图片的缩略图是否已预加载
const isThumbnailPreloaded = computed(() => {
	const img = currentImage.value;
	if (!img) return false;
	// 如果没有传入 preloadedThumbnails，默认认为已预加载（兼容详情页）
	if (!props.preloadedThumbnails) return true;
	return props.preloadedThumbnails.has(img.id);
});

// 取消所有正在进行的 XHR 请求
const cancelAllXhrRequests = () => {
	activeXhrRequests.value.forEach((xhr, imgId) => {
		xhr.abort();
	});
	activeXhrRequests.value.clear();
	loadingImages.value.clear();
	imageProgressMap.value.clear();
};

const cleanup = () => {
	document.body.style.overflow = '';
	// 取消所有正在进行的请求，让浏览器优先加载缩略图
	cancelAllXhrRequests();
	// 清理 Blob URL
	loadedImageUrls.value.forEach((url) => {
		URL.revokeObjectURL(url);
	});
	loadedImageUrls.value.clear();
	loadedImages.value.clear();
};

// 监听 modelValue 变化
watch(
	() => props.modelValue,
	(open) => {
		if (open) {
			currentIndex.value = props.initialIndex;
			loadedImages.value.clear();
			loadingImages.value.clear();
			imageProgressMap.value.clear();
			activeXhrRequests.value.clear();
			document.body.style.overflow = 'hidden';
		} else {
			cleanup();
		}
	}
);

onUnmounted(() => {
	cleanup();
});

// 监听 initialIndex 变化
watch(
	() => props.initialIndex,
	(index) => {
		if (props.modelValue) {
			currentIndex.value = index;
		}
	}
);

const close = () => {
	emit('update:modelValue', false);
};

const prev = () => {
	if (props.images.length <= 1) return;
	currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length;
};

const next = () => {
	if (props.images.length <= 1) return;
	currentIndex.value = (currentIndex.value + 1) % props.images.length;
};

const onImageLoad = (imgId: string) => {
	loadedImages.value.add(imgId);
};

const onImageError = (imgId: string) => {
	loadedImages.value.add(imgId);
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 获取已加载图片的 Blob URL
const getLoadedImageUrl = (imgId: string, url: string): string => {
	// 如果已经有缓存的 Blob URL，直接返回
	if (loadedImageUrls.value.has(imgId)) {
		return loadedImageUrls.value.get(imgId)!;
	}
	// 否则返回原始 URL（此时图片还未加载完成）
	return url;
};

// 预加载原图 - 使用 XMLHttpRequest 获取加载进度
const preloadFullImage = (imgId: string, url: string) => {
	// 如果已经加载过或正在加载中，直接返回
	if (loadedImages.value.has(imgId) || loadingImages.value.has(imgId)) return;

	// 标记为正在加载
	loadingImages.value.add(imgId);

	const xhr = new XMLHttpRequest();
	// 保存请求引用，以便可以取消
	activeXhrRequests.value.set(imgId, xhr);

	xhr.open('GET', url, true);
	xhr.responseType = 'blob';

	xhr.onprogress = (event) => {
		if (event.lengthComputable) {
			imageProgressMap.value.set(imgId, {
				loaded: event.loaded,
				total: event.total,
			});
		}
	};

	xhr.onload = () => {
		if (xhr.status === 200) {
			// 创建 Blob URL 并缓存
			const blobUrl = URL.createObjectURL(xhr.response);
			loadedImageUrls.value.set(imgId, blobUrl);
			loadedImages.value.add(imgId);
		}
		// 清理
		loadingImages.value.delete(imgId);
		imageProgressMap.value.delete(imgId);
		activeXhrRequests.value.delete(imgId);
	};

	xhr.onerror = () => {
		loadedImages.value.add(imgId);
		loadingImages.value.delete(imgId);
		imageProgressMap.value.delete(imgId);
		activeXhrRequests.value.delete(imgId);
	};

	xhr.onabort = () => {
		loadingImages.value.delete(imgId);
		imageProgressMap.value.delete(imgId);
		activeXhrRequests.value.delete(imgId);
	};

	xhr.send();
};

const getThumbnailUrl = (record: GalleryImage, filename: string) => {
	return pb.files.getURL(record, filename, { thumb: '0x720' });
};

const getFullImageUrl = (record: GalleryImage, filename: string) => {
	return pb.files.getURL(record, filename);
};
</script>

<template>
	<div
		v-if="modelValue"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
		@click="close"
	>
		<!-- 关闭按钮 -->
		<button
			class="absolute top-4 right-4 text-white/80 hover:text-white text-3xl w-10 h-10 flex items-center justify-center transition-colors z-10"
			@click="close"
		>
			×
		</button>

		<!-- 上一张按钮 -->
		<button
			v-if="images.length > 1"
			class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl w-12 h-12 flex items-center justify-center transition-colors z-10"
			@click.stop="prev"
		>
			←
		</button>

		<!-- 下一张按钮 -->
		<button
			v-if="images.length > 1"
			class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl w-12 h-12 flex items-center justify-center transition-colors z-10"
			@click.stop="next"
		>
			→
		</button>

		<!-- 图片计数器 -->
		<div class="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
			{{ currentIndex + 1 }} / {{ images.length }}
		</div>

		<!-- 大图 -->
		<div class="max-w-[90vw] max-h-[85vh] relative flex items-center justify-center" @click.stop>
			<template v-if="currentImage">
				<!-- 情况1：原图已加载，直接显示原图（使用 Blob URL） -->
				<img
					v-if="isCurrentImageLoaded"
					:src="getLoadedImageUrl(currentImage.id, getFullImageUrl(currentImage, currentImage.image))"
					:alt="galleryTitle"
					class="max-w-full max-h-[85vh] object-contain"
				/>
				
				<!-- 情况2：原图未加载，但缩略图已预加载，显示缩略图+加载动画 -->
				<template v-else-if="isThumbnailPreloaded">
					<img
						:src="getThumbnailUrl(currentImage, currentImage.image)"
						:alt="galleryTitle"
						class="max-w-full max-h-[85vh] object-contain"
					/>
					<!-- 加载动画和进度 -->
					<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
						<div class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
						<div v-if="currentImageProgress && currentImageProgress.total > 0" class="text-white/80 text-sm font-mono">
							{{ formatFileSize(currentImageProgress.loaded) }} / {{ formatFileSize(currentImageProgress.total) }}
							<span class="ml-2">({{ Math.round((currentImageProgress.loaded / currentImageProgress.total) * 100) }}%)</span>
						</div>
						<div v-else class="text-white/60 text-sm">加载中...</div>
					</div>
					<!-- 使用 Image 对象预加载原图 -->
					{{ preloadFullImage(currentImage.id, getFullImageUrl(currentImage, currentImage.image)) }}
				</template>
				
				<!-- 情况3：缩略图未预加载，直接黑屏加载原图 -->
				<template v-else>
					<!-- 黑屏占位 -->
					<div class="w-[50vw] h-[70vh] max-w-full max-h-[85vh] bg-black/50"></div>
					<!-- 加载动画和进度 -->
					<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
						<div class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
						<div v-if="currentImageProgress && currentImageProgress.total > 0" class="text-white/80 text-sm font-mono">
							{{ formatFileSize(currentImageProgress.loaded) }} / {{ formatFileSize(currentImageProgress.total) }}
							<span class="ml-2">({{ Math.round((currentImageProgress.loaded / currentImageProgress.total) * 100) }}%)</span>
						</div>
						<div v-else class="text-white/60 text-sm">加载中...</div>
					</div>
					<!-- 使用 Image 对象预加载原图 -->
					{{ preloadFullImage(currentImage.id, getFullImageUrl(currentImage, currentImage.image)) }}
				</template>
			</template>
		</div>

		<!-- 图集标题 -->
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
			{{ galleryTitle }}
		</div>
	</div>
</template>

<style scoped>
/* 加载动画 */
@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
.animate-spin {
	animation: spin 1s linear infinite;
}
</style>
