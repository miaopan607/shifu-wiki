<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';

const route = useRoute();
const router = useRouter();
const song = ref<any>(null);
const loading = ref(true);
const showCredits = ref(false);

onMounted(async () => {
	const slug = route.params.slug;
	if (!slug) {
		router.replace('/404');
		return;
	}

	try {
		song.value = await pb.collection('songs').getFirstListItem(`index="${slug}"`);
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
</script>

<template>
	<main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif text-[#e0e0e0]">
		<div v-if="loading" class="flex items-center justify-center italic h-[60vh]">加载中...</div>

		<div v-else-if="song" class="max-w-2xl mx-auto relative transition-opacity duration-300">
			<nav class="mb-12">
				<RouterLink to="/songs" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回列表</RouterLink>
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
							<div class="flex items-center">
								<span>词：{{ song.lyricist }}</span>
								<span class="mx-4 h-3 w-px bg-[#c9c9c9]/30"></span>
							</div>
							<div class="flex items-center">
								<span>曲：{{ song.composer }}</span>
								<span class="mx-4 h-3 w-px bg-[#c9c9c9]/30"></span>
							</div>
							<div class="flex items-center">
								<span>专辑：{{ song.album }}</span>
								<span class="mx-4 h-3 w-px bg-[#c9c9c9]/30"></span>
							</div>
							<div class="flex items-center">
								<span>{{ song.releaseDate }}</span>
								<span class="mx-4 h-3 w-px bg-[#c9c9c9]/30"></span>
							</div>
							<button @click="openModal" class="w-fit transition-all duration-300 border-b border-transparent hover:border-red-300 hover:text-red-300 text-left cursor-pointer">
								制作人员
							</button>
						</div>
					</header>
					<!-- 装饰线 -->
					<hr class="border-[#c9c9c9]/30 mb-5" />
					<!-- 歌词内容 -->
					<div class="prose prose-invert mx-auto lyrics-container mt-0 text-lg" v-html="song.lyric"></div>
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
					<div class="whitespace-pre-line text-[#c9c9c9] leading-loose tracking-widest font-serif text-xl" v-html="song.credits"></div>
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
