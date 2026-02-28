<script setup lang="ts">
	import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';

const settings = ref<Record<string, string>>({
	about_description: '黄诗扶 Wiki 是一个由粉丝维护的非官方资料站，致力于整理和分享黄诗扶的音乐作品、活动记录等相关信息。',
	about_github: 'https://github.com/miaopan607/shifu-wiki',
	about_contact: 'miaopan607@foxmail.com',
	about_disclaimer: '本站为粉丝自建非官方网站，所有资料仅供参考。如有侵权或错误，请联系项目维护者。',
});

onMounted(async () => {
	try {
		const records = await pb.collection('site_settings').getFullList();
		records.forEach(r => {
			if (r.key in settings.value) {
				settings.value[r.key] = r.value;
			}
		});
	} catch (e) {
		console.warn('Failed to fetch site settings, using defaults');
	}
});
</script>

<template>
	<main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif text-[#e0e0e0]">
		<div class="max-w-2xl mx-auto">
			<header class="mb-16">
				<RouterLink to="/" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回首页</RouterLink>
			</header>

			<div class="space-y-12">
				<!-- 页面标题 -->
				<section>
					<h1 class="text-4xl text-[#c9c9c9] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)] mb-6">
						关于
					</h1>
					<p class="text-[#888] leading-relaxed tracking-wider">
						{{ settings.about_description }}
					</p>
				</section>

				<!-- 装饰线 -->
				<div class="h-px w-full bg-[#c9c9c9]/20"></div>

				<!-- GitHub 仓库 -->
				<section>
					<h2 class="text-2xl text-[#c9c9c9] tracking-widest mb-6">开源仓库</h2>
					<a :href="settings.about_github" target="_blank" rel="noopener noreferrer"
					   class="inline-flex items-center gap-3 text-red-300 hover:text-[#c9c9c9] transition-colors group">
						<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
						</svg>
						<span class="text-lg border-b border-transparent group-hover:border-[#c9c9c9] transition-all">GitHub - shifu-wiki</span>
					</a>
				</section>

				<!-- 装饰线 -->
				<div class="h-px w-full bg-[#c9c9c9]/20"></div>

				<!-- 鸣谢名单 -->
				<section>
					<h2 class="text-2xl text-[#c9c9c9] tracking-widest mb-6">鸣谢</h2>
					<p class="text-[#888] mb-6 leading-relaxed">
						感谢以下人员对项目的贡献与支持：
					</p>
					<ul class="space-y-3 text-[#c9c9c9]">
						<li class="flex items-center gap-2">
							<span class="w-1.5 h-1.5 bg-red-300 rounded-full"></span>
							<span>甲</span>
						</li>
						<li class="flex items-center gap-2">
							<span class="w-1.5 h-1.5 bg-red-300 rounded-full"></span>
							<span>乙</span>
						</li>
						<li class="flex items-center gap-2">
							<span class="w-1.5 h-1.5 bg-red-300 rounded-full"></span>
							<span>丙</span>
						</li>
					</ul>
				</section>

				<!-- 装饰线 -->
				<div class="h-px w-full bg-[#c9c9c9]/20"></div>

				<!-- 联系方式 -->
				<section>
					<h2 class="text-2xl text-[#c9c9c9] tracking-widest mb-6">联系方式</h2>
					<p class="text-[#888] leading-relaxed">
						如有任何问题或建议，欢迎邮件联系：
						<a :href="'mailto:' + settings.about_contact" class="text-red-300 hover:text-[#c9c9c9] transition-colors border-b border-transparent hover:border-[#c9c9c9]">{{ settings.about_contact }}</a>
					</p>
				</section>

				<!-- 装饰线 -->
				<div class="h-px w-full bg-[#c9c9c9]/20"></div>

				<!-- 免责声明 -->
				<section>
					<p class="text-[#666] text-sm leading-relaxed">
						{{ settings.about_disclaimer }}
					</p>
				</section>
			</div>
		</div>
	</main>
</template>

<style scoped>
h1, h2, p, li, span {
	font-family: var(--font-serif);
}
</style>
