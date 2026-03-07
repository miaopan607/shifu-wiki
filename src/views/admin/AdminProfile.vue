<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import { marked } from 'marked';

interface Profile {
    id: string;
    content: string;
}

const router = useRouter();
const loading = ref(true);
const saving = ref(false);
const saved = ref(false);
const showContentPreview = ref(false);
const contentError = ref('');

const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
};

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

const cancel = () => {
    router.push('/admin');
};
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
            <div class="flex-1">
                <h1 class="text-2xl font-semibold text-[#c9c9c9]">个人介绍管理</h1>
            </div>
            <div class="flex gap-3">
                <button
                    @click="saveProfile"
                    class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors flex items-center gap-2"
                    :disabled="saving || saved"
                >
                    <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <svg v-else-if="saved" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
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
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <h2 class="text-lg font-medium text-[#c9c9c9]">内容 <span class="text-red-300">*</span></h2>
                                <svg class="w-4 h-4 text-[#888]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"/><path d="M7 15V9l2 2 2-2v6"/><path d="m14 11 2-2 2 2"/><path d="M16 9v6"/>
                                </svg>
                            </div>
                            <div class="flex items-center gap-3">
                                <button
                                    @click="showContentPreview = !showContentPreview"
                                    class="text-xs text-red-300 hover:text-[#fca5a5] transition-colors"
                                >
                                    {{ showContentPreview ? '编辑模式' : '预览模式' }}
                                </button>
                                <button
                                    v-if="profile.content"
                                    @click="profile.content = ''; contentError = '';"
                                    class="text-xs text-[#888] hover:text-red-300 transition-colors"
                                >
                                    清空
                                </button>
                            </div>
                        </div>
                        <div
                            v-if="showContentPreview"
                            class="w-full px-4 py-3 bg-black/10 border border-[#c9c9c9]/10 rounded-lg text-[#e0e0e0] min-h-50 prose prose-invert max-w-none"
                            v-html="renderMarkdown(profile.content)"
                        ></div>
                        <textarea
                            v-else
                            v-model="profile.content"
                            rows="20"
                            placeholder="个人介绍内容"
                            class="w-full px-4 py-3 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all font-mono leading-relaxed resize-y"
                            :class="contentError ? 'border-red-400/70' : 'border-[#c9c9c9]/20'"
                            @input="contentError = ''; saved = false;"
                        ></textarea>
                        <p v-if="contentError" class="text-xs text-red-300">{{ contentError }}</p>
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
