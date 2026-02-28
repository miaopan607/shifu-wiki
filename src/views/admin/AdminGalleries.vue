<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import type { AdminGallery } from '@/types/admin';

const router = useRouter();

const galleries = ref<AdminGallery[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const deleteConfirm = ref<string | null>(null);
const deleting = ref(false);
const togglingPublish = ref<string | null>(null);

const filteredGalleries = computed(() => {
    if (!searchQuery.value.trim()) return galleries.value;
    const query = searchQuery.value.toLowerCase();
    return galleries.value.filter(g => 
        g.title.toLowerCase().includes(query) ||
        (g.slug?.toLowerCase().includes(query)) ||
        (g.description?.toLowerCase().includes(query))
    );
});

const stats = computed(() => ({
    total: galleries.value.length,
    published: galleries.value.filter(g => g.published).length,
    draft: galleries.value.filter(g => !g.published).length,
}));

onMounted(async () => {
    await fetchGalleries();
});

const fetchGalleries = async () => {
    loading.value = true;
    try {
        const result = await pb.collection('galleries').getFullList({
            sort: '-date',
        });
        
        galleries.value = result as unknown as AdminGallery[];
        
        for (const gallery of galleries.value) {
            try {
                const count = await pb.collection('gallery_images').getList(1, 1, {
                    filter: `gallery = "${gallery.id}"`,
                });
                gallery.imageCount = count.totalItems;
            } catch {
                gallery.imageCount = 0;
            }
        }
    } catch (error) {
        console.error('Failed to fetch galleries:', error);
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

const togglePublish = async (gallery: AdminGallery) => {
    togglingPublish.value = gallery.id;
    try {
        await pb.collection('galleries').update(gallery.id, {
            published: !gallery.published,
        });
        gallery.published = !gallery.published;
    } catch (error) {
        console.error('Failed to toggle publish:', error);
        alert('操作失败，请重试');
    } finally {
        togglingPublish.value = null;
    }
};

const confirmDelete = (id: string) => {
    deleteConfirm.value = id;
};

const cancelDelete = () => {
    deleteConfirm.value = null;
};

const deleteGallery = async (gallery: AdminGallery) => {
    deleting.value = true;
    try {
        const images = await pb.collection('gallery_images').getFullList({
            filter: `gallery = "${gallery.id}"`,
        });
        
        for (const img of images) {
            await pb.collection('gallery_images').delete(img.id);
        }
        
        await pb.collection('galleries').delete(gallery.id);
        
        galleries.value = galleries.value.filter(g => g.id !== gallery.id);
        deleteConfirm.value = null;
    } catch (error) {
        console.error('Failed to delete gallery:', error);
        alert('删除失败，请重试');
    } finally {
        deleting.value = false;
    }
};

const createNew = () => {
    router.push('/admin/galleries/new');
};

const editGallery = (id: string) => {
    router.push(`/admin/galleries/${id}`);
};
</script>

<template>
    <div class="relative min-h-[calc(100vh-3.5rem)]">
        <div v-if="loading" class="absolute inset-0 z-20 flex items-center justify-center bg-[rgb(77,0,0)]/60 backdrop-blur-sm">
            <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
        </div>

        <div v-if="loading" class="relative z-30">
            <h1 class="text-2xl font-semibold text-[#c9c9c9]">图集管理</h1>
            <p class="text-[#888] mt-1">管理所有图集和图片</p>
        </div>

        <div v-else class="space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-semibold text-[#c9c9c9]">图集管理</h1>
                    <p class="text-[#888] mt-1">管理所有图集和图片</p>
                </div>
                <button
                    @click="createNew"
                    class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    新建图集
                </button>
            </div>

            <div class="grid grid-cols-3 gap-4">
                <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4">
                    <p class="text-[#888] text-sm">总计</p>
                    <p class="text-2xl font-semibold text-[#c9c9c9] mt-1">{{ stats.total }}</p>
                </div>
                <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4">
                    <p class="text-[#888] text-sm">已发布</p>
                    <p class="text-2xl font-semibold text-green-400 mt-1">{{ stats.published }}</p>
                </div>
                <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4">
                    <p class="text-[#888] text-sm">草稿</p>
                    <p class="text-2xl font-semibold text-yellow-400 mt-1">{{ stats.draft }}</p>
                </div>
            </div>

            <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="搜索图集..."
                    class="w-full pl-10 pr-4 py-2.5 bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
                />
            </div>

            <div v-if="filteredGalleries.length === 0" class="text-center py-20">
                <svg class="w-16 h-16 mx-auto text-[#888] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <p class="text-[#888]">{{ searchQuery ? '没有找到匹配的图集' : '暂无图集，点击上方按钮创建' }}</p>
            </div>

            <div v-else class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 overflow-hidden">
                <table class="w-full">
                    <thead class="bg-white/5">
                        <tr>
                            <th class="px-4 py-3 text-left text-sm font-medium text-[#888]">标题</th>
                            <th class="px-4 py-3 text-left text-sm font-medium text-[#888] hidden sm:table-cell">日期</th>
                            <th class="px-4 py-3 text-center text-sm font-medium text-[#888]">图片数</th>
                            <th class="px-4 py-3 text-center text-sm font-medium text-[#888]">状态</th>
                            <th class="px-4 py-3 text-right text-sm font-medium text-[#888]">操作</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#c9c9c9]/10">
                        <tr v-for="gallery in filteredGalleries" :key="gallery.id" class="hover:bg-white/5 transition-colors">
                            <td class="px-4 py-3">
                                <div>
                                    <p class="font-medium text-[#c9c9c9]">{{ gallery.title }}</p>
                                    <p v-if="gallery.slug" class="text-sm text-[#888]">{{ gallery.slug }}</p>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-[#888] hidden sm:table-cell">
                                {{ formatDate(gallery.date) }}
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="inline-flex items-center gap-1 text-[#c9c9c9]">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    {{ gallery.imageCount ?? 0 }}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <div class="flex items-center justify-center">
                                    <button
                                        @click="togglePublish(gallery)"
                                        :disabled="togglingPublish === gallery.id"
                                        :class="[
                                            'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                                            gallery.published ? 'bg-red-700' : 'bg-[#c9c9c9]/20',
                                            togglingPublish === gallery.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                                        ]"
                                    >
                                        <span
                                            :class="[
                                                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                                gallery.published ? 'translate-x-5' : 'translate-x-0'
                                            ]"
                                        />
                                    </button>
                                </div>
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex items-center justify-end gap-2">
                                    <button
                                        @click="editGallery(gallery.id)"
                                        class="p-2 text-[#888] hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                                        title="编辑"
                                    >
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                        </svg>
                                    </button>
                                    <button
                                        @click="confirmDelete(gallery.id)"
                                        class="p-2 text-[#888] hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                                        title="删除"
                                    >
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <Teleport to="body">
                <div v-if="deleteConfirm" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="cancelDelete">
                    <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-6 max-w-md w-full">
                        <h3 class="text-lg font-semibold text-[#c9c9c9] mb-2">确认删除</h3>
                        <p class="text-[#888] mb-6">
                            确定要删除这个图集吗？此操作将同时删除图集中的所有图片，且无法恢复。
                        </p>
                        <div class="flex justify-end gap-3">
                            <button
                                @click="cancelDelete"
                                class="px-4 py-2 text-[#c9c9c9] hover:text-[#e0e0e0] hover:bg-white/5 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                @click="deleteGallery(galleries.find(g => g.id === deleteConfirm)!)"
                                :disabled="deleting"
                                class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 disabled:bg-red-500/10 text-red-300 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <svg v-if="deleting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                {{ deleting ? '删除中...' : '确认删除' }}
                            </button>
                        </div>
                    </div>
                </div>
            </Teleport>
        </div>
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
