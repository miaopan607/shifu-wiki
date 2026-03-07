<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import type { AdminUser, AdminView } from '@/types/admin';

const router = useRouter();
const route = useRoute();

const user = ref<AdminUser | null>(null);
const sidebarCollapsed = ref(false);
const isMobile = ref(false);
const mobileMenuOpen = ref(false);

const currentView = computed<AdminView>(() => {
    const path = route.path;
    if (path.includes('/admin/galleries')) return 'galleries';
    if (path.includes('/admin/songs')) return 'songs';
    if (path.includes('/admin/albums')) return 'albums';
    if (path.includes('/admin/activities')) return 'activities';
    if (path.includes('/admin/misc')) return 'misc';
    if (path.includes('/admin/profile')) return 'profile';
    return 'dashboard';
});

const navItems: { view: AdminView; label: string; icon: string; path: string }[] = [
    { view: 'dashboard', label: '仪表盘', icon: '📊', path: '/admin' },
    { view: 'songs', label: '音乐管理', icon: '🎵', path: '/admin/songs' },
    { view: 'albums', label: '专辑管理', icon: '💿', path: '/admin/albums' },
    { view: 'activities', label: '活动管理', icon: '🗓️', path: '/admin/activities' },
    { view: 'galleries', label: '图集管理', icon: '🖼️', path: '/admin/galleries' },
    { view: 'misc', label: '杂记管理', icon: '📝', path: '/admin/misc' },
    { view: 'profile', label: '个人介绍', icon: '👤', path: '/admin/profile' },
];

const checkMobile = () => {
    isMobile.value = window.innerWidth < 768;
    if (!isMobile.value) {
        mobileMenuOpen.value = false;
    }
};

onMounted(() => {
    document.documentElement.classList.add('admin-page');
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    if (pb.authStore.isValid && pb.authStore.record) {
        user.value = pb.authStore.record as unknown as AdminUser;
    }
    
    pb.authStore.onChange(() => {
        if (pb.authStore.isValid && pb.authStore.record) {
            user.value = pb.authStore.record as unknown as AdminUser;
        } else {
            user.value = null;
        }
    });
});

onUnmounted(() => {
    document.documentElement.classList.remove('admin-page');
    window.removeEventListener('resize', checkMobile);
});

const handleLogout = async () => {
    pb.authStore.clear();
    router.push('/admin/login');
};
</script>

<template>
    <div class="admin-layout h-screen flex flex-col overflow-hidden bg-[rgb(77,0,0)] font-serif">
        <header class="h-14 bg-[rgb(60,0,0)] border-b border-[#c9c9c9]/20 flex items-center justify-between px-4 md:px-6 z-50 shrink-0">
            <div class="flex items-center gap-4">
                <button
                    v-if="isMobile"
                    @click="mobileMenuOpen = !mobileMenuOpen"
                    class="p-2 hover:bg-white/10 rounded-lg text-[#c9c9c9]"
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
                <RouterLink to="/admin" class="text-lg font-semibold text-red-300 hover:text-[#fca5a5] transition-colors">
                    管理后台
                </RouterLink>
                <RouterLink
                    to="/"
                    class="px-3 py-1.5 rounded-lg text-base text-[#c9c9c9] hover:text-red-300 hover:bg-white/10 transition-colors"
                    title="返回主页"
                >
                    返回主页
                </RouterLink>
            </div>

            <div class="flex items-center gap-3">
                <div class="text-sm text-[#c9c9c9]">
                    {{ user?.username || '' }}
                </div>
                <button
                    @click="handleLogout"
                    class="p-2 hover:bg-white/10 rounded-lg text-[#c9c9c9] hover:text-red-300 transition-colors"
                    title="退出登录"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                </button>
            </div>
        </header>

        <div class="flex flex-1 overflow-hidden relative">
            <div v-if="isMobile && mobileMenuOpen" class="fixed inset-0 bg-black/50 z-40" @click="mobileMenuOpen = false"></div>

            <aside 
                :class="[
                    'bg-[rgb(60,0,0)] border-r border-[#c9c9c9]/20 z-40 transition-all duration-300 shrink-0 flex flex-col',
                    isMobile ? 'fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-64' : (sidebarCollapsed ? 'w-16' : 'w-56'),
                    isMobile ? (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
                ]"
            >
                <nav class="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
                    <RouterLink
                        v-for="item in navItems"
                        :key="item.view"
                        :to="item.path"
                        :class="[
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                            currentView === item.view 
                                ? 'bg-white/10 text-red-300' 
                                : 'text-[#c9c9c9] hover:bg-white/5 hover:text-red-300'
                        ]"
                        @click="mobileMenuOpen = false"
                    >
                        <span class="text-xl">{{ item.icon }}</span>
                        <span v-if="!sidebarCollapsed || isMobile" class="font-medium whitespace-nowrap">{{ item.label }}</span>
                    </RouterLink>
                </nav>

                <div v-if="!isMobile" class="p-3 border-t border-white/5">
                    <button
                        @click="sidebarCollapsed = !sidebarCollapsed"
                        class="w-full p-2 text-[#c9c9c9] hover:text-red-300 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
                    >
                        <svg class="w-5 h-5 transition-transform" :class="sidebarCollapsed ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
                        </svg>
                    </button>
                </div>
            </aside>

            <main 
                class="flex-1 overflow-y-auto transition-all duration-300"
            >
                <div class="p-4 md:p-6 lg:p-8">
                    <RouterView />
                </div>
            </main>
        </div>
    </div>
</template>

<style scoped>
</style>
