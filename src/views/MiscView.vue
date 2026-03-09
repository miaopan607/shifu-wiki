<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { RouterLink } from 'vue-router';
  import { pb, formatDateToDisplay } from '@/lib/pocketbase';
  import SubPageNav from '@/components/SubPageNav.vue';
  import AppIcon from '@/components/AppIcon.vue';
  import type { Misc } from '@/types';

  const miscItems = ref<Misc[]>([]);
  const loading = ref(true);

  onMounted(async () => {
    try {
      const records = await pb.collection('misc').getFullList({
        sort: '-created',
        filter: 'published = true',
        fields: 'id,title,slug,created,description',
      });
      miscItems.value = records as unknown as Misc[];
    } catch (e) {
      console.warn('Failed to fetch misc items:', e);
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif text-[#c9c9c9]">
    <div class="max-w-2xl mx-auto">
      <header class="mb-12">
        <RouterLink to="/" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回首页</RouterLink>
        <SubPageNav active-page="misc" />
      </header>

      <div v-if="loading" class="text-center py-20 opacity-40 italic tracking-widest">加载中...</div>

      <div v-else class="space-y-8">
        <template v-if="miscItems.length > 0">
          <RouterLink
            v-for="item in miscItems"
            :key="item.id"
            :to="`/misc/${item.slug || item.id}`"
            class="group block border-b border-[#c9c9c9]/20 pb-8 hover:border-red-300/50 transition-all"
          >
            <div class="flex justify-between items-end">
              <div class="flex-1 pr-8">
                <h2 class="text-2xl group-hover:text-red-300 transition-colors mb-2">{{ item.title }}</h2>
                <div class="flex items-center gap-1 text-[#888] text-sm tracking-widest mb-3">
                  <AppIcon name="date" />
                  <span>{{ formatDateToDisplay(item.created) }}</span>
                </div>
                <p v-if="item.description" class="text-[#c9c9c9]/70 line-clamp-2 text-base">{{ item.description }}</p>
              </div>
              <span
                class="text-red-300 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 shrink-0"
                >阅读 →</span
              >
            </div>
          </RouterLink>
        </template>
        <p v-else class="text-center py-20 opacity-40 italic tracking-widest">暂无条目</p>
      </div>
    </div>
  </main>
</template>
