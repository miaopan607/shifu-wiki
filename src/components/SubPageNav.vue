<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineProps<{
	activePage: 'songs' | 'activities';
}>();
</script>

<template>
	<div class="flex gap-12 mt-8 items-baseline mb-4">
		<div class="relative group">
			<RouterLink
				to="/songs"
				id="nav-songs"
				class="nav-link text-5xl tracking-widest transition-all duration-300 block"
				:class="activePage === 'songs' ? 'active text-[#c9c9c9] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)]' : 'text-[#888] hover:text-[#c9c9c9]'"
			>
				音乐
			</RouterLink>
			<div
				id="nav-line-songs"
				class="nav-line h-px w-full transition-all duration-300 mt-4"
				:class="activePage === 'songs' ? 'bg-[#c9c9c9] shadow-[0_0_5px_#c9c9c9] opacity-100' : 'bg-transparent opacity-0'"
			></div>
		</div>

		<div class="relative group">
			<RouterLink
				to="/activities"
				id="nav-activities"
				class="nav-link text-5xl tracking-widest transition-all duration-300 block"
				:class="activePage === 'activities' ? 'active text-[#c9c9c9] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)]' : 'text-[#888] hover:text-[#c9c9c9]'"
			>
				活动
			</RouterLink>
			<div
				id="nav-line-activities"
				class="nav-line h-px w-full transition-all duration-300 mt-4"
				:class="activePage === 'activities' ? 'bg-[#c9c9c9] shadow-[0_0_5px_#c9c9c9] opacity-100' : 'bg-transparent opacity-0'"
			></div>
		</div>
	</div>
</template>

<style scoped>
.nav-link.active {
	color: inherit;
}
</style>
