<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import type { Gallery } from '@/types';

const stats = ref({
    galleries: 0,
    images: 0,
    publishedGalleries: 0,
});

const loading = ref(true);

onMounted(async () => {
    try {
        const galleries = await pb.collection('galleries').getFullList();
        stats.value.galleries = galleries.length;
        stats.value.publishedGalleries = (galleries as unknown as Gallery[]).filter(g => g.published).length;

        const images = await pb.collection('gallery_images').getList(1, 1);
        stats.value.images = images.totalItems;
    } catch (error) {
        console.error('Failed to fetch stats:', error);
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-semibold text-[#c9c9c9]">仪表盘</h1>
            <p class="text-[#888] mt-1">欢迎来到管理后台</p>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
        </div>

        <template v-else>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <RouterLink
                    to="/admin/galleries"
                    class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-6 hover:border-red-300/30 transition-colors group"
                >
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center text-2xl">
                            🖼
                        </div>
                        <div>
                            <p class="text-[#888] text-sm">图集总数</p>
                            <p class="text-2xl font-semibold text-[#c9c9c9] group-hover:text-red-300 transition-colors">{{ stats.galleries }}</p>
                        </div>
                    </div>
                </RouterLink>

                <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center text-2xl">
                            📸
                        </div>
                        <div>
                            <p class="text-[#888] text-sm">图片总数</p>
                            <p class="text-2xl font-semibold text-[#c9c9c9]">{{ stats.images }}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center text-2xl">
                            ✅
                        </div>
                        <div>
                            <p class="text-[#888] text-sm">已发布图集</p>
                            <p class="text-2xl font-semibold text-[#c9c9c9]">{{ stats.publishedGalleries }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-6">
                <h2 class="text-lg font-semibold text-[#c9c9c9] mb-4">快速操作</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <RouterLink
                        to="/admin/galleries/new"
                        class="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <svg class="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        <span class="text-[#c9c9c9]">新建图集</span>
                    </RouterLink>
                    <RouterLink
                        to="/admin/galleries"
                        class="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <svg class="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                        </svg>
                        <span class="text-[#c9c9c9]">管理图集</span>
                    </RouterLink>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
.animate-spin {
    animation: spin 1s linear infinite;
}
</style>
