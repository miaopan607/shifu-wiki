<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useRoute, useRouter, RouterLink } from 'vue-router';
  import { pb, formatDateToDisplay } from '@/lib/pocketbase';
  import { marked } from 'marked';
  import AppIcon from '@/components/AppIcon.vue';
  import type { Misc } from '@/types';

  const route = useRoute();
  const router = useRouter();
  const miscItem = ref<Misc | null>(null);
  const loading = ref(true);
  const contentHtml = ref('');

  onMounted(async () => {
    const indexOrId = route.params.index as string;
    if (!indexOrId) {
      router.replace('/404');
      return;
    }

    try {
      let record: any = null;

      try {
        record = await pb.collection('misc').getFirstListItem(`index=${indexOrId}`);
      } catch {
        try {
          record = await pb.collection('misc').getOne(indexOrId);
        } catch {
          console.warn('Misc item not found by index or ID');
        }
      }

      if (record) {
        miscItem.value = record as unknown as Misc;
        document.title = `${record.title} | 黄诗扶 Wiki`;

        // Parse Markdown content
        if (record.content) {
          contentHtml.value = await marked(record.content);
        }
      }
    } catch (error) {
      console.error('Failed to fetch misc item:', error);
      // Do not redirect to 404 immediately, show error state or empty state
      // router.replace('/404');
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif text-[#e0e0e0]">
    <div v-if="loading" class="flex items-center justify-center italic h-[60vh]">加载中...</div>

    <div v-else-if="!miscItem" class="flex flex-col items-center justify-center h-[60vh] text-[#c9c9c9]">
      <h2 class="text-3xl mb-4">文章未找到</h2>
      <RouterLink to="/misc" class="text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回列表</RouterLink>
    </div>

    <div v-else class="max-w-2xl mx-auto relative transition-opacity duration-300">
      <nav class="mb-12">
        <RouterLink to="/misc" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors"
          >← 返回列表</RouterLink
        >
      </nav>

      <article class="w-full">
        <header class="mb-8">
          <h1
            class="text-4xl md:text-5xl text-[#c9c9c9] tracking-widest drop-shadow-[0_0_10px_rgba(201,201,201,0.3)] mb-4"
          >
            {{ miscItem.title }}
          </h1>
          <div class="flex items-center gap-4 text-[#888] text-sm tracking-widest">
            <div class="flex items-center gap-1.5">
              <AppIcon name="date" />
              <span>{{ formatDateToDisplay(miscItem.created) }}</span>
            </div>
          </div>
        </header>

        <hr class="border-[#c9c9c9]/30 mb-8" />

        <div
          class="prose prose-invert mx-auto content-container text-lg leading-relaxed text-[#c9c9c9]"
          v-html="contentHtml"
        ></div>
      </article>
    </div>
  </main>
</template>

<style>
  /* Markdown styles override */
  .prose h1,
  .prose h2,
  .prose h3,
  .prose h4 {
    color: #e0e0e0;
    margin-top: 2em;
    margin-bottom: 1em;
  }
  .prose p {
    margin-bottom: 1.5em;
    line-height: 1.8;
  }

  .prose blockquote {
    border-left-color: #fca5a5;
    background: rgba(255, 255, 255, 0.05);
    padding: 1em;
    font-style: italic;
  }
  .prose ul,
  .prose ol {
    color: #c9c9c9;
  }
  .prose code {
    color: #fca5a5;
    background: rgba(0, 0, 0, 0.3);
    padding: 0.2em 0.4em;
    border-radius: 4px;
  }
  .prose img {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
</style>
