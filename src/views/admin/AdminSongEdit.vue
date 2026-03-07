<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pb, decodeSongLinkNames, encodeSongLinkNames, parseDateFromBackend, normalizeDateForStorage } from '@/lib/pocketbase';
import { marked } from 'marked';
import type { Song } from '@/types';

const route = useRoute();
const router = useRouter();
const isEdit = ref(route.params.id !== undefined);
const loading = ref(false);
const saving = ref(false);
const datePicker = ref<HTMLInputElement | null>(null);
const showDescriptionPreview = ref(false);
const titleError = ref('');
const artistError = ref('');

const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
};

const filterNewlines = (value: string) => {
    return value.replace(/\r\n|\r|\n/g, ' ');
};

const song = ref<Partial<Song>>({
    title: '',
    album: '',
    artist: '',
    releaseDate: '',
    lyricist: '',
    composer: '',
    lyrics: '',
    credits: '',
    description: '',
    links: [
        { name: '网易云音乐', url: '' },
        { name: '酷狗音乐', url: '' },
        { name: 'QQ 音乐', url: '' },
        { name: '酷我音乐', url: '' }
    ],
    otherLinks: [],
});

onMounted(async () => {
    if (isEdit.value) {
        loading.value = true;
        try {
            const record = await pb.collection('songs').getOne(route.params.id as string);
            const decodedRecord = decodeSongLinkNames(record as Song);
            song.value = {
                ...decodedRecord,
                releaseDate: decodedRecord.releaseDate ? parseDateFromBackend(decodedRecord.releaseDate) : '',
                links: Array.isArray(decodedRecord.links)
                    ? decodedRecord.links
                    : song.value.links,
                otherLinks: Array.isArray(decodedRecord.otherLinks)
                    ? decodedRecord.otherLinks
                    : [],
            } as unknown as Song;
        } catch (error) {
            console.error('Failed to fetch song:', error);
            alert('获取音乐详情失败');
            router.push('/admin/songs');
        } finally {
            loading.value = false;
        }
    }
});

const addLink = () => {
    if (!song.value.links) song.value.links = [];
    song.value.links.push({ name: '', url: '' });
};

const removeLink = (index: number) => {
    song.value.links?.splice(index, 1);
};

const addOtherLink = () => {
    if (!song.value.otherLinks) song.value.otherLinks = [];
    song.value.otherLinks.push({ name: '', url: '' });
};

const removeOtherLink = (index: number) => {
    song.value.otherLinks?.splice(index, 1);
};

const saveSong = async () => {
    titleError.value = '';
    artistError.value = '';

    const normalizedTitle = song.value.title?.trim() || '';
    const normalizedArtist = song.value.artist?.trim() || '';

    if (!normalizedTitle) {
        titleError.value = '标题不能为空';
    }
    if (!normalizedArtist) {
        artistError.value = '艺人不能为空';
    }
    if (titleError.value || artistError.value) {
        return;
    }

    const normalizedLinks = (song.value.links || [])
        .map(l => ({
            name: (l.name || '').trim(),
            url: (l.url || '').trim(),
        }))
        .filter(l => l.name && l.url);

    const normalizedOtherLinks = (song.value.otherLinks || [])
        .map(l => ({
            name: (l.name || '').trim(),
            url: (l.url || '').trim(),
        }))
        .filter(l => l.name && l.url);

    saving.value = true;
    try {
        let index = song.value.index;
        if (!isEdit.value) {
            const records = await pb.collection('songs').getFullList({
                sort: '-index',
                fields: 'index',
                requestKey: null,
            });
            const maxIndex = records.reduce((max, record: any) => {
                const current = Number(record.index) || 0;
                return Math.max(max, current);
            }, 0);
            index = maxIndex + 1;
        }

        const data = encodeSongLinkNames({
            ...song.value,
            title: normalizedTitle,
            artist: normalizedArtist,
            index,
            links: normalizedLinks,
            otherLinks: normalizedOtherLinks,
            releaseDate: normalizeDateForStorage(song.value.releaseDate),
        });

        if (isEdit.value) {
            await pb.collection('songs').update(route.params.id as string, data);
        } else {
            await pb.collection('songs').create(data);
        }
        router.push('/admin/songs');
    } catch (error) {
        console.error('Failed to save song:', error);
        alert('保存失败，请检查输入是否完整');
    } finally {
        saving.value = false;
    }
};

const cancel = () => {
    router.push('/admin/songs');
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
    song.value.releaseDate = formatted;
};
</script>

<template>
    <div class="max-w-7xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
            <div class="flex-1">
                <h1 class="text-2xl font-semibold text-[#c9c9c9]">
                    {{ isEdit ? '编辑音乐' : '新建音乐' }}
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
                    @click="saveSong"
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

        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-8 lg:order-1 space-y-6">
                <!-- 基本信息 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
                    <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3">基本信息</h2>
                    
                    <div class="space-y-2">
                        <label class="text-sm text-[#888]">标题 <span class="text-red-300">*</span></label>
                        <div class="relative group">
                            <textarea
                                v-model="song.title"
                                v-autosize
                                rows="1"
                                placeholder="标题"
                                class="w-full px-4 py-2.5 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10 resize-none overflow-hidden"
                                :class="titleError ? 'border-red-400/70' : 'border-[#c9c9c9]/20'"
                                @input="titleError = ''; song.title = filterNewlines(song.title || '')"
                                @keydown.enter.prevent
                            ></textarea>
                            <button
                                v-if="song.title"
                                @click="song.title = ''; titleError = '';"
                                class="absolute right-3 top-3 text-[#888] hover:text-red-300 transition-colors"
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
                            <label class="text-sm text-[#888]">艺人 <span class="text-red-300">*</span></label>
                            <div class="relative group">
                                <textarea
                                    v-model="song.artist"
                                    v-autosize
                                    rows="1"
                                    placeholder="艺人"
                                    class="w-full px-4 py-2.5 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10 resize-none overflow-hidden"
                                    :class="artistError ? 'border-red-400/70' : 'border-[#c9c9c9]/20'"
                                    @input="artistError = ''; song.artist = filterNewlines(song.artist || '')"
                                    @keydown.enter.prevent
                                ></textarea>
                                <button
                                    v-if="song.artist"
                                    @click="song.artist = ''; artistError = '';"
                                    class="absolute right-3 top-3 text-[#888] hover:text-red-300 transition-colors"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            <p v-if="artistError" class="text-xs text-red-300">{{ artistError }}</p>
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm text-[#888]">专辑</label>
                            <div class="relative group">
                                <textarea
                                    v-model="song.album"
                                    v-autosize
                                    rows="1"
                                    placeholder="专辑"
                                    class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10 resize-none overflow-hidden"
                                    @input="song.album = filterNewlines(song.album || '')"
                                    @keydown.enter.prevent
                                ></textarea>
                                <button
                                    v-if="song.album"
                                    @click="song.album = ''"
                                    class="absolute right-3 top-3 text-[#888] hover:text-red-300 transition-colors"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-sm text-[#888]">词作</label>
                            <div class="relative group">
                                <textarea
                                    v-model="song.lyricist"
                                    v-autosize
                                    rows="1"
                                    placeholder="词作"
                                    class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10 resize-none overflow-hidden"
                                    @input="song.lyricist = filterNewlines(song.lyricist || '')"
                                    @keydown.enter.prevent
                                ></textarea>
                                <button
                                    v-if="song.lyricist"
                                    @click="song.lyricist = ''"
                                    class="absolute right-3 top-3 text-[#888] hover:text-red-300 transition-colors"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm text-[#888]">曲作</label>
                            <div class="relative group">
                                <textarea
                                    v-model="song.composer"
                                    v-autosize
                                    rows="1"
                                    placeholder="曲作"
                                    class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-10 resize-none overflow-hidden"
                                    @input="song.composer = filterNewlines(song.composer || '')"
                                    @keydown.enter.prevent
                                ></textarea>
                                <button
                                    v-if="song.composer"
                                    @click="song.composer = ''"
                                    class="absolute right-3 top-3 text-[#888] hover:text-red-300 transition-colors"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-sm text-[#888]">发布日期</label>
                        <div class="relative group">
                            <input
                                :value="song.releaseDate"
                                @input="handleDateInput"
                                type="text"
                                placeholder="YYYY/MM/DD"
                                class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-24"
                            />
                            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button 
                                    v-if="song.releaseDate"
                                    @click="song.releaseDate = ''"
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
                                    @change="(e: any) => song.releaseDate = e.target.value"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 描述 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <h2 class="text-lg font-medium text-[#c9c9c9]">描述</h2>
                            <svg class="w-4 h-4 text-[#888]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"/><path d="M7 15V9l2 2 2-2v6"/><path d="m14 11 2-2 2 2"/><path d="M16 9v6"/>
                            </svg>
                        </div>
                        <div class="flex items-center gap-3">
                            <button 
                                @click="showDescriptionPreview = !showDescriptionPreview"
                                class="text-xs text-red-300 hover:text-[#fca5a5] transition-colors"
                            >
                                {{ showDescriptionPreview ? '编辑模式' : '预览模式' }}
                            </button>
                            <button 
                                v-if="song.description"
                                @click="song.description = ''"
                                class="text-xs text-[#888] hover:text-red-300 transition-colors"
                            >
                                清空
                            </button>
                        </div>
                    </div>
                    <div v-if="showDescriptionPreview" class="w-full px-4 py-3 bg-black/10 border border-[#c9c9c9]/10 rounded-lg text-[#e0e0e0] min-h-25 prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(song.description)"></div>
                    <textarea
                        v-else
                        v-model="song.description"
                        v-autosize
                        rows="1"
                        placeholder="音乐描述"
                        class="w-full px-4 py-3 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all leading-relaxed resize-none"
                    ></textarea>
                </div>

                <!-- 链接列表 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-medium text-[#c9c9c9]">平台链接</h2>
                        <button @click="addLink" class="text-sm text-red-300 hover:text-[#fca5a5] transition-colors">+ 添加</button>
                    </div>
                    <div class="space-y-3">
                        <div v-for="(link, index) in song.links" :key="index" class="flex gap-3">
                            <textarea
                                v-model="link.name"
                                v-autosize
                                rows="1"
                                placeholder="平台名称"
                                class="w-1/3 px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] resize-none"
                            ></textarea>
                            <input
                                v-model="link.url"
                                type="text"
                                placeholder="链接地址"
                                class="flex-1 px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm"
                            />
                            <button @click="removeLink(index)" class="text-red-400 hover:text-red-300 p-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 其他相关链接 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-medium text-[#c9c9c9]">其他相关链接</h2>
                        <button @click="addOtherLink" class="text-sm text-red-300 hover:text-[#fca5a5] transition-colors">+ 添加</button>
                    </div>
                    <div class="space-y-3">
                        <div v-for="(link, index) in song.otherLinks" :key="index" class="flex gap-3">
                            <textarea
                                v-model="link.name"
                                v-autosize
                                rows="1"
                                placeholder="链接描述"
                                class="w-1/3 px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] resize-none"
                            ></textarea>
                            <input
                                v-model="link.url"
                                type="text"
                                placeholder="链接地址"
                                class="flex-1 px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm"
                            />
                            <button @click="removeOtherLink(index)" class="text-red-400 hover:text-red-300 p-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="lg:col-span-4 lg:order-2 space-y-6">
                <!-- 歌词 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-medium text-[#c9c9c9]">歌词</h2>
                        <button
                            v-if="song.lyrics"
                            @click="song.lyrics = ''"
                            class="text-xs text-[#888] hover:text-red-300 transition-colors"
                        >
                            清空
                        </button>
                    </div>
                    <textarea
                        v-model="song.lyrics"
                        v-autosize
                        rows="1"
                        placeholder="歌词"
                        class="w-full px-4 py-3 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all font-mono leading-relaxed resize-none"
                    ></textarea>
                </div>

                <!-- 制作人员 (Credits) -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-medium text-[#c9c9c9]">制作人员</h2>
                        <button
                            v-if="song.credits"
                            @click="song.credits = ''"
                            class="text-xs text-[#888] hover:text-red-300 transition-colors"
                        >
                            清空
                        </button>
                    </div>
                    <textarea
                        v-model="song.credits"
                        v-autosize
                        rows="1"
                        placeholder="制作人员名单"
                        class="w-full px-4 py-3 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all font-mono leading-relaxed resize-none"
                    ></textarea>
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
