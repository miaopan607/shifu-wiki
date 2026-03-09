<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import AppIcon from '@/components/AppIcon.vue';
import GlobalUploadPanel from '@/components/GlobalUploadPanel.vue';
import { uploadStore } from '@/stores/uploadStore';
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
	if (path.includes('/admin/locks')) return 'locks';
	if (path.includes('/admin/settings')) return 'settings';
	return 'dashboard';
});

type IconName = 'dashboard' | 'songs' | 'albums' | 'activities' | 'galleries' | 'misc' | 'locks' | 'profile' | 'settings';

const navItems: { view: AdminView; label: string; icon: IconName; path: string }[] = [
	{ view: 'dashboard', label: '仪表盘', icon: 'dashboard', path: '/admin' },
	{ view: 'songs', label: '音乐管理', icon: 'songs', path: '/admin/songs' },
	{ view: 'albums', label: '专辑管理', icon: 'albums', path: '/admin/albums' },
	{ view: 'activities', label: '活动管理', icon: 'activities', path: '/admin/activities' },
	{ view: 'galleries', label: '图集管理', icon: 'galleries', path: '/admin/galleries' },
	{ view: 'misc', label: '杂记管理', icon: 'misc', path: '/admin/misc' },
	{ view: 'profile', label: '个人介绍', icon: 'profile', path: '/admin/profile' },
	{ view: 'locks', label: '锁管理', icon: 'locks', path: '/admin/locks' },
	{ view: 'settings', label: '设置', icon: 'settings', path: '/admin/settings' },
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
	if (uploadStore.hasBlockingTasks.value) {
		uploadStore.showPanel();
		alert('仍有未完成的上传任务，请等待完成或先在上传面板中取消后再退出。');
		return;
	}
	pb.authStore.clear();
	router.push('/admin/login');
};

// 上传任务按钮
const uploadTaskCount = computed(() => uploadStore.tasks.value.filter((task) => task.status === 'uploading' || task.status === 'paused').length);
const toggleUploadPanel = () => {
	uploadStore.togglePanel();
};

const handleAdminBeforeUnload = (event: BeforeUnloadEvent) => {
	if (!uploadStore.hasBlockingTasks.value) return;
	event.preventDefault();
	event.returnValue = '';
	return '';
};

onMounted(() => {
	window.addEventListener('beforeunload', handleAdminBeforeUnload);
});

onUnmounted(() => {
	window.removeEventListener('beforeunload', handleAdminBeforeUnload);
});
</script>

<template>
	<div class="admin-layout h-screen flex flex-col overflow-hidden bg-[rgb(77,0,0)] font-serif">
		<header class="h-14 bg-[rgb(60,0,0)] border-b border-[#c9c9c9]/20 flex items-center justify-between px-4 md:px-6 z-50 shrink-0">
			<div class="flex items-center gap-4">
				<button v-if="isMobile" @click="mobileMenuOpen = !mobileMenuOpen" class="p-2 hover:bg-white/10 rounded-lg text-[#c9c9c9]">
					<AppIcon name="menu" class-name="w-6 h-6" />
				</button>
				<RouterLink to="/admin" class="text-lg font-semibold text-red-300 hover:text-[#fca5a5] transition-colors"> 管理后台 </RouterLink>
				<RouterLink
					to="/"
					class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-base text-[#c9c9c9] bg-white/5 hover:text-red-300 hover:bg-white/10 transition-colors"
					title="返回主页"
				>
					<AppIcon name="home" class-name="w-5 h-5" />
					<span class="hidden md:inline">返回主页</span>
				</RouterLink>
			</div>

			<div class="flex items-center gap-3">
				<div class="text-sm text-[#c9c9c9]">
					{{ user?.username || '' }}
				</div>
				<button
					@click="toggleUploadPanel"
					class="relative flex items-center gap-2 px-2 md:px-3 py-1.5 bg-red-300/10 text-red-300 rounded-lg hover:bg-red-300/20 transition-colors"
					title="查看任务列表"
				>
					<AppIcon name="upload" class-name="w-5 h-5" />
					<span class="hidden md:inline text-sm">任务列表</span>
					<span v-if="uploadTaskCount > 0" class="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-300 text-[rgb(77,0,0)] text-xs font-semibold px-1">
						{{ uploadTaskCount }}
					</span>
				</button>
				<button @click="handleLogout" class="p-2 hover:bg-white/10 rounded-lg text-[#c9c9c9] hover:text-red-300 transition-colors" title="退出登录">
					<AppIcon name="logout-alt" class-name="w-5 h-5" />
				</button>
			</div>
		</header>

		<div class="flex flex-1 overflow-hidden relative">
			<div v-if="isMobile && mobileMenuOpen" class="fixed inset-0 bg-black/50 z-40" @click="mobileMenuOpen = false"></div>

			<aside
				:class="[
					'bg-[rgb(60,0,0)] border-r border-[#c9c9c9]/20 z-40 transition-all duration-300 shrink-0 flex flex-col',
					isMobile ? 'fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-64' : sidebarCollapsed ? 'w-16' : 'w-56',
					isMobile ? (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0',
				]"
			>
				<nav class="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
					<RouterLink
						v-for="item in navItems"
						:key="item.view"
						:to="item.path"
						:class="[
							'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
							currentView === item.view ? 'bg-white/10 text-red-300' : 'text-[#c9c9c9] hover:bg-white/5 hover:text-red-300',
						]"
						@click="mobileMenuOpen = false"
					>
						<AppIcon :name="item.icon" class-name="w-5 h-5 shrink-0" />
						<span v-if="!sidebarCollapsed || isMobile" class="font-medium whitespace-nowrap">{{ item.label }}</span>
					</RouterLink>
				</nav>

				<div v-if="!isMobile" class="p-3 border-t border-white/5">
					<button
						@click="sidebarCollapsed = !sidebarCollapsed"
						class="w-full p-2 text-[#c9c9c9] hover:text-red-300 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
					>
						<AppIcon name="chevron-double-left" :class-name="sidebarCollapsed ? 'w-5 h-5 rotate-180' : 'w-5 h-5'" />
					</button>
				</div>
			</aside>

			<main class="flex-1 overflow-y-auto transition-all duration-300">
				<div class="p-4 md:p-6 lg:p-8">
					<RouterView />
				</div>
			</main>
		</div>

		<!-- 全局上传进度面板 -->
		<GlobalUploadPanel />
	</div>
</template>

<style scoped></style>
