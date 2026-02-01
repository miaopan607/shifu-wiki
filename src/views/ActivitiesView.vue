<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import SubPageNav from '@/components/SubPageNav.vue';

interface Theme {
	id: string;
	label: string;
	bgColor: string;
	textColor: string;
	accentColor: string;
	tag?: string;
}

interface Activity {
	id: string;
	index: number;
	title: string;
	date: string;
	location?: string;
	tags?: string[];
}

const THEMES: Record<string, Theme> = {
	all: {
		id: 'all',
		label: '全部',
		bgColor: 'rgb(77, 0, 0)',
		textColor: '#c9c9c9',
		accentColor: '#fca5a5',
	},
	ren_jian: {
		id: 'ren_jian',
		label: '人间',
		tag: '人间',
		bgColor: '#516a6f',
		textColor: '#d1d5db',
		accentColor: '#fbbf24',
	},
	back_into_fantasia: {
		id: 'back_into_fantasia',
		label: '入梦',
		tag: '入梦',
		bgColor: 'rgb(77, 0, 0)',
		textColor: '#c9c9c9',
		accentColor: '#fca5a5',
	},
};

const DEFAULT_BG = 'rgb(77, 0, 0)';
const currentThemeId = ref('all');
const activities = ref<Activity[]>([]);
const loading = ref(true);

const currentTheme = computed<Theme>(() => {
	const theme = THEMES[currentThemeId.value];
	return (theme || THEMES.all) as Theme;
});

const filteredActivities = computed(() => {
	const targetTag = currentTheme.value.tag;
	if (!targetTag) return activities.value;
	return activities.value.filter((a) => a.tags?.includes(targetTag));
});

onMounted(async () => {
	try {
		const records = await pb.collection('activities').getFullList({
			sort: '-date',
		});
		activities.value = records.map((record) => ({
			id: record.id,
			index: record.index,
			title: record.title,
			date: record.date,
			location: record.location,
			tags: Array.isArray(record.tags) ? record.tags : [],
		}));
	} catch (e) {
		console.warn('Failed to fetch activities:', e);
	} finally {
		loading.value = false;
	}

	// Set initial theme colors
	applyTheme(currentTheme.value);
});

onUnmounted(() => {
	// Reset global styles when leaving
	document.documentElement.style.backgroundColor = '';
	document.documentElement.style.removeProperty('--scroll-thumb');
	document.documentElement.style.removeProperty('--scroll-track');
});

const switchTheme = (id: string) => {
	currentThemeId.value = id;
};

const applyTheme = (theme: Theme) => {
	document.documentElement.style.backgroundColor = theme.bgColor;
	document.documentElement.style.setProperty('--scroll-thumb', theme.accentColor + '44');
	document.documentElement.style.setProperty('--scroll-track', theme.bgColor);
};

watch(currentTheme, (newTheme) => {
	applyTheme(newTheme);
});
</script>

<template>
	<main
		id="main-container"
		class="min-h-screen p-8 md:p-20 transition-colors duration-500 font-serif"
		:style="{
			color: currentTheme.textColor,
			'--accent-color': currentTheme.accentColor,
			backgroundColor: currentTheme.bgColor,
		}"
	>
		<div class="max-w-2xl mx-auto">
			<header class="mb-12">
				<RouterLink to="/" id="back-link" class="text-lg transition-colors" :style="{ color: currentTheme.accentColor }">← 返回首页</RouterLink>
				<SubPageNav activePage="activities" />
			</header>

			<!-- 选项卡按钮 -->
			<nav class="flex gap-4 mb-12">
				<button
					v-for="theme in THEMES"
					:key="theme.id"
					@click="switchTheme(theme.id)"
					class="tab-button px-6 py-1.5 rounded-full border border-current hover:opacity-80 transition-all cursor-pointer text-lg"
					:style="theme.id === currentThemeId ? { backgroundColor: theme.textColor, color: theme.bgColor } : {}"
				>
					{{ theme.label }}
				</button>
			</nav>

			<div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest">加载中...</div>

			<div v-else id="activities-list" class="space-y-10">
				<template v-if="filteredActivities.length > 0">
					<RouterLink
						v-for="activity in filteredActivities"
						:key="activity.id"
						:to="`/activities/${activity.index}`"
						class="activity-item group block border-b border-current/20 pb-8 hover:border-red-300/50 transition-all"
					>
						<div class="flex justify-between items-end">
							<div>
								<h2 class="text-2xl group-hover:text-red-300 transition-colors">{{ activity.title }}</h2>
								<p class="opacity-60 mt-2 tracking-widest text-sm">{{ activity.date }} {{ activity.location ? `· ${activity.location}` : '' }}</p>
							</div>
							<span class="accent-text opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">详情 →</span>
						</div>
					</RouterLink>
				</template>
				<p v-else class="text-center py-20 opacity-40 italic tracking-widest">暂无活动记录</p>
			</div>
		</div>
	</main>
</template>

<style scoped>
.tab-button {
	font-family: inherit;
}

.accent-text {
	color: var(--accent-color, inherit);
}

/* Base background transition is handled by global.css and documentElement style */
</style>
