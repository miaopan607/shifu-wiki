<script setup lang="ts">
defineProps<{
	name: 'dashboard' | 'songs' | 'albums' | 'activities' | 'galleries' | 'misc' | 'locks' | 'profile' | 'settings';
	className?: string;
}>();
</script>

<template>
	<!-- 仪表盘图标 - 四个方块 -->
	<svg v-if="name === 'dashboard'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<rect x="3" y="3" width="7" height="7" rx="1" />
		<rect x="14" y="3" width="7" height="7" rx="1" />
		<rect x="14" y="14" width="7" height="7" rx="1" />
		<rect x="3" y="14" width="7" height="7" rx="1" />
	</svg>

	<!-- 音乐图标 - 音符 -->
	<svg v-else-if="name === 'songs'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
	</svg>

	<!-- 专辑图标 - 唱片 -->
	<svg v-else-if="name === 'albums'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<circle cx="12" cy="12" r="10" />
		<circle cx="12" cy="12" r="3" />
	</svg>

	<!-- 活动图标 - 日历 -->
	<svg v-else-if="name === 'activities'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
		<line x1="16" y1="2" x2="16" y2="6" />
		<line x1="8" y1="2" x2="8" y2="6" />
		<line x1="3" y1="10" x2="21" y2="10" />
	</svg>

	<!-- 图集图标 - 图片 -->
	<svg v-else-if="name === 'galleries'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
		<circle cx="8.5" cy="8.5" r="1.5" />
		<polyline points="21 15 16 10 5 21" />
	</svg>

	<!-- 杂记图标 - 文件 -->
	<svg v-else-if="name === 'misc'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
		<polyline points="14 2 14 8 20 8" />
		<line x1="16" y1="13" x2="8" y2="13" />
		<line x1="16" y1="17" x2="8" y2="17" />
		<polyline points="10 9 9 9 8 9" />
	</svg>

	<!-- 个人介绍图标 - 用户 -->
	<svg v-else-if="name === 'profile'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
		<circle cx="12" cy="7" r="4" />
	</svg>

	<!-- 锁管理图标 - 锁 -->
	<svg v-else-if="name === 'locks'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<rect x="5" y="11" width="14" height="10" rx="2" />
		<path d="M8 11V8a4 4 0 0 1 8 0v3" />
		<circle cx="12" cy="16" r="1" />
	</svg>

	<!-- 设置图标 - 齿轮 -->
	<svg v-else-if="name === 'settings'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<circle cx="12" cy="12" r="3" />
		<path
			d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
		/>
	</svg>
</template>
