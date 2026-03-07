<script setup lang="ts">
defineProps<{
	name: 'lyricist' | 'composer' | 'album' | 'date' | 'location' | 'music' | 'users' | 'tag' | 'image' | 'file';
	className?: string;
}>();
</script>

<template>
	<!-- 词作者图标 - 铅笔 -->
	<svg
		v-if="name === 'lyricist'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
	</svg>

	<!-- 曲作者图标 - 音符 -->
	<svg
		v-else-if="name === 'composer'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<path
			d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
		/>
	</svg>

	<!-- 专辑图标 - 唱片 -->
	<svg
		v-else-if="name === 'album'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<circle cx="12" cy="12" r="10" />
		<circle cx="12" cy="12" r="3" />
	</svg>

	<!-- 日期图标 - 日历 -->
	<svg
		v-else-if="name === 'date'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
		<line x1="16" y1="2" x2="16" y2="6" />
		<line x1="8" y1="2" x2="8" y2="6" />
		<line x1="3" y1="10" x2="21" y2="10" />
	</svg>

	<!-- 地点图标 - 定位 -->
	<svg
		v-else-if="name === 'location'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
		<circle cx="12" cy="10" r="3" />
	</svg>

	<!-- 音乐图标 - 音符 -->
	<svg
		v-else-if="name === 'music'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<path
			d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
		/>
	</svg>

	<!-- 用户组图标 - 制作人员 -->
	<svg
		v-else-if="name === 'users'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
	</svg>

	<!-- 标签图标 -->
	<svg
		v-else-if="name === 'tag'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
		<line x1="7" y1="7" x2="7.01" y2="7" />
	</svg>

	<!-- 图片图标 -->
	<svg
		v-else-if="name === 'image'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
		<circle cx="8.5" cy="8.5" r="1.5" />
		<polyline points="21 15 16 10 5 21" />
	</svg>

	<!-- 文件图标 -->
	<svg
		v-else-if="name === 'file'"
		:class="className || 'w-3.5 h-3.5 opacity-70'"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
		<polyline points="14 2 14 8 20 8" />
		<line x1="16" y1="13" x2="8" y2="13" />
		<line x1="16" y1="17" x2="8" y2="17" />
		<polyline points="10 9 9 9 8 9" />
	</svg>
</template>
