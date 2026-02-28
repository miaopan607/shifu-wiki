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
    if (path.includes('/admin/settings')) return 'settings';
    return 'dashboard';
});

const navItems: { view: AdminView; label: string; icon: string; path: string }[] = [
    { view: 'dashboard', label: '仪表盘', icon: '📊', path: '/admin' },
    { view: 'songs', label: '音乐管理', icon: '🎵', path: '/admin/songs' },
    { view: 'albums', label: '专辑管理', icon: '💿', path: '/admin/albums' },
    { view: 'activities', label: '活动管理', icon: '🗓️', path: '/admin/activities' },
    { view: 'galleries', label: '图集管理', icon: '🖼️', path: '/admin/galleries' },
    { view: 'misc', label: '杂记管理', icon: '📝', path: '/admin/misc' },
    { view: 'settings', label: '站点配置', icon: '⚙️', path: '/admin/settings' },
];

const checkMobile = () => {
    isMobile.value = window.innerWidth < 768;
    if (!isMobile.value) {
        mobileMenuOpen.value = false;
    }
};

onMounted(() => {
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
    window.removeEventListener('resize', checkMobile);
});

const handleLogout = async () => {
    pb.authStore.clear();
    router.push('/admin/login');
};

const navigateTo = (path: string) => {
    router.push(path);
    mobileMenuOpen.value = false;
};
</script>

<template>
    <div class="admin-layout min-h-screen bg-[rgb(77,0,0)] font-serif">
        <header class="fixed top-0 left-0 right-0 h-14 bg-[rgb(60,0,0)] border-b border-[#c9c9c9]/20 flex items-center justify-between px-4 md:px-6 z-50">
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

        <div v-if="isMobile && mobileMenuOpen" class="fixed inset-0 bg-black/50 z-40" @click="mobileMenuOpen = false"></div>

        <aside 
            :class="[
                'fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[rgb(60,0,0)] border-r border-[#c9c9c9]/20 z-40 transition-transform duration-300',
                isMobile ? 'w-64' : (sidebarCollapsed ? 'w-16' : 'w-56'),
                isMobile ? (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
            ]"
        >
            <nav class="p-3 space-y-1">
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
                    <span v-if="!sidebarCollapsed || isMobile" class="font-medium">{{ item.label }}</span>
                </RouterLink>
            </nav>

            <div v-if="!isMobile" class="absolute bottom-4 left-0 right-0 px-3">
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
            :class="[
                'transition-all duration-300 pt-14',
                isMobile ? 'pl-0' : (sidebarCollapsed ? 'pl-16' : 'pl-56')
            ]"
        >
            <div class="p-4 md:p-6 lg:p-8">
                <RouterView />
            </div>
        </main>
    </div>
</template>

<style scoped>
.admin-layout {
    min-height: 100vh;
}
</style>
