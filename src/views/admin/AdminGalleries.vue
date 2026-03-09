<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import AppIcon from '@/components/AppIcon.vue';
import type { AdminGallery } from '@/types/admin';

const router = useRouter();

const galleries = ref<AdminGallery[]>([]);
const loading = ref(true);
const refreshing = ref(false);
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

const fetchGalleries = async (isManualRefresh = false) => {
    if (isManualRefresh) {
        refreshing.value = true;
    } else {
        loading.value = true;
    }
    try {
        const result = await pb.collection('galleries').getFullList({
            sort: '-date',
            fields: 'id,title,slug,date,description,published',
        });

        galleries.value = result as unknown as AdminGallery[];

        if (galleries.value.length > 0) {
            const galleryIds = galleries.value.map(g => `gallery = "${g.id}"`).join(' || ');
            const imagesResult = await pb.collection('gallery_images').getFullList({
                filter: galleryIds,
                fields: 'gallery',
            });

            const countByGallery = new Map<string, number>();
            for (const img of imagesResult) {
                const galleryId = (img as unknown as { gallery: string }).gallery;
                countByGallery.set(galleryId, (countByGallery.get(galleryId) || 0) + 1);
            }

            for (const gallery of galleries.value) {
                gallery.imageCount = countByGallery.get(gallery.id) || 0;
            }
        }
    } catch (error) {
        console.error('Failed to fetch galleries:', error);
    } finally {
        loading.value = false;
        refreshing.value = false;
    }
};

import { formatDateToDisplay } from '@/lib/pocketbase';

const formatDate = (dateStr: string) => {
    return formatDateToDisplay(dateStr);
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

        const deleteResults = await Promise.allSettled(
            images.map(img => pb.collection('gallery_images').delete(img.id))
        );
        const failedDeletes = deleteResults
            .map((result, index) => ({ result, imageId: images[index]?.id }))
            .filter(item => item.result.status === 'rejected');

        deleteResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.warn('Failed to delete gallery image:', images[index]?.id, result.reason);
            }
        });

        if (failedDeletes.length > 0) {
            throw new Error('部分图片删除失败');
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
    <div class="relative min-h-100">
        <div v-if="loading" class="absolute inset-0 z-20 flex items-center justify-center bg-[rgb(77,0,0)]/90 backdrop-blur-sm">
            <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
        </div>

        <div v-if="loading" class="relative z-30 space-y-6">
            <h1 class="text-2xl font-semibold text-[#c9c9c9]">图集管理</h1>
        </div>

        <div v-else class="relative space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-semibold text-[#c9c9c9]">图集管理</h1>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <button
                        @click="createNew"
                        class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors"
                    >
                        <AppIcon name="plus" class-name="w-5 h-5" />
                        新建图集
                    </button>
                    <button
                        @click="fetchGalleries(true)"
                        :disabled="refreshing"
                        class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AppIcon name="refresh" :class-name="refreshing ? 'w-5 h-5 animate-spin' : 'w-5 h-5'" />
                        {{ refreshing ? '刷新中...' : '刷新列表' }}
                    </button>
                </div>
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
                <AppIcon name="search" class-name="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888]" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="搜索图集"
                    class="w-full pl-10 pr-4 py-2.5 bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
                />
            </div>

            <div v-if="filteredGalleries.length === 0" class="text-center py-20">
                <AppIcon name="image-placeholder" class-name="w-16 h-16 mx-auto text-[#888] mb-4" />
                <p class="text-[#888]">{{ searchQuery ? '没有找到匹配的图集' : '暂无图集，点击上方按钮创建' }}</p>
            </div>

            <div v-else class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 overflow-hidden">
                <table class="w-full">
                    <thead class="bg-white/5">
                        <tr>
                            <th class="px-4 py-3 text-left text-sm font-medium text-[#888]">
                                <div class="flex items-center gap-1.5">
                                    <AppIcon name="image" class-name="w-4 h-4 opacity-60" />
                                    标题
                                </div>
                            </th>
                            <th class="px-4 py-3 text-left text-sm font-medium text-[#888] hidden sm:table-cell">
                                <div class="flex items-center gap-1.5">
                                    <AppIcon name="date" class-name="w-4 h-4 opacity-60" />
                                    日期
                                </div>
                            </th>
                            <th class="px-4 py-3 text-center text-sm font-medium text-[#888]">
                                <div class="flex items-center justify-center gap-1.5">
                                    <AppIcon name="image" class-name="w-4 h-4 opacity-60" />
                                    图片数
                                </div>
                            </th>
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
                            <td class="px-4 py-3 hidden sm:table-cell">
                                <div class="flex items-center gap-1 text-[#888]">
                                    <AppIcon name="date" />
                                    <span>{{ formatDate(gallery.date) }}</span>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="inline-flex items-center gap-1 text-[#c9c9c9]">
                                    <AppIcon name="image" />
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
                                        <AppIcon name="edit" class-name="w-5 h-5" />
                                    </button>
                                    <button
                                        @click="confirmDelete(gallery.id)"
                                        class="p-2 text-[#888] hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                                        title="删除"
                                    >
                                        <AppIcon name="trash" class-name="w-5 h-5" />
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
                                <AppIcon name="refresh" class-name="w-4 h-4 animate-spin" />
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
