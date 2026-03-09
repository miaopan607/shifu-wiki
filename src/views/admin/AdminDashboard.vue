<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import AppIcon from '@/components/AppIcon.vue';

type DashboardKey = 'songs' | 'albums' | 'activities' | 'galleries' | 'misc';

type CollectionConfig = {
    key: DashboardKey;
    collection: string;
    label: string;
    shortLabel: string;
    managePath: string;
    newPath: string;
};

const collections: CollectionConfig[] = [
    {
        key: 'songs',
        collection: 'songs',
        label: '音乐',
        shortLabel: '音乐',
        managePath: '/admin/songs',
        newPath: '/admin/songs/new',
    },
    {
        key: 'albums',
        collection: 'albums',
        label: '专辑',
        shortLabel: '专辑',
        managePath: '/admin/albums',
        newPath: '/admin/albums/new',
    },
    {
        key: 'activities',
        collection: 'activities',
        label: '活动',
        shortLabel: '活动',
        managePath: '/admin/activities',
        newPath: '/admin/activities/new',
    },
    {
        key: 'galleries',
        collection: 'galleries',
        label: '图集',
        shortLabel: '图集',
        managePath: '/admin/galleries',
        newPath: '/admin/galleries/new',
    },
    {
        key: 'misc',
        collection: 'misc',
        label: '杂记',
        shortLabel: '杂记',
        managePath: '/admin/misc',
        newPath: '/admin/misc/new',
    },
];

const loading = ref(true);
const refreshing = ref(false);
const lastUpdated = ref('');

const stats = ref<Record<DashboardKey, number | null>>({
    songs: null,
    albums: null,
    activities: null,
    galleries: null,
    misc: null,
});

const statsErrors = ref<string[]>([]);

const totalContentCount = computed(() =>
    Object.values(stats.value).reduce<number>((sum, count) => sum + (count ?? 0), 0),
);

const hasAnyStats = computed(() => Object.values(stats.value).some((count) => count !== null));

const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
        refreshing.value = true;
    } else {
        loading.value = true;
    }

    try {
        const results = await Promise.all(
            collections.map(async (config) => {
                try {
                    const list = await pb.collection(config.collection).getList(1, 1);
                    return {
                        key: config.key,
                        count: list.totalItems,
                    };
                } catch {
                    return {
                        key: config.key,
                        count: null,
                        error: `${config.label}统计加载失败`,
                    };
                }
            }),
        );

        const nextStats: Record<DashboardKey, number | null> = {
            songs: null,
            albums: null,
            activities: null,
            galleries: null,
            misc: null,
        };

        const nextStatsErrors: string[] = [];

        for (const result of results) {
            nextStats[result.key] = result.count;
            if (result.error) nextStatsErrors.push(result.error);
        }

        stats.value = nextStats;
        statsErrors.value = nextStatsErrors;
        lastUpdated.value = new Date().toISOString();
    } finally {
        loading.value = false;
        refreshing.value = false;
    }
};

const handleRefresh = async () => {
    if (loading.value || refreshing.value) return;
    await fetchDashboardData(true);
};

onMounted(async () => {
    await fetchDashboardData();
});
</script>

<template>
    <div class="relative min-h-100">
        <div
            v-if="loading"
            class="absolute inset-0 z-20 flex items-center justify-center bg-[rgb(77,0,0)]/90 backdrop-blur-sm"
        >
            <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
        </div>

        <div v-if="loading" class="relative z-30 space-y-6">
            <section>
                <h1 class="text-2xl font-semibold text-[#c9c9c9]">仪表盘</h1>
            </section>
        </div>

        <div v-else class="relative space-y-6">
            <section>
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 class="text-2xl font-semibold text-[#c9c9c9]">仪表盘</h1>
                        <p class="text-xs text-[#777] mt-2" v-if="lastUpdated">
                            最近刷新：{{ formatDateTime(lastUpdated) }}
                        </p>
                    </div>

                    <button
                        @click="handleRefresh"
                        :disabled="loading || refreshing"
                        class="inline-flex items-center gap-2 px-3 py-2 border border-[#c9c9c9]/25 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AppIcon name="refresh" :class-name="refreshing ? 'w-4 h-4 animate-spin' : 'w-4 h-4'" />
                        刷新
                    </button>
                </div>
            </section>

            <section class="space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-[#c9c9c9]">概览</h2>
                    <p class="text-sm text-[#888]">总内容量：{{ totalContentCount }}</p>
                </div>

                <p v-if="statsErrors.length" class="text-sm text-red-300">
                    {{ statsErrors.join('；') }}
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div
                        v-for="item in collections"
                        :key="`kpi-${item.key}`"
                        class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4"
                    >
                        <p class="text-[#888] text-sm">{{ item.label }}</p>
                        <p class="text-2xl font-semibold text-[#c9c9c9] mt-1">
                            {{ stats[item.key] ?? '—' }}
                        </p>
                    </div>
                </div>

                <div
                    v-if="!hasAnyStats && !statsErrors.length"
                    class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-6 text-center text-[#888]"
                >
                    暂无统计数据，可先通过上方入口创建内容。
                </div>
            </section>

            <section class="space-y-3">
                <h2 class="text-lg font-semibold text-[#c9c9c9]">快捷管理</h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div
                        v-for="item in collections"
                        :key="`quick-${item.key}`"
                        class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4"
                    >
                        <p class="text-[#c9c9c9] font-medium">{{ item.label }}管理</p>
                        <div class="mt-3 flex flex-wrap gap-2">
                            <RouterLink
                                :to="item.managePath"
                                class="inline-flex items-center px-3 py-1.5 text-sm text-[#c9c9c9] border border-[#c9c9c9]/25 hover:bg-white/5 hover:text-red-300 rounded-lg transition-colors"
                            >
                                管理入口
                            </RouterLink>
                            <RouterLink
                                :to="item.newPath"
                                class="inline-flex items-center px-3 py-1.5 text-sm text-red-300 border border-red-300/50 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                新建{{ item.shortLabel }}
                            </RouterLink>
                        </div>
                    </div>
                </div>
            </section>
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
