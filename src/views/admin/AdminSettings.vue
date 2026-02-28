<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { pb } from '@/lib/pocketbase';
import type { SiteSetting } from '@/types';

const settings = ref<SiteSetting[]>([]);
const loading = ref(true);
const saving = ref<string | null>(null);

// Grouped settings for UI
const groups = [
    {
        id: 'home',
        label: '首页内容',
        keys: ['home_title', 'home_subtitle', 'home_slogan_1', 'home_slogan_2']
    },
    {
        id: 'links',
        label: '平台链接',
        keys: ['link_bilibili', 'link_weibo', 'link_music']
    },
    {
        id: 'about',
        label: '关于页面',
        keys: ['about_description', 'about_github', 'about_contact', 'about_disclaimer']
    }
];

const labels: Record<string, string> = {
    'home_title': '主标题',
    'home_subtitle': '副标题',
    'home_slogan_1': '标语第一行 (垂直文本)',
    'home_slogan_2': '标语第二行 (垂直文本)',
    'link_bilibili': '哔哩哔哩链接',
    'link_weibo': '微博链接',
    'link_music': '网易云音乐链接',
    'about_description': '站点描述',
    'about_github': 'GitHub 仓库链接',
    'about_contact': '联系邮箱',
    'about_disclaimer': '免责声明'
};

const settingValues = ref<Record<string, string>>({});

onMounted(async () => {
    await fetchSettings();
});

const fetchSettings = async () => {
    loading.value = true;
    try {
        const result = await pb.collection('site_settings').getFullList();
        settings.value = result as unknown as SiteSetting[];
        
        // Initialize values
        const values: Record<string, string> = {};
        settings.value.forEach(s => {
            values[s.key] = s.value;
        });
        
        // Ensure all keys from groups exist in values
        groups.forEach(group => {
            group.keys.forEach(key => {
                if (!(key in values)) {
                    values[key] = '';
                }
            });
        });
        
        settingValues.value = values;
    } catch (error) {
        console.error('Failed to fetch settings:', error);
    } finally {
        loading.value = false;
    }
};

const saveSetting = async (key: string) => {
    saving.value = key;
    try {
        const value = settingValues.value[key];
        const existing = settings.value.find(s => s.key === key);
        
        if (existing) {
            await pb.collection('site_settings').update(existing.id, { value });
        } else {
            const newRecord = await pb.collection('site_settings').create({ key, value });
            settings.value.push(newRecord as unknown as SiteSetting);
        }
    } catch (error) {
        console.error(`Failed to save setting ${key}:`, error);
        alert('保存失败');
    } finally {
        saving.value = null;
    }
};

const saveAll = async () => {
    const keys = Object.keys(settingValues.value);
    for (const key of keys) {
        await saveSetting(key);
    }
    alert('全部保存成功');
};
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold text-[#c9c9c9]">站点配置</h1>
                <p class="text-[#888] mt-1">管理首页、关于页面的文本和链接</p>
            </div>
            <button
                @click="saveAll"
                class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors flex items-center gap-2"
                :disabled="saving !== null"
            >
                保存全部
            </button>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
        </div>

        <div v-else class="space-y-8 pb-20">
            <div v-for="group in groups" :key="group.id" class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl overflow-hidden">
                <div class="px-6 py-4 bg-white/5 border-b border-[#c9c9c9]/10">
                    <h2 class="text-lg font-medium text-[#c9c9c9]">{{ group.label }}</h2>
                </div>
                <div class="p-6 space-y-6">
                    <div v-for="key in group.keys" :key="key" class="space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="text-sm text-[#888]">{{ labels[key] || key }}</label>
                            <span v-if="saving === key" class="text-xs text-red-300 animate-pulse">保存中...</span>
                        </div>
                        <div class="flex gap-3">
                            <textarea
                                v-if="key.includes('description') || key.includes('disclaimer')"
                                v-model="settingValues[key]"
                                v-autosize
                                rows="1"
                                class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all text-sm resize-none"
                                @blur="saveSetting(key)"
                            ></textarea>
                            <input
                                v-else
                                v-model="settingValues[key]"
                                type="text"
                                class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all text-sm"
                                @blur="saveSetting(key)"
                            />
                        </div>
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
