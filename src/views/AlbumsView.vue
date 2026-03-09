<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import SubPageNav from '@/components/SubPageNav.vue';
import SongsNav from '@/components/SongsNav.vue';
import AppIcon from '@/components/AppIcon.vue';

const albums = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
    try {
        const [albumsResult, songsResult] = await Promise.all([
            pb.collection('albums').getFullList({ sort: '-releaseDate', fields: 'id,collectionId,title,releaseDate,cover' }),
            pb.collection('songs').getFullList({ fields: 'album' })
        ]);
        albums.value = albumsResult.map(album => ({
            ...album,
            songCount: songsResult.filter(s => s.album === album.title).length
        }));
    } catch (error) {
        console.warn('Failed to fetch albums:', error);
        albums.value = [];
    } finally {
        loading.value = false;
    }
});

import { formatDateToDisplay } from '@/lib/pocketbase';

const formatDate = (dateStr: string) => {
    return formatDateToDisplay(dateStr);
};

const getImageUrl = (record: any, filename: string) => {
    if (!filename) return '';
    return pb.files.getURL(record, filename, { thumb: '400x400' });
};
</script>

<template>
    <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif">
        <div class="max-w-2xl mx-auto">
            <header class="mb-16">
                <RouterLink to="/" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回首页</RouterLink>
                <SubPageNav activePage="songs" />
                <SongsNav activeTab="albums" />
            </header>

            <div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

            <div v-else>
                <div v-if="albums.length === 0" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">暂无专辑数据</div>
                <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <RouterLink v-for="album in albums" :key="album.id" :to="`/albums/${encodeURIComponent(album.title)}`"
                        class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl overflow-hidden group hover:border-red-300/50 transition-all">
                        <div class="aspect-square relative overflow-hidden bg-black/40">
                            <img
                                v-if="album.cover"
                                :src="getImageUrl(album, album.cover)"
                                :alt="album.title"
                                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div v-else class="w-full h-full flex items-center justify-center text-[#c9c9c9]/20">
                                <AppIcon name="music-note" class-name="w-16 h-16" />
                            </div>
                            <div class="absolute top-[3%] right-[3%] px-[4%] py-[2%] bg-black/40 backdrop-blur-sm rounded-full text-[clamp(10px,10%,14px)] text-[#c9c9c9]/80 flex items-center gap-[0.6em]">
                                <AppIcon name="music" class-name="w-[1.4em] h-[1.4em]" />
                                <span class="text-[2em] leading-none -translate-y-[0.1em]">{{ album.songCount }}</span>
                            </div>
                        </div>
                        <div class="p-4 space-y-2">
                            <h3 class="font-medium text-[#c9c9c9] truncate group-hover:text-red-300 transition-colors" :title="album.title">{{ album.title }}</h3>
                            <div class="flex items-center gap-1 text-xs text-[#888]">
                                <AppIcon name="date" />
                                <span>{{ formatDate(album.releaseDate) }}</span>
                            </div>
                        </div>
                    </RouterLink>
                </div>
            </div>
        </div>
    </main>
</template>