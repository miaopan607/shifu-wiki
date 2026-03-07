<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { pb, decodeSongLinkNames, formatDateToDisplay } from '@/lib/pocketbase';
import { marked } from 'marked';
import MetaIcon from '@/components/MetaIcon.vue';

const route = useRoute();
const router = useRouter();
const song = ref<any>(null);
const loading = ref(true);
const showCredits = ref(false);

const backLink = computed(() => {
	const from = route.query.from;
	const albumTitle = route.query.albumTitle as string;

	if (from === 'album' && albumTitle) {
		return `/albums/${albumTitle}`;
	}
	return '/songs';
});

const backText = computed(() => {
	if (route.query.from === 'album') {
		return '← 返回专辑';
	}
	return '← 返回列表';
});

// 元数据项配置
interface MetaItem {
	label?: string;
	value: string;
	icon?: string;
}

const metaItems = computed<MetaItem[]>(() => {
	if (!song.value) return [];
	const items: MetaItem[] = [];
	if (song.value.lyricist) items.push({ label: '词', value: song.value.lyricist, icon: 'lyricist' });
	if (song.value.composer) items.push({ label: '曲', value: song.value.composer, icon: 'composer' });
	if (song.value.album) items.push({ label: '专辑', value: song.value.album, icon: 'album' });
	if (song.value.releaseDate) items.push({ value: formatDateToDisplay(song.value.releaseDate), icon: 'date' });
	return items;
});

onMounted(async () => {
	const slug = route.params.slug;
	if (!slug) {
		router.replace('/404');
		return;
	}

	try {
		song.value = decodeSongLinkNames(await pb.collection('songs').getFirstListItem(`index="${slug}"`));
		if (song.value) {
			document.title = `${song.value.title} | 黄诗扶 Wiki`;
		}
	} catch (error) {
		console.error('Failed to fetch song:', error);
		router.replace('/404');
	} finally {
		loading.value = false;
	}
});

const closeModal = () => {
	showCredits.value = false;
	document.body.style.overflow = 'auto';
};

const openModal = () => {
	showCredits.value = true;
	document.body.style.overflow = 'hidden';
};

const renderMarkdown = (content: string | undefined) => {
	if (!content) return '';
	return marked.parse(content, { async: false }) as string;
};

</script>

<template>
	<main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif text-[#e0e0e0]">
		<div v-if="loading" class="flex items-center justify-center italic h-[60vh]">加载中...</div>

		<div v-else-if="song" class="max-w-2xl mx-auto relative transition-opacity duration-300">
			<nav class="mb-12">
				<RouterLink :to="backLink" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">{{ backText }}</RouterLink>
			</nav>

			<div class="relative">
				<article class="w-full">
					<header class="mb-6">
						<!-- 标题 -->
						<h1 class="text-5xl text-[#c9c9c9] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)]">
							{{ song.title }}
						</h1>
						<!-- 元数据 -->
					<div class="flex flex-wrap items-center gap-y-2 text-[#888] text-sm tracking-widest mt-4">
						<template v-for="(item, index) in metaItems" :key="index">
							<div class="flex items-center">
								<div class="flex items-center gap-1.5">
									<MetaIcon :name="item.icon as any" />
									<span v-if="item.label">{{ item.label }}：{{ item.value }}</span>
									<span v-else>{{ item.value }}</span>
								</div>
								<span v-if="index < metaItems.length - 1 || song.credits" class="mx-4 h-3 w-px bg-[#c9c9c9]/30"></span>
							</div>
						</template>
						<button v-if="song.credits" @click="openModal" class="w-fit transition-all duration-300 border-b border-transparent hover:border-red-300 hover:text-red-300 text-left cursor-pointer flex items-center gap-1.5">
							<MetaIcon name="users" />
							制作人员
						</button>
					</div>
					</header>
					<!-- 装饰线 -->
					<hr class="border-[#c9c9c9]/30 mb-8" />
					
					<!-- 描述内容 -->
					<div v-if="song.description" class="prose prose-invert mx-auto mb-8 text-[#c9c9c9]/90 leading-relaxed tracking-wider text-base">
						<div v-html="renderMarkdown(song.description)"></div>
					</div>

					<!-- 描述与歌词的分隔线 -->
					<hr v-if="song.description" class="border-[#c9c9c9]/30 mb-8" />

					<!-- 歌词内容 -->
					<div class="prose prose-invert mx-auto lyrics-container mt-0 text-lg whitespace-pre-line" v-html="song.lyrics"></div>
				</article>
				<!-- 右侧边栏 -->
				<aside class="w-full lg:w-56 shrink-0 mt-12 lg:mt-0 lg:absolute lg:left-[calc(100%+4rem)] lg:top-0">
					<hr class="border-[#c9c9c9]/30 mb-5" />
					<template v-if="song.links && Array.isArray(song.links) && song.links.length > 0">
						<div class="flex flex-col gap-4 px-2">
							<a
								v-for="link in song.links"
								:key="link.url"
								:href="link.url"
								target="_blank"
								rel="noopener noreferrer"
								class="text-[#c9c9c9]/80 hover:text-red-300 transition-all duration-300 text-sm tracking-[0.2em] flex items-start group whitespace-pre-line"
							>
								<span class="mr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">→</span>
								{{ link.name }}
							</a>
						</div>
						<hr class="border-[#c9c9c9]/30 mt-5 mb-5" />
					</template>

					<template v-if="song.otherLinks && Array.isArray(song.otherLinks) && song.otherLinks.length > 0">
						<div class="flex flex-col gap-4 px-2">
							<a
								v-for="link in song.otherLinks"
								:key="link.url"
								:href="link.url"
								target="_blank"
								rel="noopener noreferrer"
								class="text-[#c9c9c9]/80 hover:text-red-300 transition-all duration-300 text-sm tracking-[0.2em] flex items-start group whitespace-pre-line"
							>
								<span class="mr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">→</span>
								{{ link.name }}
							</a>
						</div>
						<hr class="border-[#c9c9c9]/30 mt-5" />
					</template>
				</aside>
			</div>
		</div>
	</main>

	<!-- 制作人员名单 -->
	<Transition name="fade">
		<div v-if="showCredits" class="fixed inset-0 z-50 flex items-center justify-center px-4">
			<div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="closeModal"></div>
			<div class="relative bg-[rgb(60,0,0)] p-8 md:p-12 max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-lg shadow-2xl border border-red-300/20 scrollbar-hide">
				<button @click="closeModal" class="absolute top-4 right-4 text-[#c9c9c9] hover:text-red-300 transition-colors cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
				<div>
					<h3 class="text-2xl text-[#c9c9c9] mb-10 tracking-widest border-b border-[#c9c9c9]/10 pb-4 inline-block">制作人员</h3>
					<div class="whitespace-pre-line text-[#c9c9c9] leading-loose tracking-widest font-serif text-xl">{{ song.credits }}</div>
				</div>
			</div>
		</div>
	</Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
