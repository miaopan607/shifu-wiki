<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pb, parseDateFromBackend, normalizeDateForStorage } from '@/lib/pocketbase';
import { marked } from 'marked';
import type { Album } from '@/types';

const route = useRoute();
const router = useRouter();
const isEdit = ref(route.params.id !== undefined);
const loading = ref(false);
const saving = ref(false);
const datePicker = ref<HTMLInputElement | null>(null);
const showPreview = ref(false);
const titleError = ref('');

const album = ref<Partial<Album>>({
    title: '',
    releaseDate: '',
    description: '',
});

const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
};

const coverPreview = ref<string | null>(null);
const coverFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isCoverDragOver = ref(false);

onMounted(async () => {
    loading.value = true;
    try {
        if (isEdit.value) {
            const record = await pb.collection('albums').getOne(route.params.id as string);
            album.value = {
                ...record,
                releaseDate: record.releaseDate ? parseDateFromBackend(record.releaseDate) : '',
            } as unknown as Album;

            if (record.cover) {
                coverPreview.value = pb.files.getURL(record, record.cover, { thumb: '400x400' });
            }
        }
    } catch (error) {
        console.error('Failed to initialize album edit:', error);
        alert('初始化失败');
        router.push('/admin/albums');
    } finally {
        loading.value = false;
    }
});

const setCoverFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
        alert('仅支持图片文件');
        return;
    }
    coverFile.value = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        coverPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
};

const handleCoverChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
        setCoverFile(input.files[0]);
    }
};

const handleCoverDragEnter = () => {
    isCoverDragOver.value = true;
};

const handleCoverDragLeave = () => {
    isCoverDragOver.value = false;
};

const handleCoverDrop = (event: DragEvent) => {
    isCoverDragOver.value = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        setCoverFile(file);
    }
};

const saveAlbum = async () => {
    titleError.value = '';
    if (!album.value.title?.trim()) {
        titleError.value = '专辑标题不能为空';
        return;
    }

    saving.value = true;
    try {
        const formData = new FormData();
        formData.append('title', album.value.title.trim());
        formData.append('releaseDate', normalizeDateForStorage(album.value.releaseDate));
        formData.append('description', album.value.description || '');

        if (coverFile.value) {
            formData.append('cover', coverFile.value);
        }

        if (isEdit.value) {
            await pb.collection('albums').update(route.params.id as string, formData);
        } else {
            await pb.collection('albums').create(formData);
        }
        router.push('/admin/albums');
    } catch (error) {
        console.error('Failed to save album:', error);
        alert('保存失败，请检查输入是否完整');
    } finally {
        saving.value = false;
    }
};

const cancel = () => {
    router.push('/admin/albums');
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
            formatted += '/' + value.slice(4, 6);
            if (value.length > 6) {
                formatted += '/' + value.slice(6, 8);
            }
        }
    }
    album.value.releaseDate = formatted;
};
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
            <div class="flex-1">
                <h1 class="text-2xl font-semibold text-[#c9c9c9]">
                    {{ isEdit ? '编辑专辑' : '新建专辑' }}
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
                    @click="saveAlbum"
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

        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
                <!-- 基本信息 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
                    <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3">基本信息</h2>
                    
                    <div class="space-y-2">
                        <label class="text-sm text-[#888]">专辑名 <span class="text-red-300">*</span></label>
                        <div class="relative group">
                            <input
                                v-model="album.title"
                                type="text"
                                placeholder="专辑名"
                                class="w-full px-4 py-2.5 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10"
                                :class="titleError ? 'border-red-400/70' : 'border-[#c9c9c9]/20'"
                                @input="titleError = ''"
                            />
                            <button
                                v-if="album.title"
                                @click="album.title = ''"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-red-300 transition-colors"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <p v-if="titleError" class="text-xs text-red-300">{{ titleError }}</p>
                    </div>

                    <div class="space-y-2">
                        <label class="text-sm text-[#888]">发布日期</label>
                        <div class="relative group">
                            <input
                                :value="album.releaseDate"
                                @input="handleDateInput"
                                type="text"
                                placeholder="YYYY/MM/DD"
                                class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-24"
                            />
                            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button 
                                    v-if="album.releaseDate"
                                    @click="album.releaseDate = ''"
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
                                    @change="(e: any) => album.releaseDate = e.target.value"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-[#888]">描述</label>
                                <svg class="w-4 h-4 text-[#888]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"/><path d="M7 15V9l2 2 2-2v6"/><path d="m14 11 2-2 2 2"/><path d="M16 9v6"/>
                                </svg>
                            </div>
                            <div class="flex items-center gap-3">
                                <button 
                                    @click="showPreview = !showPreview"
                                    class="text-xs text-red-300 hover:text-[#fca5a5] transition-colors"
                                >
                                    {{ showPreview ? '编辑模式' : '预览模式' }}
                                </button>
                                <button 
                                    v-if="album.description"
                                    @click="album.description = ''"
                                    class="text-xs text-[#888] hover:text-red-300 transition-colors"
                                >
                                    清空
                                </button>
                            </div>
                        </div>
                        <div v-if="showPreview" class="w-full px-4 py-3 bg-black/10 border border-[#c9c9c9]/10 rounded-lg text-[#e0e0e0] min-h-25 prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(album.description)"></div>
                        <textarea
                            v-else
                            v-model="album.description"
                            v-autosize
                            rows="1"
                            placeholder="专辑描述"
                            class="w-full px-4 py-3 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all leading-relaxed resize-none"
                        ></textarea>
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <!-- 封面图 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
                    <h2 class="text-lg font-medium text-[#c9c9c9]">专辑封面</h2>
                    <div
                        class="aspect-square rounded-lg border-2 border-dashed border-[#c9c9c9]/20 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-red-300/50 transition-colors"
                        :class="isCoverDragOver ? 'border-red-300 bg-red-300/10' : ''"
                        @click="fileInput?.click()"
                        @dragenter.prevent="handleCoverDragEnter"
                        @dragover.prevent="handleCoverDragEnter"
                        @dragleave.prevent="handleCoverDragLeave"
                        @drop.prevent="handleCoverDrop"
                    >
                        <img v-if="coverPreview" :src="coverPreview" class="w-full h-full object-cover" />
                        <div v-else class="text-center p-4">
                            <svg class="w-12 h-12 mx-auto text-[#888] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <p class="text-sm text-[#888]">点击或拖动上传封面</p>
                        </div>
                        <div v-if="coverPreview" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p class="text-white text-sm">更换封面</p>
                        </div>
                        <input 
                            ref="fileInput"
                            type="file" 
                            accept="image/*" 
                            class="hidden" 
                            @change="handleCoverChange"
                        />
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

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(201, 201, 201, 0.1);
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(201, 201, 201, 0.2);
}

textarea {
    resize: none;
}
</style>
