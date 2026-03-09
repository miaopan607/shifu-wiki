import type { Gallery, GalleryImage } from './index';

export interface AdminUser {
	id: string;
	collectionId: string;
	collectionName: string;
	username: string;
	verified: boolean;
	emailVisibility: boolean;
	email: string;
	created: string;
	updated: string;
	avatar?: string;
	name?: string;
	skipSingleLockDeleteConfirm?: boolean;
}

export interface AuthState {
	isAuthenticated: boolean;
	user: AdminUser | null;
	loading: boolean;
}

export interface GalleryFormData {
	title: string;
	slug: string;
	description: string;
	published: boolean;
	date: string;
}

export interface GalleryImageWithFile extends GalleryImage {
	file?: File;
	isNew?: boolean;
	localUrl?: string;
	uploadTaskFileId?: string;
}

export interface UploadProgress {
	total: number;
	loaded: number;
	percentage: number;
}

export interface AdminGallery extends Gallery {
	imageCount?: number;
	images?: GalleryImage[];
}

export type AdminView = 'dashboard' | 'galleries' | 'songs' | 'albums' | 'activities' | 'misc' | 'profile' | 'locks' | 'settings';
