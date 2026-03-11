<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { pb } from '@/lib/pocketbase';
  import AdminInput from '@/components/AdminInput.vue';
  import AppIcon from '@/components/AppIcon.vue';
  import type { Misc } from '@/types';

  const route = useRoute();
  const router = useRouter();
  const isEdit = ref(route.params.id !== undefined);
  const loading = ref(false);
  const saving = ref(false);
  const titleError = ref('');
  const contentError = ref('');

  const misc = ref<Partial<Misc>>({
    title: '',
    index: 0,
    description: '',
    content: '',
    published: false,
  });

  onMounted(async () => {
    if (isEdit.value) {
      loading.value = true;
      try {
        const record = await pb.collection('misc').getOne(route.params.id as string);
        misc.value = {
          ...record,
        } as unknown as Misc;
      } catch (error) {
        console.error('Failed to fetch misc:', error);
        alert('获取杂记详情失败');
        router.push('/admin/misc');
      } finally {
        loading.value = false;
      }
    }
  });

  const saveMisc = async () => {
    titleError.value = '';
    contentError.value = '';

    const normalizedTitle = misc.value.title?.trim() || '';
    const normalizedContent = misc.value.content?.trim() || '';

    if (!normalizedTitle) {
      titleError.value = '标题不能为空';
    }
    if (!normalizedContent) {
      contentError.value = '正文内容不能为空';
    }
    if (titleError.value || contentError.value) {
      return;
    }

    saving.value = true;
    try {
      const data: any = {
        ...misc.value,
        title: normalizedTitle,
        content: normalizedContent,
      };

      if (isEdit.value) {
        await pb.collection('misc').update(route.params.id as string, data);
      } else {
        // 自动分配递增索引：获取当前最大索引并加1
        const maxIndexResult = await pb.collection('misc').getList(1, 1, {
          sort: '-index',
          fields: 'index',
        });
        const nextIndex = maxIndexResult.items.length > 0 ? ((maxIndexResult.items[0] as any).index as number) + 1 : 1;
        data.index = nextIndex;

        await pb.collection('misc').create(data);
      }
      router.push('/admin/misc');
    } catch (error) {
      console.error('Failed to save misc:', error);
      alert('保存失败，请检查输入是否完整');
    } finally {
      saving.value = false;
    }
  };

  const cancel = () => {
    router.push('/admin/misc');
  };
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <h1 class="text-2xl font-semibold text-[#c9c9c9] flex items-center gap-3">
          {{ isEdit ? '编辑杂记' : '新建杂记' }}
          <span v-if="isEdit && !loading && misc.index" class="text-lg text-[#888] font-normal">#{{ misc.index }}</span>
        </h1>
      </div>
      <div class="flex gap-3">
        <button
          class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors inline-flex items-center gap-2"
          @click="cancel"
        >
          <AppIcon name="close" class-name="w-4 h-4" />
          取消
        </button>
        <button
          class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors flex items-center gap-2"
          :disabled="saving"
          @click="saveMisc"
        >
          <AppIcon v-if="saving" name="refresh" class-name="w-4 h-4 animate-spin" />
          <AppIcon v-else name="save" class-name="w-4 h-4" />
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
    </div>

    <div v-else class="grid grid-cols-1 gap-6">
      <div class="space-y-6">
        <!-- 基本信息 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
          <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3 flex items-center gap-2">
            <AppIcon name="info" class-name="w-5 h-5 text-red-300" />
            基本信息
          </h2>

          <AdminInput
            v-model="misc.title"
            label="标题"
            placeholder="标题"
            required
            :error="titleError"
            @clear="titleError = ''"
          />

          <AdminInput v-model="misc.description" label="简介" placeholder="简介" />
        </div>

        <!-- 内容 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
          <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3 flex items-center gap-2">
            <AppIcon name="edit" class-name="w-5 h-5 text-red-300" />
            正文内容
          </h2>

          <div class="space-y-2">
            <label class="text-sm text-[#888]">正文内容 (Markdown)</label>
            <textarea
              v-model="misc.content"
              class="w-full h-96 px-4 py-3 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all font-mono resize-y"
              placeholder="请输入正文内容..."
            ></textarea>
            <p v-if="contentError" class="text-xs text-red-300 mt-1">{{ contentError }}</p>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input
              id="published"
              v-model="misc.published"
              type="checkbox"
              class="w-4 h-4 rounded border-[#c9c9c9]/20 bg-black/20 text-red-300 focus:ring-red-300/50"
            />
            <label for="published" class="text-[#c9c9c9] select-none cursor-pointer">立即发布</label>
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

  textarea {
    resize: none;
  }
</style>
