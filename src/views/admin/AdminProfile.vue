<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { pb } from '@/lib/pocketbase';
  import AdminInput from '@/components/AdminInput.vue';
  import AppIcon from '@/components/AppIcon.vue';

  interface Profile {
    id: string;
    content: string;
  }

  const loading = ref(true);
  const saving = ref(false);
  const saved = ref(false);
  const contentError = ref('');

  const profile = ref<Partial<Profile>>({
    content: '',
  });

  onMounted(async () => {
    await fetchProfile();
  });

  const fetchProfile = async () => {
    loading.value = true;
    try {
      const records = await pb.collection('profile').getFullList();
      if (records.length > 0) {
        profile.value = records[0] as unknown as Profile;
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      loading.value = false;
    }
  };

  const saveProfile = async () => {
    contentError.value = '';
    saved.value = false;

    const normalizedContent = profile.value.content?.trim() || '';

    if (!normalizedContent) {
      contentError.value = '内容不能为空';
      return;
    }

    saving.value = true;
    try {
      const data = {
        content: normalizedContent,
      };

      if (profile.value.id) {
        await pb.collection('profile').update(profile.value.id, data);
      } else {
        const record = await pb.collection('profile').create(data);
        profile.value.id = record.id;
      }
      saved.value = true;
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('保存失败，请重试');
    } finally {
      saving.value = false;
    }
  };
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-[#c9c9c9]">个人介绍管理</h1>
      </div>
      <div class="flex gap-3">
        <button
          class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors flex items-center gap-2"
          :disabled="saving || saved"
          @click="saveProfile"
        >
          <AppIcon v-if="saving" name="refresh" class-name="w-4 h-4 animate-spin" />
          <AppIcon v-else-if="saved" name="check" class-name="w-4 h-4" />
          <AppIcon v-else name="save" class-name="w-4 h-4" />
          {{ saving ? '保存中...' : saved ? '已保存' : '保存' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
    </div>

    <div v-else class="grid grid-cols-1 gap-6">
      <div class="space-y-6">
        <!-- 正文内容 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
          <AdminInput
            v-model="profile.content"
            label="内容"
            type="markdown"
            placeholder="个人介绍内容"
            required
            :error="contentError"
            :rows="20"
            label-size="lg"
            @input="saved = false"
            @clear="
              contentError = '';
              saved = false;
            "
          />
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
