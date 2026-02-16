<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import SubPageNav from '@/components/SubPageNav.vue';
import type { Gallery } from '@/types';

const galleries = ref<Gallery[]>([]);
const loading = ref(true);

onMounted(async () => {
    try {
        const result = await pb.collection('galleries').getFullList({
            sort: '-date',
            filter: 'published = true',
        });
        galleries.value = result as unknown as Gallery[];
    } catch (error) {
        console.warn('Failed to fetch galleries:', error);
        galleries.value = [];
    } finally {
        loading.value = false;
    }
});

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
</script>

<template>
    <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif">
        <div class="max-w-2xl mx-auto">
            <header class="mb-16">
                <RouterLink to="/" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回首页</RouterLink>
                <SubPageNav activePage="galleries" />
            </header>

            <div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

            <div v-else>
                <div v-if="galleries.length === 0" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">暂无图集数据</div>
                <div v-else class="space-y-10">
                    <RouterLink v-for="gallery in galleries" :key="gallery.id" :to="`/galleries/${gallery.slug || gallery.id}`" class="group block border-b border-[#c9c9c9]/20 pb-8 hover:border-red-300/50 transition-all">
                        <div class="flex justify-between items-end">
                            <div>
                                <h2 class="text-2xl text-[#c9c9c9] group-hover:text-red-300 transition-colors">{{ gallery.title }}</h2>
                                <p class="text-[#888] mt-2 tracking-widest text-sm">
                                    <span v-if="gallery.date">{{ formatDate(gallery.date) }}</span>
                                    <span v-if="gallery.date && gallery.description"> · </span>
                                    <span v-if="gallery.description" class="line-clamp-2 inline">{{ gallery.description }}</span>
                                </p>
                            </div>
                            <span class="text-red-300 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">查看图集 →</span>
                        </div>
                    </RouterLink>
                </div>
            </div>
        </div>
    </main>
</template>
