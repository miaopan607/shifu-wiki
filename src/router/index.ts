import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import { pb } from '@/lib/pocketbase';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: HomeView,
			meta: { title: '黄诗扶 Wiki' },
		},
		{
			path: '/songs',
			name: 'songs',
			component: () => import('../views/SongsView.vue'),
			meta: { title: '音乐 | 黄诗扶 Wiki' },
		},
		{
			path: '/albums',
			name: 'albums',
			component: () => import('../views/AlbumsView.vue'),
			meta: { title: '专辑 | 黄诗扶 Wiki' },
		},
		{
			path: '/songs/:slug',
			name: 'song-detail',
			component: () => import('../views/SongDetailView.vue'),
			meta: { title: '加载中... | 黄诗扶 Wiki' },
		},
		{
			path: '/albums/:title',
			name: 'album-detail',
			component: () => import('../views/AlbumDetailView.vue'),
			meta: { title: '专辑详情 | 黄诗扶 Wiki' },
		},
		{
			path: '/activities',
			name: 'activities',
			component: () => import('../views/ActivitiesView.vue'),
			meta: { title: '活动 | 黄诗扶 Wiki' },
		},
		{
			path: '/activities/:slug',
			name: 'activity-detail',
			component: () => import('../views/ActivityDetailView.vue'),
			meta: { title: '加载中... | 黄诗扶 Wiki' },
		},
		{
			path: '/galleries',
			name: 'galleries',
			component: () => import('../views/GalleriesView.vue'),
			meta: { title: '图集 | 黄诗扶 Wiki' },
		},
		{
			path: '/galleries/:slug',
			name: 'gallery-detail',
			component: () => import('../views/GalleryDetailView.vue'),
			meta: { title: '加载中... | 黄诗扶 Wiki' },
		},
		{
			path: '/misc',
			name: 'misc',
			component: () => import('../views/MiscView.vue'),
			meta: { title: '杂记 | 黄诗扶 Wiki' },
		},
		{
			path: '/profile',
			name: 'profile',
			component: () => import('../views/ProfileView.vue'),
			meta: { title: '个人介绍 | 黄诗扶 Wiki' },
		},
		{
			path: '/about',
			name: 'about',
			component: () => import('../views/AboutView.vue'),
			meta: { title: '关于 | 黄诗扶 Wiki' },
		},
		{
			path: '/misc/:slug',
			name: 'misc-detail',
			component: () => import('../views/MiscDetailView.vue'),
			meta: { title: '加载中... | 黄诗扶 Wiki' },
		},
		{
			path: '/admin/login',
			name: 'admin-login',
			component: () => import('../views/admin/AdminLogin.vue'),
			meta: { title: '登录 | 管理后台', public: true },
		},
		{
			path: '/admin',
			component: () => import('../views/admin/AdminLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'admin-dashboard',
					component: () => import('../views/admin/AdminDashboard.vue'),
					meta: { title: '仪表盘 | 管理后台' },
				},
				{
					path: 'galleries',
					name: 'admin-galleries',
					component: () => import('../views/admin/AdminGalleries.vue'),
					meta: { title: '图集管理 | 管理后台' },
				},
				{
					path: 'galleries/new',
					name: 'admin-gallery-new',
					component: () => import('../views/admin/AdminGalleryEdit.vue'),
					meta: { title: '新建图集 | 管理后台' },
				},
				{
					path: 'galleries/:id',
					name: 'admin-gallery-edit',
					component: () => import('../views/admin/AdminGalleryEdit.vue'),
					meta: { title: '编辑图集 | 管理后台' },
				},
				{
					path: 'songs',
					name: 'admin-songs',
					component: () => import('../views/admin/AdminSongs.vue'),
					meta: { title: '音乐管理 | 管理后台' },
				},
				{
					path: 'songs/new',
					name: 'admin-song-new',
					component: () => import('../views/admin/AdminSongEdit.vue'),
					meta: { title: '新建音乐 | 管理后台' },
				},
				{
					path: 'songs/:id',
					name: 'admin-song-edit',
					component: () => import('../views/admin/AdminSongEdit.vue'),
					meta: { title: '编辑音乐 | 管理后台' },
				},
				{
					path: 'albums',
					name: 'admin-albums',
					component: () => import('../views/admin/AdminAlbums.vue'),
					meta: { title: '专辑管理 | 管理后台' },
				},
				{
					path: 'albums/new',
					name: 'admin-album-new',
					component: () => import('../views/admin/AdminAlbumEdit.vue'),
					meta: { title: '新建专辑 | 管理后台' },
				},
				{
					path: 'albums/:id',
					name: 'admin-album-edit',
					component: () => import('../views/admin/AdminAlbumEdit.vue'),
					meta: { title: '编辑专辑 | 管理后台' },
				},
				{
					path: 'activities',
					name: 'admin-activities',
					component: () => import('../views/admin/AdminActivities.vue'),
					meta: { title: '活动管理 | 管理后台' },
				},
				{
					path: 'activities/new',
					name: 'admin-activity-new',
					component: () => import('../views/admin/AdminActivityEdit.vue'),
					meta: { title: '新建活动 | 管理后台' },
				},
				{
					path: 'activities/:id',
					name: 'admin-activity-edit',
					component: () => import('../views/admin/AdminActivityEdit.vue'),
					meta: { title: '编辑活动 | 管理后台' },
				},
				{
					path: 'misc',
					name: 'admin-misc',
					component: () => import('../views/admin/AdminMisc.vue'),
					meta: { title: '杂记管理 | 管理后台' },
				},
				{
					path: 'misc/new',
					name: 'admin-misc-new',
					component: () => import('../views/admin/AdminMiscEdit.vue'),
					meta: { title: '新建杂记 | 管理后台' },
				},
				{
					path: 'misc/:id',
					name: 'admin-misc-edit',
					component: () => import('../views/admin/AdminMiscEdit.vue'),
					meta: { title: '编辑杂记 | 管理后台' },
				},
				{
					path: 'settings',
					name: 'admin-settings',
					component: () => import('../views/admin/AdminSettings.vue'),
					meta: { title: '站点配置 | 管理后台' },
				},
			],
		},
		{
			path: '/404',
			name: 'not-found',
			component: () => import('../views/NotFoundView.vue'),
			meta: { title: '404 | 黄诗扶 Wiki' },
		},
		{
			path: '/:pathMatch(.*)*',
			redirect: '/404',
		},
	],
});

router.beforeEach((to, _from, next) => {
	if (to.meta.requiresAuth && !pb.authStore.isValid) {
		next({
			path: '/admin/login',
			query: { redirect: to.fullPath },
		});
	} else if (to.path === '/admin/login' && pb.authStore.isValid) {
		next('/admin');
	} else {
		next();
	}
});

router.afterEach((to) => {
	const baseTitle = '黄诗扶 Wiki';
	if (to.meta.title) {
		document.title = to.meta.title as string;
	} else {
		document.title = baseTitle;
	}
});

export default router;
