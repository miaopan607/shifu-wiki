<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import SubPageNav from '@/components/SubPageNav.vue';
import SongsNav from '@/components/SongsNav.vue';

const allSongs = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');

onMounted(async () => {
	try {
		allSongs.value = await pb.collection('songs').getFullList({
			sort: '-releaseDate',
		});
	} catch (error) {
		console.error('Failed to fetch songs:', error);
	} finally {
		loading.value = false;
	}
});

const filteredSongs = computed(() => {
	if (!searchQuery.value.trim()) {
		return allSongs.value;
	}
	const query = searchQuery.value.toLowerCase();
	return allSongs.value.filter(song =>
		song.title?.toLowerCase().includes(query) ||
		song.album?.toLowerCase().includes(query)
	);
});

// 格式化歌曲元数据
const formatSongMeta = (song: any): string => {
	const parts: string[] = [];
	if (song.album) parts.push(song.album);
	if (song.releaseDate) parts.push(song.releaseDate);
	return parts.join(' · ');
};
</script>

<template>
	<main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif">
		<div class="max-w-2xl mx-auto">
			<header class="mb-16">
				<RouterLink to="/" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回首页</RouterLink>
				<SubPageNav activePage="songs" />
				<SongsNav activeTab="singles" />
			</header>

			<div class="mb-10">
				<input
					v-model="searchQuery"
					type="text"
					placeholder="搜索音乐标题或专辑"
					class="w-full px-4 py-3 bg-[#c9c9c9]/10 border border-[#c9c9c9]/20 rounded text-[#c9c9c9] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-colors"
				/>
			</div>

			<div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

			<div v-else-if="filteredSongs.length === 0" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">未找到匹配的音乐</div>

			<div v-else class="space-y-10">
				<RouterLink v-for="song in filteredSongs" :key="song.id" :to="`/songs/${song.index}`" class="group block border-b border-[#c9c9c9]/20 pb-8 hover:border-red-300/50 transition-all">
					<div class="flex justify-between items-end">
						<div>
							<h2 class="text-2xl text-[#c9c9c9] group-hover:text-red-300 transition-colors">{{ song.title }}</h2>
							<p class="text-[#888] mt-2 tracking-widest text-sm">{{ formatSongMeta(song) }}</p>
						</div>
						<span class="text-red-300 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">详情 →</span>
					</div>
				</RouterLink>
			</div>
		</div>
	</main>
</template>

<style scoped>
/* Page specific styles */
</style>
