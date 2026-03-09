<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { pb } from '@/lib/pocketbase';
  import AppIcon from '@/components/AppIcon.vue';
  import type { Misc } from '@/types';

  const router = useRouter();

  const miscItems = ref<Misc[]>([]);
  const loading = ref(true);
  const refreshing = ref(false);
  const searchQuery = ref('');
  const deleteConfirm = ref<string | null>(null);
  const deleting = ref(false);
  const togglingPublish = ref<string | null>(null);

  const filteredMisc = computed(() => {
    if (!searchQuery.value.trim()) return miscItems.value;
    const query = searchQuery.value.toLowerCase();
    return miscItems.value.filter(
      m => m.title.toLowerCase().includes(query) || m.description?.toLowerCase().includes(query)
    );
  });

  const stats = computed(() => ({
    total: miscItems.value.length,
    published: miscItems.value.filter(m => m.published).length,
    draft: miscItems.value.filter(m => !m.published).length,
  }));

  onMounted(async () => {
    await fetchMisc();
  });

  const fetchMisc = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      refreshing.value = true;
    } else {
      loading.value = true;
    }
    try {
      const result = await pb.collection('misc').getFullList({
        sort: '-created',
        fields: 'id,title,slug,created,description,published',
      });
      miscItems.value = result as unknown as Misc[];
    } catch (error) {
      console.error('Failed to fetch misc:', error);
    } finally {
      loading.value = false;
      refreshing.value = false;
    }
  };

  import { formatDateToDisplay } from '@/lib/pocketbase';

  const formatDate = (dateStr: string) => {
    return formatDateToDisplay(dateStr);
  };

  const togglePublish = async (misc: Misc) => {
    togglingPublish.value = misc.id;
    try {
      await pb.collection('misc').update(misc.id, {
        published: !misc.published,
      });
      misc.published = !misc.published;
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

  const deleteMisc = async (misc: Misc) => {
    deleting.value = true;
    try {
      await pb.collection('misc').delete(misc.id);
      miscItems.value = miscItems.value.filter(m => m.id !== misc.id);
      deleteConfirm.value = null;
    } catch (error) {
      console.error('Failed to delete misc:', error);
      alert('删除失败，请重试');
    } finally {
      deleting.value = false;
    }
  };

  const createNew = () => {
    router.push('/admin/misc/new');
  };

  const editMisc = (id: string) => {
    router.push(`/admin/misc/${id}`);
  };
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
      <h1 class="text-2xl font-semibold text-[#c9c9c9]">杂记管理</h1>
    </div>

    <div v-else class="relative space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-[#c9c9c9]">杂记管理</h1>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors"
            @click="createNew"
          >
            <AppIcon name="plus" class-name="w-5 h-5" />
            新建杂记
          </button>
          <button
            :disabled="refreshing"
            class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="fetchMisc(true)"
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
          placeholder="搜索杂记标题或描述"
          class="w-full pl-10 pr-4 py-2.5 bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
        />
      </div>

      <div v-if="filteredMisc.length === 0" class="text-center py-20">
        <p class="text-[#888]">{{ searchQuery ? '没有找到匹配的杂记' : '暂无杂记，点击上方按钮创建' }}</p>
      </div>

      <div v-else class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 overflow-hidden">
        <table class="w-full text-left">
          <thead class="bg-white/5">
            <tr>
              <th class="px-4 py-3 text-sm font-medium text-[#888]">
                <div class="flex items-center gap-1.5">
                  <AppIcon name="file" class-name="w-4 h-4 opacity-60" />
                  标题
                </div>
              </th>
              <th class="px-4 py-3 text-sm font-medium text-[#888]">
                <div class="flex items-center gap-1.5">
                  <AppIcon name="date" class-name="w-4 h-4 opacity-60" />
                  发布日期
                </div>
              </th>
              <th class="px-4 py-3 text-center text-sm font-medium text-[#888]">状态</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-[#888]">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#c9c9c9]/10">
            <tr v-for="misc in filteredMisc" :key="misc.id" class="hover:bg-white/5 transition-colors">
              <td class="px-4 py-3">
                <p class="font-medium text-[#c9c9c9]">{{ misc.title }}</p>
                <p class="text-sm text-[#888] truncate max-w-xs">{{ misc.description || '-' }}</p>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1 text-sm text-[#888]">
                  <AppIcon name="date" />
                  <span>{{ formatDate(misc.date || misc.created) }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  :disabled="togglingPublish === misc.id"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  :class="misc.published ? 'bg-red-700' : 'bg-[#c9c9c9]/20'"
                  @click="togglePublish(misc)"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    :class="misc.published ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    class="p-1.5 text-[#888] hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                    title="编辑"
                    @click="editMisc(misc.id)"
                  >
                    <AppIcon name="edit" class-name="w-5 h-5" />
                  </button>
                  <button
                    class="p-1.5 text-[#888] hover:text-red-500 hover:bg-white/10 rounded-lg transition-colors"
                    title="删除"
                    @click="confirmDelete(misc.id)"
                  >
                    <AppIcon name="trash" class-name="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 删除确认模态框 -->
      <div
        v-if="deleteConfirm"
        class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl max-w-sm w-full p-6 shadow-2xl">
          <h3 class="text-xl font-semibold text-[#c9c9c9] mb-2">确认删除</h3>
          <p class="text-[#888] mb-6">确定要删除这个杂记吗？此操作不可撤销。</p>
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
              :disabled="deleting"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              :disabled="deleting"
              @click="deleteMisc(miscItems.find(m => m.id === deleteConfirm)!)"
            >
              <span
                v-if="deleting"
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              ></span>
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
    to {
      transform: rotate(360deg);
    }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
