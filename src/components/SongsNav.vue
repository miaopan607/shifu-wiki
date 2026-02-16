<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';

defineProps<{
    activeTab: 'singles' | 'albums'
}>();
</script>

<template>
    <div class="flex gap-8 mt-8 border-b border-[#c9c9c9]/20 pb-4">
        <RouterLink 
            to="/songs"
            class="text-xl transition-colors relative"
            :class="activeTab === 'singles' ? 'text-red-300' : 'text-[#c9c9c9] hover:text-red-300/80'"
        >
            单曲
            <span v-if="activeTab === 'singles'" class="absolute -bottom-[17px] left-0 w-full h-0.5 bg-red-300"></span>
        </RouterLink>
        <RouterLink 
            to="/albums"
            class="text-xl transition-colors relative"
            :class="activeTab === 'albums' ? 'text-red-300' : 'text-[#c9c9c9] hover:text-red-300/80'"
        >
            专辑
            <span v-if="activeTab === 'albums'" class="absolute -bottom-[17px] left-0 w-full h-0.5 bg-red-300"></span>
        </RouterLink>
    </div>
</template>