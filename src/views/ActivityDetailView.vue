<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';

const route = useRoute();
const router = useRouter();
const activity = ref<any>(null);
const loading = ref(true);

const THEME_COLOR = 'rgb(77,0,0)';

onMounted(async () => {
	const slug = route.params.slug;
	if (!slug) {
		router.replace('/404');
		return;
	}

	try {
		activity.value = await pb.collection('activities').getFirstListItem(`index="${slug}"`);
		if (activity.value) {
			document.title = `${activity.value.title} | 黄诗扶 Wiki`;
		}
	} catch (error) {
		console.error('Failed to fetch activity:', error);
		router.replace('/404');
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<main class="min-h-screen p-8 md:p-20 font-serif text-[#e0e0e0]" :style="{ backgroundColor: THEME_COLOR }">
		<div v-if="loading" class="flex items-center justify-center italic h-[60vh]">加载中...</div>

		<div v-else-if="activity" class="max-w-2xl mx-auto relative transition-opacity duration-300">
			<nav class="mb-12">
				<RouterLink to="/activities" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回列表 </RouterLink>
			</nav>

			<article class="w-full">
				<header class="mb-6">
					<h1 class="text-5xl text-[#c9c9c9] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)]">
						{{ activity.title }}
					</h1>
					<div class="flex flex-wrap items-center gap-y-2 text-[#888] text-sm tracking-widest mt-4">
						<div class="flex items-center">
							<span>时间：{{ activity.date }}</span>
							<span class="mx-4 h-3 w-px bg-[#c9c9c9]/30"></span>
						</div>
						<div v-if="activity.location" class="flex items-center">
							<span>地点：{{ activity.location }}</span>
							<span class="mx-4 h-3 w-px bg-[#c9c9c9]/30"></span>
						</div>
					</div>
				</header>
				<hr class="border-[#c9c9c9]/30 mb-8" />

				<!-- 活动正文内容 -->
				<div class="prose prose-invert mx-auto content-container text-lg leading-relaxed text-[#c9c9c9]" v-html="activity.content || activity.description || '暂无详细介绍'"></div>
			</article>
		</div>
	</main>
</template>

<style scoped>
/* Scoped styles can be added here if needed */
</style>
