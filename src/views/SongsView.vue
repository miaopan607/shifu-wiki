<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import SubPageNav from '@/components/SubPageNav.vue';
import SongsNav from '@/components/SongsNav.vue';
import MetaIcon from '@/components/MetaIcon.vue';

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
interface MetaPart {
	type: 'album' | 'date';
	value: string;
}

const getSongMetaParts = (song: any): MetaPart[] => {
	const parts: MetaPart[] = [];
	if (song.album) parts.push({ type: 'album', value: song.album });
	if (song.releaseDate) parts.push({ type: 'date', value: song.releaseDate });
	return parts;
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
						<div class="flex items-center gap-3 mt-2 tracking-widest text-sm text-[#888]">
							<template v-for="(part, index) in getSongMetaParts(song)" :key="index">
								<div class="flex items-center gap-1">
									<MetaIcon :name="part.type" />
									<span>{{ part.value }}</span>
								</div>
								<span v-if="index < getSongMetaParts(song).length - 1">·</span>
							</template>
						</div>
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
