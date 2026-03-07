<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import SubPageNav from '@/components/SubPageNav.vue';
import SongsNav from '@/components/SongsNav.vue';

const albums = ref<any[]>([]);
const loading = ref(true);

// 格式化专辑元数据
const formatAlbumMeta = (album: any): string => {
    const parts: string[] = [];
    if (album.songCount !== undefined) parts.push(`${album.songCount} 曲音乐`);
    if (album.releaseDate) parts.push(album.releaseDate);
    return parts.join(' · ');
};

onMounted(async () => {
    try {
        const [albumsResult, songsResult] = await Promise.all([
            pb.collection('albums').getFullList({ sort: '-releaseDate' }),
            pb.collection('songs').getFullList({ fields: 'album' }) // Only fetch album field for counting
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
                <div v-else class="space-y-10">
                    <RouterLink v-for="album in albums" :key="album.title" :to="`/albums/${encodeURIComponent(album.title)}`" class="group block border-b border-[#c9c9c9]/20 pb-8 hover:border-red-300/50 transition-all">
                        <div class="flex justify-between items-end">
                            <div>
                                <h2 class="text-2xl text-[#c9c9c9] group-hover:text-red-300 transition-colors">{{ album.title }}</h2>
                                <p class="text-[#888] mt-2 tracking-widest text-sm">{{ formatAlbumMeta(album) }}</p>
                            </div>
                            <span class="text-red-300 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">查看专辑 →</span>
                        </div>
                    </RouterLink>
                </div>
            </div>
        </div>
    </main>
</template>