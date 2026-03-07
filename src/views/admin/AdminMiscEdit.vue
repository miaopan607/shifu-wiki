<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import { marked } from 'marked';
import type { Misc } from '@/types';

const route = useRoute();
const router = useRouter();
const isEdit = ref(route.params.id !== undefined);
const loading = ref(false);
const saving = ref(false);
const datePicker = ref<HTMLInputElement | null>(null);
const showContentPreview = ref(false);
const titleError = ref('');
const contentError = ref('');

const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
};

const misc = ref<Partial<Misc>>({
    title: '',
    slug: '',
    date: '',
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
                date: record.date ? record.date.split(' ')[0] : '',
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
        const data = {
            ...misc.value,
            title: normalizedTitle,
            content: normalizedContent,
            slug: misc.value.slug?.trim() || undefined,
        };

        if (isEdit.value) {
            await pb.collection('misc').update(route.params.id as string, data);
        } else {
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

const openDatePicker = () => {
    if (!datePicker.value) return;
    try {
        if (typeof (datePicker.value as any).showPicker === 'function') {
            (datePicker.value as any).showPicker();
        } else {
            datePicker.value.click();
        }
    } catch (e) {
        console.error('Failed to open date picker:', e);
        datePicker.value.click();
    }
};

const handleDateInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    let formatted = '';
    if (value.length > 0) {
        formatted = value.slice(0, 4);
        if (value.length > 4) {
            formatted += '-' + value.slice(4, 6);
            if (value.length > 6) {
                formatted += '-' + value.slice(6, 8);
            }
        }
    }
    misc.value.date = formatted;
};
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
            <div class="flex-1">
                <h1 class="text-2xl font-semibold text-[#c9c9c9]">
                    {{ isEdit ? '编辑杂记' : '新建杂记' }}
                </h1>
            </div>
            <div class="flex gap-3">
                <button
                    @click="cancel"
                    class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
                >
                    取消
                </button>
                <button
                    @click="saveMisc"
                    class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors flex items-center gap-2"
                    :disabled="saving"
                >
                    <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {{ saving ? '保存中...' : '确认' }}
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
                    <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3">基本信息</h2>
                    
                    <div class="space-y-2">
                        <label class="text-sm text-[#888]">标题 <span class="text-red-300">*</span></label>
                        <div class="relative group">
                            <input
                                v-model="misc.title"
                                type="text"
                                placeholder="标题"
                                class="w-full px-4 py-2.5 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10"
                                :class="titleError ? 'border-red-400/70' : 'border-[#c9c9c9]/20'"
                                @input="titleError = ''"
                            />
                            <button
                                v-if="misc.title"
                                @click="misc.title = ''; titleError = '';"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-red-300 transition-colors"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <p v-if="titleError" class="text-xs text-red-300">{{ titleError }}</p>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-sm text-[#888]">发布日期</label>
                            <div class="relative group">
                                <input
                                    :value="misc.date"
                                    @input="handleDateInput"
                                    type="text"
                                    placeholder="YYYY-MM-DD"
                                    class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-24"
                                />
                                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button 
                                        v-if="misc.date"
                                        @click="misc.date = ''"
                                        class="p-1.5 text-[#888] hover:text-red-300 transition-colors"
                                        title="清空"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                    <button 
                                        @click="openDatePicker"
                                        class="p-1.5 text-[#888] hover:text-red-300 transition-colors"
                                        title="选择日期"
                                    >
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                    </button>
                                    <input
                                        ref="datePicker"
                                        type="date"
                                        class="absolute opacity-0 pointer-events-none w-0 h-0"
                                        @change="(e: any) => misc.date = e.target.value"
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm text-[#888]">语义化标签</label>
                            <input
                                v-model="misc.slug"
                                type="text"
                                placeholder="自定义 URL 路径"
                                class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
                            />
                        </div>
                    </div>

                    <div class="flex gap-6">
                        <div class="flex-1 space-y-2">
                            <div class="flex items-center justify-between h-5">
                                <label class="text-sm text-[#888]">描述</label>
                                <button 
                                    v-if="misc.description"
                                    @click="misc.description = ''"
                                    class="text-xs text-[#888] hover:text-red-300 transition-colors"
                                >
                                    清空
                                </button>
                            </div>
                            <input
                                v-model="misc.description"
                                type="text"
                                placeholder="杂记描述"
                                class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
                            />
                        </div>
                        <div class="space-y-2 min-w-27.5">
                            <div class="flex items-center h-5">
                                <label class="text-sm text-[#888]">发布状态</label>
                            </div>
                            <div class="flex items-center h-11.5">
                                <label class="flex items-center gap-3 cursor-pointer group">
                                    <button
                                        type="button"
                                        role="switch"
                                        :aria-checked="misc.published"
                                        @click="misc.published = !misc.published"
                                        :class="[
                                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                                            misc.published ? 'bg-red-700' : 'bg-[#888]/30'
                                        ]"
                                    >
                                        <span
                                            :class="[
                                                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                                                misc.published ? 'translate-x-6' : 'translate-x-1'
                                            ]"
                                        />
                                    </button>
                                    <span class="text-[#c9c9c9] text-sm transition-colors group-hover:text-red-300 w-12">{{ misc.published ? '已发布' : '草稿' }}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 正文内容 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <h2 class="text-lg font-medium text-[#c9c9c9]">正文 <span class="text-red-300">*</span></h2>
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
                                    v-if="misc.content"
                                    @click="misc.content = ''; contentError = '';"
                                    class="text-xs text-[#888] hover:text-red-300 transition-colors"
                                >
                                    清空
                                </button>
                            </div>
                        </div>
                        <div v-if="showContentPreview" class="w-full px-4 py-3 bg-black/10 border border-[#c9c9c9]/10 rounded-lg text-[#e0e0e0] min-h-50 prose prose-invert max-w-none" v-html="renderMarkdown(misc.content)"></div>
                        <textarea
                            v-else
                            v-model="misc.content"
                            v-autosize
                            rows="1"
                            placeholder="使用 Markdown 编写内容..."
                            class="w-full px-4 py-3 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all font-mono leading-relaxed resize-none"
                            :class="contentError ? 'border-red-400/70' : 'border-[#c9c9c9]/20'"
                            @input="contentError = ''"
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

textarea {
    resize: none;
}
</style>
