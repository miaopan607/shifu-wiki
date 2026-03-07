<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import MetaIcon from '@/components/MetaIcon.vue';
import type { Album } from '@/types';

const router = useRouter();

const albums = ref<Album[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const deleteConfirm = ref<string | null>(null);
const deleting = ref(false);

const filteredAlbums = computed(() => {
    if (!searchQuery.value.trim()) return albums.value;
    const query = searchQuery.value.toLowerCase();
    return albums.value.filter(a => 
        a.title.toLowerCase().includes(query) ||
        (a.description?.toLowerCase().includes(query))
    );
});

const stats = computed(() => ({
    total: albums.value.length,
}));

onMounted(async () => {
    await fetchAlbums();
});

const fetchAlbums = async () => {
    loading.value = true;
    try {
        const result = await pb.collection('albums').getFullList({
            sort: '-releaseDate',
        });
        albums.value = result as unknown as Album[];
    } catch (error) {
        console.error('Failed to fetch albums:', error);
    } finally {
        loading.value = false;
    }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const confirmDelete = (id: string) => {
    deleteConfirm.value = id;
};

const cancelDelete = () => {
    deleteConfirm.value = null;
};

const deleteAlbum = async (album: Album) => {
    deleting.value = true;
    try {
        await pb.collection('albums').delete(album.id);
        albums.value = albums.value.filter(a => a.id !== album.id);
        deleteConfirm.value = null;
    } catch (error) {
        console.error('Failed to delete album:', error);
        alert('删除失败，请重试');
    } finally {
        deleting.value = false;
    }
};

const createNew = () => {
    router.push('/admin/albums/new');
};

const editAlbum = (id: string) => {
    router.push(`/admin/albums/${id}`);
};

const getImageUrl = (record: any, filename: string) => {
    if (!filename) return '';
    return pb.files.getURL(record, filename, { thumb: '400x400' });
};
</script>

<template>
    <div class="relative min-h-100">
        <div v-if="loading" class="absolute inset-0 z-20 flex items-center justify-center bg-[rgb(77,0,0)]/90 backdrop-blur-sm">
            <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
        </div>

        <div v-if="loading" class="relative z-30 space-y-6">
            <h1 class="text-2xl font-semibold text-[#c9c9c9]">专辑管理</h1>
        </div>

        <div v-else class="relative space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-semibold text-[#c9c9c9]">专辑管理</h1>
                </div>
                <button
                    @click="createNew"
                    class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    新建专辑
                </button>
            </div>

            <div class="grid grid-cols-1 gap-4">
                <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4">
                    <p class="text-[#888] text-sm">总计</p>
                    <p class="text-2xl font-semibold text-[#c9c9c9] mt-1">{{ stats.total }}</p>
                </div>
            </div>

            <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="搜索专辑标题"
                    class="w-full pl-10 pr-4 py-2.5 bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
                />
            </div>

            <div v-if="filteredAlbums.length === 0" class="text-center py-20">
                <p class="text-[#888]">{{ searchQuery ? '没有找到匹配的专辑' : '暂无专辑，点击上方按钮创建' }}</p>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                <div v-for="album in filteredAlbums" :key="album.id"
                    class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl overflow-hidden group">
                    <div class="aspect-square relative overflow-hidden bg-black/40">
                        <img
                            v-if="album.cover"
                            :src="getImageUrl(album, album.cover)"
                            :alt="album.title"
                            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div v-else class="w-full h-full flex items-center justify-center text-[#c9c9c9]/20">
                            <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                            </svg>
                        </div>

                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button
                                @click="editAlbum(album.id)"
                                class="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                title="编辑"
                            >
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button
                                @click="confirmDelete(album.id)"
                                class="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-300 transition-colors"
                                title="删除"
                            >
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="p-4 space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <h3 class="font-medium text-[#c9c9c9] truncate" :title="album.title">{{ album.title }}</h3>
                        </div>
                        <div class="flex items-center gap-1 text-xs text-[#888]">
                            <MetaIcon name="date" />
                            <span>{{ formatDate(album.releaseDate) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 删除确认模态框 -->
            <div v-if="deleteConfirm" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl max-w-sm w-full p-6 shadow-2xl">
                    <h3 class="text-xl font-semibold text-[#c9c9c9] mb-2">确认删除</h3>
                    <p class="text-[#888] mb-6">确定要删除这个专辑吗？此操作不可撤销。</p>
                    <div class="flex justify-end gap-3">
                        <button
                            @click="cancelDelete"
                            class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
                            :disabled="deleting"
                        >
                            取消
                        </button>
                        <button
                            @click="deleteAlbum(albums.find(a => a.id === deleteConfirm)!)"
                            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                            :disabled="deleting"
                        >
                            <span v-if="deleting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            确认删除
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes spin {
    to { transform: rotate(360deg); }
}
.animate-spin {
    animation: spin 1s linear infinite;
}
</style>
