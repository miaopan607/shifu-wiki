<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import SubPageNav from '@/components/SubPageNav.vue';
import Lightbox from '@/components/Lightbox.vue';
import type { Gallery, GalleryImage } from '@/types';

interface GalleryWithPreview extends Gallery {
	previewImages?: GalleryImage[];
}

const galleries = ref<GalleryWithPreview[]>([]);
const loading = ref(true);

// 灯箱状态
const lightboxOpen = ref(false);
const lightboxImages = ref<GalleryImage[]>([]);
const lightboxIndex = ref(0);
const lightboxGalleryTitle = ref('');

// 记录哪些图片应该加载（已进入视口）
const imagesToLoad = ref<Set<string>>(new Set());
// 记录哪些图片已经完全加载完成
const imagesLoaded = ref<Set<string>>(new Set());

onMounted(async () => {
	try {
		const result = await pb.collection('galleries').getFullList({
			sort: '-date',
			filter: 'published = true',
		});
		galleries.value = result as unknown as GalleryWithPreview[];

		// 为每个图集获取所有图片元数据（但不加载图片文件）
		for (const gallery of galleries.value) {
			try {
				// 使用 getFullList 获取所有图片
				const imagesResult = await pb.collection('gallery_images').getFullList({
					filter: `gallery = "${gallery.id}"`,
					sort: 'sort',
				});
				gallery.previewImages = imagesResult as unknown as GalleryImage[];
			} catch (e) {
				gallery.previewImages = [];
			}
		}
	} catch (error) {
		console.warn('Failed to fetch galleries:', error);
		galleries.value = [];
	} finally {
		loading.value = false;
		// 初始化后设置观察器
		setTimeout(() => {
			setupIntersectionObserver();
		}, 100);
	}
});

// 使用 Intersection Observer 检测图片是否进入视口
let observer: IntersectionObserver | null = null;

const setupIntersectionObserver = () => {
	if (observer) observer.disconnect();

	observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const imgId = entry.target.getAttribute('data-img-id');
					if (imgId) {
						imagesToLoad.value.add(imgId);
						// 加载后停止观察这张图片
						observer?.unobserve(entry.target);
					}
				}
			});
		},
		{
			root: null, // 使用视口
			rootMargin: '100px', // 提前 100px 开始加载
			threshold: 0, // 只要有部分进入视口就触发
		}
	);

	// 观察所有图片占位元素
	document.querySelectorAll('.img-placeholder').forEach((el) => {
		observer?.observe(el);
	});
};

onUnmounted(() => {
	if (observer) {
		observer.disconnect();
		observer = null;
	}
});

const formatDate = (dateStr: string) => {
	if (!dateStr) return '';
	return new Date(dateStr).toLocaleDateString('zh-CN', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
};

const getThumbnailUrl = (record: GalleryImage, filename: string) => {
	return pb.files.getURL(record, filename, { thumb: '0x720' });
};

// 检查图片是否应该加载
const shouldLoadImage = (imgId: string) => {
	return imagesToLoad.value.has(imgId);
};

// 检查图片是否已完全加载
const isImageLoaded = (imgId: string) => {
	return imagesLoaded.value.has(imgId);
};

// 图片加载完成回调
const onImageLoad = (imgId: string) => {
	imagesLoaded.value.add(imgId);
};

// 打开灯箱查看大图
const openLightbox = (images: GalleryImage[], startIndex: number, galleryTitle: string, event: Event) => {
	event.preventDefault();
	event.stopPropagation();
	lightboxImages.value = images;
	lightboxIndex.value = startIndex;
	lightboxGalleryTitle.value = galleryTitle;
	lightboxOpen.value = true;
};
</script>

<template>
	<main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif">
		<div class="max-w-2xl mx-auto">
			<header class="mb-16">
				<RouterLink to="/" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回首页</RouterLink>
				<SubPageNav activePage="galleries" />
			</header>

			<div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

			<div v-else>
				<div v-if="galleries.length === 0" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">暂无图集数据</div>
				<div v-else class="space-y-10">
					<RouterLink
						v-for="gallery in galleries"
						:key="gallery.id"
						:to="`/galleries/${gallery.slug || gallery.id}`"
						class="group block border-b border-[#c9c9c9]/20 pb-8 hover:border-red-300/50 transition-all"
					>
						<!-- 标题和描述 -->
						<div class="flex justify-between items-end mb-4">
							<div>
								<h2 class="text-2xl text-[#c9c9c9] group-hover:text-red-300 transition-colors">{{ gallery.title }}</h2>
								<p class="text-[#888] mt-2 tracking-widest text-sm">
								<span v-if="gallery.date">{{ formatDate(gallery.date) }}</span>
							</p>
							</div>
							<span class="text-red-300 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">查看图集 →</span>
						</div>

						<!-- 图片预览区域 -->
						<div
							v-if="gallery.previewImages && gallery.previewImages.length > 0"
							class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
						>
							<div
								v-for="(img, index) in gallery.previewImages"
								:key="img.id"
								:data-img-id="img.id"
								class="img-placeholder shrink-0 relative aspect-3/4 w-32 overflow-hidden rounded-lg bg-black/20 cursor-zoom-in group/img"
								@click="openLightbox(gallery.previewImages!, index, gallery.title, $event)"
							>
								<!-- 图片内容：只有进入视口才加载，且加载完成后才显示 -->
								<img
									v-if="shouldLoadImage(img.id)"
									:src="getThumbnailUrl(img, img.image)"
									:alt="gallery.title"
									class="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
									:class="{ 'opacity-0': !isImageLoaded(img.id) }"
									@load="onImageLoad(img.id)"
								/>
								<!-- 加载动画：未进入视口或未加载完成时显示 -->
								<div
									v-if="!shouldLoadImage(img.id) || !isImageLoaded(img.id)"
									class="absolute inset-0 flex items-center justify-center"
								>
									<div class="w-6 h-6 border-2 border-[#c9c9c9]/30 border-t-[#c9c9c9] rounded-full animate-spin"></div>
								</div>
								
							</div>
						</div>
					</RouterLink>
				</div>
			</div>
		</div>
	</main>

	<!-- 灯箱组件 -->
	<Lightbox
		v-model="lightboxOpen"
		:images="lightboxImages"
		:initial-index="lightboxIndex"
		:gallery-title="lightboxGalleryTitle"
		:preloaded-thumbnails="imagesToLoad"
	/>
</template>

<style scoped>
.line-clamp-2 {
	display: -webkit-box;
	display: box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	box-orient: vertical;
	overflow: hidden;
}

/* 隐藏滚动条但保持滚动功能 */
.scrollbar-hide {
	-ms-overflow-style: none;
	scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
	display: none;
}

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
