<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import type { Gallery, GalleryImage } from '@/types';

const route = useRoute();
const slugOrId = route.params.slug as string;
const gallery = ref<Gallery | null>(null);
const images = ref<GalleryImage[]>([]);
const loading = ref(true);

const getImageUrl = (record: GalleryImage, filename: string) => {
    return pb.files.getUrl(record, filename);
};

const getThumbnailUrl = (record: GalleryImage, filename: string) => {
    return pb.files.getUrl(record, filename, { thumb: '0x1080' });
};

onMounted(async () => {
    try {
        // Fetch gallery details
        try {
             gallery.value = await pb.collection('galleries').getFirstListItem(`slug="${slugOrId}"`);
        } catch (e) {
             // If fetching by slug fails, try by ID
             try {
                gallery.value = await pb.collection('galleries').getOne(slugOrId);
             } catch (e2) {
                console.warn('Gallery not found by slug or ID');
             }
        }

        if (gallery.value) {
            document.title = `${gallery.value.title} | 图集 | 黄诗扶 Wiki`;
            
            // Fetch images
            const result = await pb.collection('gallery_images').getList(1, 100, {
                filter: `gallery = "${gallery.value.id}"`,
                sort: 'sort',
            });
            images.value = result.items as unknown as GalleryImage[];
        }
    } catch (error) {
        console.error('Failed to fetch gallery data:', error);
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif">
        <div class="max-w-4xl mx-auto">
            <header class="mb-12">
                <RouterLink to="/galleries" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors mb-8 inline-block">← 返回图集列表</RouterLink>
                
                <div v-if="gallery">
                    <h1 class="text-4xl md:text-5xl text-[#c9c9c9] mb-6 tracking-widest">{{ gallery.title }}</h1>
                    <div v-if="gallery.description" class="text-[#c9c9c9]/80 text-lg leading-relaxed tracking-wider whitespace-pre-wrap">{{ gallery.description }}</div>
                </div>
            </header>

            <div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">加载中...</div>

            <div v-else>
                <div v-if="!gallery" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">未找到图集</div>
                <div v-else-if="images.length === 0" class="text-center py-20 opacity-40 italic tracking-widest text-[#c9c9c9]">该图集暂无图片</div>
                
                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div v-for="img in images" :key="img.id" class="group relative aspect-[3/4] overflow-hidden rounded-lg bg-black/20">
                        <img 
                            :src="getThumbnailUrl(img, img.image)" 
                            :alt="gallery?.title"
                            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                        />
                        <!-- Overlay for viewing full image hint -->
                        <a :href="getImageUrl(img, img.image)" target="_blank" class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300">
                             <div class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                查看原图
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
