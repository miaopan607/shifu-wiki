<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import { marked } from 'marked';

interface Profile {
	id: string;
	content: string;
}

const profile = ref<Profile | null>(null);
const loading = ref(true);
const contentHtml = ref('');

onMounted(async () => {
	try {
		const records = await pb.collection('profile').getFullList();
		if (records.length > 0) {
			profile.value = records[0] as unknown as Profile;
			if (profile.value.content) {
				contentHtml.value = await marked(profile.value.content);
			}
		}
	} catch (error) {
		console.error('Failed to fetch profile:', error);
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif text-[#e0e0e0]">
		<div class="max-w-2xl mx-auto">
			<header class="mb-16">
				<RouterLink to="/" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回首页</RouterLink>
			</header>

			<div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

			<div v-else-if="!profile" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">
				<p>暂无个人介绍</p>
			</div>

			<div v-else class="space-y-12">
				<section>
					<h1 class="text-4xl text-[#c9c9c9] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)] mb-6">
						个人介绍
					</h1>
				</section>

				<div class="h-px w-full bg-[#c9c9c9]/20"></div>

				<section>
					<div class="prose prose-invert mx-auto content-container text-lg leading-relaxed text-[#c9c9c9]" v-html="contentHtml"></div>
				</section>
			</div>
		</div>
	</main>
</template>

<style>
.prose h1, .prose h2, .prose h3, .prose h4 {
	color: #e0e0e0;
	margin-top: 2em;
	margin-bottom: 1em;
}
.prose p {
	margin-bottom: 1.5em;
	line-height: 1.8;
}
.prose a {
	color: #fca5a5;
	text-decoration: none;
	border-bottom: 1px solid transparent;
	transition: all 0.3s;
}
.prose a:hover {
	border-bottom-color: #fca5a5;
}
.prose blockquote {
	border-left-color: #fca5a5;
	background: rgba(255, 255, 255, 0.05);
	padding: 1em;
	font-style: italic;
}
.prose ul, .prose ol {
	margin-bottom: 1.5em;
	padding-left: 1.5em;
}
.prose li {
	margin-bottom: 0.5em;
}
</style>
