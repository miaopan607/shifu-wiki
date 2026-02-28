<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import type { Activity } from '@/types';

const router = useRouter();

const activities = ref<Activity[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const deleteConfirm = ref<string | null>(null);
const deleting = ref(false);

const filteredActivities = computed(() => {
    if (!searchQuery.value.trim()) return activities.value;
    const query = searchQuery.value.toLowerCase();
    return activities.value.filter(a => 
        a.title.toLowerCase().includes(query) ||
        (a.location?.toLowerCase().includes(query)) ||
        (a.tags?.some(tag => tag.toLowerCase().includes(query)))
    );
});

const stats = computed(() => ({
    total: activities.value.length,
}));

onMounted(async () => {
    await fetchActivities();
});

const fetchActivities = async () => {
    loading.value = true;
    try {
        const result = await pb.collection('activities').getFullList({
            sort: '-date',
        });
        activities.value = result as unknown as Activity[];
    } catch (error) {
        console.error('Failed to fetch activities:', error);
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

const deleteActivity = async (activity: Activity) => {
    deleting.value = true;
    try {
        await pb.collection('activities').delete(activity.id);
        activities.value = activities.value.filter(a => a.id !== activity.id);
        deleteConfirm.value = null;
    } catch (error) {
        console.error('Failed to delete activity:', error);
        alert('删除失败，请重试');
    } finally {
        deleting.value = false;
    }
};

const createNew = () => {
    router.push('/admin/activities/new');
};

const editActivity = (id: string) => {
    router.push(`/admin/activities/${id}`);
};
</script>

<template>
    <div class="relative min-h-[400px]">
        <div v-if="loading" class="absolute inset-0 z-20 flex items-center justify-center bg-[rgb(77,0,0)]/90 backdrop-blur-sm">
            <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
        </div>

        <div v-if="loading" class="relative z-30">
            <h1 class="text-2xl font-semibold text-[#c9c9c9]">活动管理</h1>
            <p class="text-[#888] mt-1">管理所有线下活动、演出等</p>
        </div>

        <div v-else class="space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-semibold text-[#c9c9c9]">活动管理</h1>
                    <p class="text-[#888] mt-1">管理所有线下活动、演出等</p>
                </div>
                <button
                    @click="createNew"
                    class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    新建活动
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
                    placeholder="搜索活动标题、地点或标签..."
                    class="w-full pl-10 pr-4 py-2.5 bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
                />
            </div>

            <div v-if="filteredActivities.length === 0" class="text-center py-20">
                <p class="text-[#888]">{{ searchQuery ? '没有找到匹配的活动' : '暂无活动，点击上方按钮创建' }}</p>
            </div>

            <div v-else class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-white/5">
                        <tr>
                            <th class="px-4 py-3 text-sm font-medium text-[#888]">标题</th>
                            <th class="px-4 py-3 text-sm font-medium text-[#888]">地点</th>
                            <th class="px-4 py-3 text-sm font-medium text-[#888]">日期</th>
                            <th class="px-4 py-3 text-right text-sm font-medium text-[#888]">操作</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#c9c9c9]/10">
                        <tr v-for="activity in filteredActivities" :key="activity.id" class="hover:bg-white/5 transition-colors">
                            <td class="px-4 py-3">
                                <p class="font-medium text-[#c9c9c9]">{{ activity.title }}</p>
                                <div class="flex gap-1 mt-1">
                                    <span v-for="tag in activity.tags" :key="tag" class="text-[10px] px-1.5 py-0.5 bg-red-300/10 text-red-300 rounded">
                                        {{ tag }}
                                    </span>
                                </div>
                            </td>
                            <td class="px-4 py-3">
                                <p class="text-sm text-[#888]">{{ activity.location || '-' }}</p>
                            </td>
                            <td class="px-4 py-3 text-sm text-[#888]">
                                {{ formatDate(activity.date) }}
                            </td>
                            <td class="px-4 py-3 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button
                                        @click="editActivity(activity.id)"
                                        class="p-1.5 text-[#888] hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                                        title="编辑"
                                    >
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                        </svg>
                                    </button>
                                    <button
                                        @click="confirmDelete(activity.id)"
                                        class="p-1.5 text-[#888] hover:text-red-500 hover:bg-white/10 rounded-lg transition-colors"
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

            <!-- 删除确认模态框 -->
            <div v-if="deleteConfirm" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl max-w-sm w-full p-6 shadow-2xl">
                    <h3 class="text-xl font-semibold text-[#c9c9c9] mb-2">确认删除</h3>
                    <p class="text-[#888] mb-6">确定要删除这个活动吗？此操作不可撤销。</p>
                    <div class="flex justify-end gap-3">
                        <button
                            @click="cancelDelete"
                            class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
                            :disabled="deleting"
                        >
                            取消
                        </button>
                        <button
                            @click="deleteActivity(activities.find(a => a.id === deleteConfirm)!)"
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
