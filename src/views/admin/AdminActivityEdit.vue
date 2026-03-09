<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pb, parseDateFromBackend, normalizeDateForStorage } from '@/lib/pocketbase';
import AdminInput from '@/components/AdminInput.vue';
import type { Activity } from '@/types';
import AppIcon from '@/components/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const isEdit = ref(route.params.id !== undefined);
const loading = ref(false);
const saving = ref(false);
const datePicker = ref<HTMLInputElement | null>(null);
const titleError = ref('');

const activity = ref<Partial<Activity>>({
    title: '',
    date: '',
    location: '',
    tags: [],
    content: '',
});

const tagInput = ref('');

onMounted(async () => {
    if (isEdit.value) {
        loading.value = true;
        try {
            const record = await pb.collection('activities').getOne(route.params.id as string);
            activity.value = {
                ...record,
                date: record.date ? parseDateFromBackend(record.date) : '',
                tags: Array.isArray(record.tags) ? record.tags : [],
            } as unknown as Activity;
        } catch (error) {
            console.error('Failed to fetch activity:', error);
            alert('获取活动详情失败');
            router.push('/admin/activities');
        } finally {
            loading.value = false;
        }
    }
});

const addTag = () => {
    const tag = tagInput.value.trim();
    if (tag && !activity.value.tags?.includes(tag)) {
        activity.value.tags = [...(activity.value.tags || []), tag];
        tagInput.value = '';
    }
};

const removeTag = (tag: string) => {
    activity.value.tags = activity.value.tags?.filter(t => t !== tag);
};

const saveActivity = async () => {
    titleError.value = '';
    if (!activity.value.title?.trim()) {
        titleError.value = '活动名称不能为空';
        return;
    }

    saving.value = true;
    try {
        const collection = pb.collection('activities');
        const normalizedTitle = activity.value.title.trim();

        let index = activity.value.index;
        if (!isEdit.value) {
            const records = await collection.getFullList({
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

        const data = {
            ...activity.value,
            title: normalizedTitle,
            index,
            date: normalizeDateForStorage(activity.value.date),
        };

        if (isEdit.value) {
            await collection.update(route.params.id as string, data);
        } else {
            await collection.create(data);
        }
        router.push('/admin/activities');
    } catch (error) {
        console.error('Failed to save activity:', error);
        alert('保存失败，请检查输入是否完整');
    } finally {
        saving.value = false;
    }
};

const cancel = () => {
    router.push('/admin/activities');
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
    activity.value.date = formatted;
};
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
            <div class="flex-1">
                <h1 class="text-2xl font-semibold text-[#c9c9c9]">
                    {{ isEdit ? '编辑活动' : '新建活动' }}
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
                    @click="saveActivity"
                    class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors flex items-center gap-2"
                    :disabled="saving"
                >
                    <AppIcon v-if="saving" name="refresh" class-name="w-4 h-4 animate-spin" />
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
                    <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3">基本信息</h2>
                    
                    <AdminInput
                        v-model="activity.title"
                        label="名称"
                        placeholder="活动名称"
                        required
                        :error="titleError"
                        @clear="titleError = ''"
                    />

                    <div class="space-y-2">
                        <label class="text-sm text-[#888]">日期</label>
                        <div class="relative group">
                            <input
                                :value="activity.date"
                                @input="handleDateInput"
                                type="text"
                                placeholder="YYYY/MM/DD"
                                class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-24"
                            />
                            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button
                                    v-if="activity.date"
                                    @click="activity.date = ''"
                                    class="p-1.5 text-[#888] hover:text-red-300 transition-colors"
                                    title="清空"
                                >
                                    <AppIcon name="close" class-name="w-4 h-4" />
                                </button>
                                <button
                                    @click="openDatePicker"
                                    class="p-1.5 text-[#888] hover:text-red-300 transition-colors"
                                    title="选择日期"
                                >
                                    <AppIcon name="calendar" class-name="w-5 h-5" />
                                </button>
                                <input
                                    ref="datePicker"
                                    type="date"
                                    class="absolute opacity-0 pointer-events-none w-0 h-0"
                                    @change="(e: any) => activity.date = e.target.value"
                                />
                            </div>
                        </div>
                    </div>

                    <AdminInput
                        v-model="activity.location"
                        label="地点"
                        placeholder="活动地点"
                    />
                </div>

                <!-- 标签 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
                    <h2 class="text-lg font-medium text-[#c9c9c9]">标签</h2>
                    <div class="flex flex-wrap gap-2 mb-2">
                        <span 
                            v-for="tag in activity.tags" 
                            :key="tag"
                            class="inline-flex items-center gap-1 px-3 py-1 bg-red-300/10 text-red-300 rounded-full text-sm"
                        >
                            {{ tag }}
                            <button @click="removeTag(tag)" class="-m-1 p-1 hover:text-white transition-colors">
                                <AppIcon name="close" class-name="w-4 h-4" />
                            </button>
                        </span>
                    </div>
                    <div class="flex gap-2">
                        <input
                            v-model="tagInput"
                            type="text"
                            placeholder="添加标签"
                            @keyup.enter="addTag"
                            class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
                        />
                        <button
                            @click="addTag"
                            class="px-4 py-2 bg-white/5 text-[#c9c9c9] rounded-lg hover:bg-white/10 transition-colors"
                        >
                            添加
                        </button>
                    </div>
                </div>

                <!-- 活动详情 -->
                <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
                    <AdminInput
                        v-model="activity.content"
                        label="详情"
                        type="markdown"
                        placeholder="活动详情"
                        label-size="lg"
                    />
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
