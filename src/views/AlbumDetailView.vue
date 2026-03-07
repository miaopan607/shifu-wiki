<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { pb, formatDateToDisplay } from '@/lib/pocketbase';
import { marked } from 'marked';
import MetaIcon from '@/components/MetaIcon.vue';

const route = useRoute();
const albumTitle = decodeURIComponent(route.params.title as string);
const songs = ref<any[]>([]);
const albumInfo = ref<any>(null);
const loading = ref(true);

const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
};

// 元数据项配置
interface MetaItem {
	label?: string;
	value: string;
	icon?: string;
}

const metaItems = computed<MetaItem[]>(() => {
	const items: MetaItem[] = [];
	if (songs.value.length > 0) items.push({ value: `${songs.value.length} 曲音乐`, icon: 'music' });
	if (albumInfo.value?.releaseDate) items.push({ value: formatDateToDisplay(albumInfo.value.releaseDate), icon: 'date' });
	return items;
});

onMounted(async () => {
    try {
        const [songsResult, albumResult] = await Promise.all([
            pb.collection('songs').getList(1, 50, {
                filter: `album = "${albumTitle}"`,
                sort: '+releaseDate',
                fields: 'id,title,index,artist',
            }),
            pb.collection('albums').getFirstListItem(`title="${albumTitle}"`).catch(() => null)
        ]); 
        
        songs.value = songsResult.items;
        albumInfo.value = albumResult;
        document.title = `${albumTitle} | 专辑详情 | 黄诗扶 Wiki`;
    } catch (error) {
        console.error('Failed to fetch album data:', error);
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif">
        <div class="max-w-2xl mx-auto">
            <header class="mb-16">
                <RouterLink to="/albums" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回列表</RouterLink>
            </header>

            <div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

            <div v-else class="relative">
                <div class="w-full">
                    <div class="mb-12 border-b border-[#c9c9c9]/20 pb-8">
                        <h1 class="text-4xl md:text-5xl text-[#c9c9c9] mb-4 tracking-widest">{{ albumTitle }}</h1>
                        <div class="flex items-center gap-4 text-[#888] tracking-widest text-sm">
                            <template v-for="(item, index) in metaItems" :key="index">
                                <div class="flex items-center gap-1.5">
                                    <MetaIcon :name="item.icon as any" />
                                    <span>{{ item.value }}</span>
                                </div>
                                <span v-if="index < metaItems.length - 1">·</span>
                            </template>
                        </div>
                        
                        <div v-if="albumInfo?.description" class="mt-8 prose prose-invert max-w-none text-[#c9c9c9]/80 leading-relaxed tracking-wider">
                            <div v-html="renderMarkdown(albumInfo.description)"></div>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <RouterLink 
                            v-for="(song, index) in songs" 
                            :key="song.id" 
                            :to="`/songs/${song.index}?from=album&albumTitle=${encodeURIComponent(albumTitle)}`"
                            class="block group p-4 -mx-4 hover:bg-[#c9c9c9]/5 rounded-lg transition-colors border border-transparent hover:border-[#c9c9c9]/10"
                        >
                            <div class="flex items-center gap-6">
                                <span class="text-[#888] font-mono opacity-50 w-8 text-right">{{ String(index + 1).padStart(2, '0') }}</span>
                                <div class="flex-1">
                                    <h3 class="text-xl text-[#c9c9c9] group-hover:text-red-300 transition-colors tracking-wide">{{ song.title }}</h3>
                                    <div class="flex gap-4 mt-1 text-xs text-[#888] tracking-wider opacity-0 group-hover:opacity-70 transition-opacity">
                                        <span>{{ song.artist || '黄诗扶' }}</span>
                                    </div>
                                </div>
                                <span class="text-red-300 opacity-0 group-hover:opacity-100 transition-all text-sm tracking-widest translate-x-2 group-hover:translate-x-0">详情 →</span>
                            </div>
                        </RouterLink>
                    </div>
                </div>

                <!-- 右侧边栏 -->
                <aside v-if="albumInfo" class="w-full lg:w-56 shrink-0 mt-12 lg:mt-0 lg:absolute lg:left-[calc(100%+4rem)] lg:top-0">
                    <hr class="border-[#c9c9c9]/30 mb-5" />
                    <template v-if="albumInfo.links && Array.isArray(albumInfo.links) && albumInfo.links.length > 0">
                        <div class="flex flex-col gap-4 px-2">
                            <a
                                v-for="link in albumInfo.links"
                                :key="link.url"
                                :href="link.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-[#c9c9c9]/80 hover:text-red-300 transition-all duration-300 text-sm tracking-[0.2em] flex items-start group whitespace-pre-line"
                            >
                                <span class="mr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">→</span>
                                {{ link.name }}
                            </a>
                        </div>
                        <hr class="border-[#c9c9c9]/30 mt-5 mb-5" />
                    </template>

                    <template v-if="albumInfo.otherLinks && Array.isArray(albumInfo.otherLinks) && albumInfo.otherLinks.length > 0">
                        <div class="flex flex-col gap-4 px-2">
                            <a
                                v-for="link in albumInfo.otherLinks"
                                :key="link.url"
                                :href="link.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-[#c9c9c9]/80 hover:text-red-300 transition-all duration-300 text-sm tracking-[0.2em] flex items-start group whitespace-pre-line"
                            >
                                <span class="mr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">→</span>
                                {{ link.name }}
                            </a>
                        </div>
                        <hr class="border-[#c9c9c9]/30 mt-5" />
                    </template>
                </aside>
            </div>
        </div>
    </main>
</template>