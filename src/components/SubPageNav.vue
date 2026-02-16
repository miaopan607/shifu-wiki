<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineProps<{
	activePage: 'songs' | 'activities' | 'galleries' | 'misc';
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

		<div class="relative group">
			<RouterLink
				to="/galleries"
				id="nav-galleries"
				class="nav-link text-5xl tracking-widest transition-all duration-300 block"
				:class="activePage === 'galleries' ? 'active text-[#c9c9c9] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)]' : 'text-[#888] hover:text-[#c9c9c9]'"
			>
				图集
			</RouterLink>
			<div
				id="nav-line-galleries"
				class="nav-line h-px w-full transition-all duration-300 mt-4"
				:class="activePage === 'galleries' ? 'bg-[#c9c9c9] shadow-[0_0_5px_#c9c9c9] opacity-100' : 'bg-transparent opacity-0'"
			></div>
		</div>

		<div class="relative group">
			<RouterLink
				to="/misc"
				id="nav-misc"
				class="nav-link text-5xl tracking-widest transition-all duration-300 block"
				:class="activePage === 'misc' ? 'active text-[#c9c9c9] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)]' : 'text-[#888] hover:text-[#c9c9c9]'"
			>
				杂记
			</RouterLink>
			<div
				id="nav-line-misc"
				class="nav-line h-px w-full transition-all duration-300 mt-4"
				:class="activePage === 'misc' ? 'bg-[#c9c9c9] shadow-[0_0_5px_#c9c9c9] opacity-100' : 'bg-transparent opacity-0'"
			></div>
		</div>
	</div>
</template>

<style scoped>
.nav-link.active {
	color: inherit;
}
</style>
