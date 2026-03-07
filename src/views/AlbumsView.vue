<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import SubPageNav from '@/components/SubPageNav.vue';
import SongsNav from '@/components/SongsNav.vue';
import MetaIcon from '@/components/MetaIcon.vue';

const albums = ref<any[]>([]);
const loading = ref(true);

// 格式化专辑元数据
interface MetaPart {
    type: 'music' | 'date';
    value: string;
}

const getAlbumMetaParts = (album: any): MetaPart[] => {
    const parts: MetaPart[] = [];
    if (album.songCount !== undefined) parts.push({ type: 'music', value: `${album.songCount} 曲音乐` });
    if (album.releaseDate) parts.push({ type: 'date', value: album.releaseDate });
    return parts;
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
                                <div class="flex items-center gap-3 mt-2 tracking-widest text-sm text-[#888]">
                                    <template v-for="(part, index) in getAlbumMetaParts(album)" :key="index">
                                        <div class="flex items-center gap-1">
                                            <MetaIcon :name="part.type" />
                                            <span>{{ part.value }}</span>
                                        </div>
                                        <span v-if="index < getAlbumMetaParts(album).length - 1">·</span>
                                    </template>
                                </div>
                            </div>
                            <span class="text-red-300 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">查看专辑 →</span>
                        </div>
                    </RouterLink>
                </div>
            </div>
        </div>
    </main>
</template>