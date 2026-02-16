import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

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
			path: '/404',
			name: 'not-found',
			component: () => import('../views/HomeView.vue'), // Placeholder
			meta: { title: '404 | 黄诗扶 Wiki' },
		},
		{
			path: '/:pathMatch(.*)*',
			redirect: '/404',
		},
	],
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
