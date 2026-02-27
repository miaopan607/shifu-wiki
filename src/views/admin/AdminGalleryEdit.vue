<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import type { GalleryFormData, GalleryImageWithFile } from '@/types/admin';

// 单个文件上传任务的运行态，用于驱动上传进度和错误重试 UI。
interface UploadTask {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
    imageId?: string;
}

const router = useRouter();
const route = useRoute();

// 通过路由名判断当前页面是“新建”还是“编辑”。
const isNew = computed(() => route.name === 'admin-gallery-new');
// 编辑态下从路由参数提取图集 ID；新建态为空字符串。
const galleryId = computed(() => {
    const id = route.params.id;
    return typeof id === 'string' ? id : '';
});

// 页面和表单全局状态。
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');

// 图集基础信息，默认日期为今天（YYYY-MM-DD）。
const form = ref<GalleryFormData>({
    title: '',
    slug: '',
    description: '',
    published: false,
    date: new Date().toISOString().slice(0, 10),
});

// 图片列表与上传任务状态。
const images = ref<GalleryImageWithFile[]>([]);
const imagesToDelete = ref<string[]>([]);
const uploadTasks = ref<Map<string, UploadTask>>(new Map());
const draggedIndex = ref<number | null>(null);
const dropTargetIndex = ref<number | null>(null);
const isDraggingOver = ref(false);
const dragCounter = ref(0);

const fileInput = ref<HTMLInputElement | null>(null);
const hasChanges = ref(false);

// 只要有 pending/uploading 任务，就认为仍在上传中。
const isUploading = computed(() => {
    return Array.from(uploadTasks.value.values()).some(t => t.status === 'uploading' || t.status === 'pending');
});

// 保存按钮可用条件：标题非空 + 非保存中 + 无上传任务。
const canSave = computed(() => {
    return form.value.title.trim().length > 0 && !saving.value && !isUploading.value;
});

onMounted(async () => {
    // 监听全局拖拽，实现跨区域拖入文件时的遮罩提示。
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    // 编辑态拉取数据；新建态直接进入可编辑状态。
    if (!isNew.value) {
        await fetchGallery();
    } else {
        loading.value = false;
    }
});

// 拉取图集详情和已上传图片列表。
const fetchGallery = async () => {
    if (!galleryId.value) {
        error.value = '图集 ID 无效';
        loading.value = false;
        return;
    }

    loading.value = true;
    try {
        const gallery = await pb.collection('galleries').getOne(galleryId.value);
        console.log('Fetched gallery:', gallery);
        const defaultDate = new Date().toISOString().slice(0, 10);
        const dateStr = gallery.date ? String(gallery.date).slice(0, 10) : defaultDate;
        form.value = {
            title: gallery.title || '',
            slug: gallery.slug || '',
            description: gallery.description || '',
            published: gallery.published || false,
            date: dateStr,
        };

        const imagesResult = await pb.collection('gallery_images').getFullList({
            filter: `gallery = "${galleryId.value}"`,
            sort: 'sort',
        });
        images.value = imagesResult as unknown as GalleryImageWithFile[];
        console.log('Fetched images:', images.value);
        console.log('Image count:', images.value.length);
    } catch (err) {
        console.error('Failed to fetch gallery:', err);
        error.value = '加载图集失败';
    } finally {
        loading.value = false;
    }
};

// 根据标题生成 URL 友好的 slug（保留中文）。
const generateSlug = () => {
    if (!form.value.title) return;
    const slug = form.value.title
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '');
    form.value.slug = slug;
    markChanged();
};

const markChanged = () => {
    hasChanges.value = true;
};

const triggerFileInput = () => {
    fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files) {
        addFiles(Array.from(input.files));
    }
    input.value = '';
};

const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragCounter.value = 0;
    isDraggingOver.value = false;
    
    if (draggedIndex.value === null && event.dataTransfer?.files) {
        addFiles(Array.from(event.dataTransfer.files));
    }
};

const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
};

const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    if (draggedIndex.value === null) {
        dragCounter.value++;
        isDraggingOver.value = true;
    }
};

const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    if (draggedIndex.value === null) {
        dragCounter.value--;
        if (dragCounter.value <= 0) {
            isDraggingOver.value = false;
            dragCounter.value = 0;
        }
    }
};

// 批量添加文件：
// 1) 过滤为图片类型
// 2) 新建态下先创建图集
// 3) 先插入本地临时图片，再并发上传
const addFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;
    
    markChanged();
    
    let targetGalleryId = galleryId.value;

    if (isNew.value) {
        try {
            const created = await pb.collection('galleries').create({
                title: form.value.title.trim() || '未命名图集',
                slug: form.value.slug.trim() || undefined,
                description: form.value.description.trim() || undefined,
                published: false,
                date: form.value.date,
            });
            targetGalleryId = created.id;
            await router.replace(`/admin/galleries/${created.id}`);
        } catch (err) {
            console.error('Failed to create gallery:', err);
            error.value = '创建图集失败，请重试';
            return;
        }
    }
    
    const uploadPromises: Promise<void>[] = [];
    
    for (const file of imageFiles) {
        const taskId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const localUrl = URL.createObjectURL(file);
        
        // 使用当前列表最大 sort 值 + 1，确保不重复且从 1 开始
        const nextSort = images.value.length > 0 
            ? Math.max(...images.value.map(img => img.sort || 0)) + 1 
            : 1;

        const tempImage: GalleryImageWithFile = {
            id: taskId,
            collectionId: '',
            collectionName: 'gallery_images',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            image: file.name,
            gallery: targetGalleryId,
            sort: nextSort,
            file,
            isNew: true,
            localUrl,
        };
        images.value.push(tempImage);
        
        uploadTasks.value.set(taskId, {
            id: taskId,
            file,
            progress: 0,
            status: 'pending',
        });
        
        uploadPromises.push(uploadImage(taskId, file, nextSort, targetGalleryId));
    }
    
    await Promise.allSettled(uploadPromises);
};

// 使用 XMLHttpRequest 以获得可用的上传进度回调。
const uploadImage = async (taskId: string, file: File, sortIndex: number, targetGalleryId: string): Promise<void> => {
    const task = uploadTasks.value.get(taskId);
    if (!task) return;
    
    task.status = 'uploading';
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('gallery', targetGalleryId);
        formData.append('sort', String(sortIndex));
        
        const xhr = new XMLHttpRequest();
        
        await new Promise<void>((resolve, reject) => {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    task.progress = Math.round((event.loaded / event.total) * 100);
                }
            };
            
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        task.imageId = response.id;
                        task.status = 'success';
                        task.progress = 100;
                        
                        const imgIndex = images.value.findIndex(img => img.id === taskId);
                        if (imgIndex !== -1 && images.value[imgIndex]) {
                            images.value[imgIndex]!.id = response.id;
                            images.value[imgIndex]!.isNew = false;
                            images.value[imgIndex]!.image = response.image;
                        }
                        resolve();
                    } catch {
                        task.status = 'error';
                        task.error = '解析响应失败';
                        reject(new Error('Parse error'));
                    }
                } else {
                    task.status = 'error';
                    task.error = `上传失败 (${xhr.status})`;
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            };
            
            xhr.onerror = () => {
                task.status = 'error';
                task.error = '网络错误';
                reject(new Error('Network error'));
            };
            
            xhr.open('POST', `${pb.baseUrl}/api/collections/gallery_images/records`);
            xhr.setRequestHeader('Authorization', pb.authStore.token);
            xhr.send(formData);
        });
    } catch (err) {
        console.error('Upload error:', err);
    }
};

// 上传失败后复用原始 File 和排序位置重新发起任务。
const retryUpload = async (taskId: string) => {
    const task = uploadTasks.value.get(taskId);
    if (!task || task.status === 'uploading') return;
    
    const img = images.value.find(img => img.id === taskId);
    if (!img || !img.file) return;
    
    task.status = 'pending';
    task.progress = 0;
    task.error = undefined;
    
    // 确保重试时使用当前列表位置对应的 1-based 排序
    const sortIndex = images.value.findIndex(i => i.id === taskId);
    const targetGalleryId = img.gallery || galleryId.value;
    await uploadImage(taskId, img.file, sortIndex + 1, targetGalleryId);
};

// 删除图片时区分：
// - 已持久化图片：记录到待删除队列，保存时再真正删除
// - 新上传未持久化图片：仅从本地列表移除
const removeImage = async (index: number) => {
    const img = images.value[index];
    if (!img) return;
    
    const task = uploadTasks.value.get(img.id);
    if (task && task.status === 'uploading') {
        return;
    }
    
    if (!img.isNew && !img.id.startsWith('upload-')) {
        imagesToDelete.value.push(img.id);
    }
    
    if (img.localUrl) {
        URL.revokeObjectURL(img.localUrl);
    }
    
    uploadTasks.value.delete(img.id);
    images.value.splice(index, 1);
    updateSortOrder();
    markChanged();
};

const updateSortOrder = () => {
    images.value.forEach((img, index) => {
        img.sort = index + 1;
    });
};

const handleImageDragStart = (index: number) => {
    draggedIndex.value = index;
};

const handleImageDragOver = (event: DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex.value !== null && draggedIndex.value !== index) {
        dropTargetIndex.value = index;
    }
};

const handleImageDrop = async (event: DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex.value !== null && draggedIndex.value !== index) {
        const draggedImage = images.value[draggedIndex.value];
        if (draggedImage) {
            images.value.splice(draggedIndex.value, 1);
            images.value.splice(index, 0, draggedImage);
            updateSortOrder();
            markChanged();
            
            if (!isNew.value) {
                await updateImageSortOrders();
            }
        }
    }
    draggedIndex.value = null;
    dropTargetIndex.value = null;
};

const handleImageDragEnd = () => {
    draggedIndex.value = null;
    dropTargetIndex.value = null;
};

// 将当前列表顺序同步到后端；逐条更新避免并发冲突导致顺序错乱。
const updateImageSortOrders = async () => {
    for (let i = 0; i < images.value.length; i++) {
        const img = images.value[i];
        if (img && !img.isNew && !img.id.startsWith('upload-')) {
            try {
                await pb.collection('gallery_images').update(img.id, { sort: i + 1 });
            } catch (e) {
                console.warn('Failed to update sort order:', img.id, e);
            }
        }
    }
};

const getImageUrl = (img: GalleryImageWithFile) => {
    if (img.localUrl) return img.localUrl;
    return pb.files.getURL(img, img.image, { thumb: '0x720' });
};

// 保存逻辑：
// - 新建态：创建图集并跳转到编辑页
// - 编辑态：更新图集 + 执行待删除图片 + 刷新数据
const saveGallery = async () => {
    if (!canSave.value) return;

    saving.value = true;
    error.value = '';
    successMessage.value = '';

    try {
        if (isNew.value) {
            const created = await pb.collection('galleries').create({
                title: form.value.title.trim(),
                slug: form.value.slug.trim() || undefined,
                description: form.value.description.trim() || undefined,
                published: form.value.published,
                date: form.value.date,
            });
            successMessage.value = '创建成功！';
            setTimeout(() => {
                router.push(`/admin/galleries/${created.id}`);
            }, 1000);
        } else {
            if (!galleryId.value) {
                throw new Error('Invalid gallery ID');
            }

            await pb.collection('galleries').update(galleryId.value, {
                title: form.value.title.trim(),
                slug: form.value.slug.trim() || undefined,
                description: form.value.description.trim() || undefined,
                published: form.value.published,
                date: form.value.date,
            });

            for (const imageId of imagesToDelete.value) {
                try {
                    await pb.collection('gallery_images').delete(imageId);
                } catch (e) {
                    console.warn('Failed to delete image:', imageId, e);
                }
            }
            imagesToDelete.value = [];

            successMessage.value = '保存成功！';
            await fetchGallery();
        }

        hasChanges.value = false;

        setTimeout(() => {
            successMessage.value = '';
        }, 3000);
    } catch (err) {
        console.error('Failed to save gallery:', err);
        error.value = '保存失败，请重试';
    } finally {
        saving.value = false;
    }
};

// 离开页面前提醒未保存变更或正在上传的任务。
const goBack = () => {
    if (hasChanges.value || isUploading.value) {
        if (!confirm('有未保存的更改或正在上传的图片，确定要离开吗？')) {
            return;
        }
    }
    router.push('/admin/galleries');
};

onUnmounted(() => {
    // 销毁时清理全局事件和本地预览 URL，避免内存泄漏。
    window.removeEventListener('dragenter', handleDragEnter);
    window.removeEventListener('dragleave', handleDragLeave);
    window.removeEventListener('dragover', handleDragOver);
    window.removeEventListener('drop', handleDrop);

    images.value.forEach(img => {
        if (img.localUrl) {
            URL.revokeObjectURL(img.localUrl);
        }
    });
});
</script>

<template>
    <div class="space-y-6">
        <!-- Global Drag Overlay -->
        <Teleport to="body">
            <div 
                v-if="isDraggingOver" 
                class="fixed inset-0 z-9999 bg-black/80 flex items-center justify-center pointer-events-none"
            >
                <div class="text-center p-12 border-4 border-dashed border-red-300 rounded-3xl m-10">
                    <svg class="w-24 h-24 mx-auto text-red-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    <p class="text-4xl text-red-300 font-bold">释放以上传图片到图集</p>
                    <p class="text-xl text-red-300/70 mt-4">支持 JPG, PNG, GIF, WebP 格式</p>
                </div>
            </div>
        </Teleport>

        <div class="flex items-center gap-4">
            <button
                @click="goBack"
                class="p-2 text-[#888] hover:text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
            </button>
            <div class="flex-1">
                <h1 class="text-2xl font-semibold text-[#c9c9c9]">
                    {{ isNew ? '新建图集' : '编辑图集' }}
                </h1>
            </div>
            <button
                @click="saveGallery"
                :disabled="!canSave"
                class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 hover:bg-white/5 disabled:border-[#888]/30 disabled:text-[#888] text-red-300 font-medium rounded-lg transition-colors"
            >
                <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ saving ? '保存中...' : '保存' }}
            </button>
        </div>

        <div v-if="error" class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p class="text-red-300">{{ error }}</p>
        </div>

        <div v-if="successMessage" class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p class="text-green-400">{{ successMessage }}</p>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
        </div>

        <template v-else>
            <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-6 space-y-5">
                <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3">基本信息</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-sm text-[#c9c9c9] mb-1.5">
                            标题 <span class="text-red-300">*</span>
                        </label>
                        <input
                            v-model="form.title"
                            type="text"
                            class="w-full px-4 py-2.5 bg-[rgb(77,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
                            placeholder="请输入图集标题"
                            @input="markChanged"
                        />
                    </div>

                    <div>
                        <label class="block text-sm text-[#c9c9c9] mb-1.5">
                            Slug (URL标识)
                        </label>
                        <div class="flex gap-2">
                            <input
                                v-model="form.slug"
                                type="text"
                                class="flex-1 px-4 py-2.5 bg-[rgb(77,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
                                placeholder="留空则自动生成"
                                @input="markChanged"
                            />
                            <button
                                @click="generateSlug"
                                type="button"
                                class="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-[#c9c9c9]/20 rounded-lg text-[#c9c9c9] transition-colors"
                                title="根据标题自动生成"
                            >
                                生成
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-sm text-[#c9c9c9] mb-1.5">
                        描述
                    </label>
                    <textarea
                        v-model="form.description"
                        rows="3"
                        class="w-full px-4 py-2.5 bg-[rgb(77,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all resize-none"
                        placeholder="图集描述（支持Markdown）"
                        @input="markChanged"
                    />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-sm text-[#c9c9c9] mb-1.5">
                            日期
                        </label>
                        <input
                            v-model="form.date"
                            type="date"
                            class="w-full px-4 py-2.5 bg-[rgb(77,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
                            @input="markChanged"
                        />
                    </div>

                    <div>
                        <label class="block text-sm text-[#c9c9c9] mb-1.5">
                            发布状态
                        </label>
                        <label class="flex items-center gap-3 cursor-pointer">
                            <button
                                type="button"
                                role="switch"
                                :aria-checked="form.published"
                                @click="form.published = !form.published; markChanged()"
                                :class="[
                                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                                    form.published ? 'bg-red-500' : 'bg-[#888]/30'
                                ]"
                            >
                                <span
                                    :class="[
                                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                                        form.published ? 'translate-x-6' : 'translate-x-1'
                                    ]"
                                />
                            </button>
                            <span class="text-[#c9c9c9]">{{ form.published ? '已发布' : '草稿' }}</span>
                        </label>
                    </div>
                </div>
            </div>

            <div 
                class="relative bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 flex flex-col overflow-hidden"
            >
                <div class="relative z-60 bg-[rgb(60,0,0)] flex items-center justify-between border-b border-[#c9c9c9]/20 p-6">
                    <div class="flex items-center gap-4">
                        <h2 class="text-lg font-semibold text-[#c9c9c9]">图片管理</h2>
                        <span class="text-sm text-[#888]">{{ images.length }} 张图片</span>
                        <div v-if="isUploading" class="flex items-center gap-2 text-sm text-yellow-400">
                            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            上传中...
                        </div>
                    </div>
                    <button
                        @click="triggerFileInput"
                        class="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-[#c9c9c9]/20 rounded-lg text-sm text-[#c9c9c9] transition-colors group"
                    >
                        <svg class="w-4 h-4 text-[#888] group-hover:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        添加图片
                    </button>
                </div>

                <div class="p-6">
                    <input
                        ref="fileInput"
                        type="file"
                        multiple
                        accept="image/*"
                        class="hidden"
                        @change="handleFileSelect"
                    />

                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <div
                            v-for="(img, index) in images"
                            :key="img.id"
                            draggable="true"
                            @dragstart="handleImageDragStart(index)"
                            @dragover="handleImageDragOver($event, index)"
                            @drop="handleImageDrop($event, index)"
                            @dragend="handleImageDragEnd"
                            :class="[
                                'group relative aspect-square rounded-lg overflow-hidden bg-[rgb(77,0,0)] cursor-move',
                                dropTargetIndex === index ? 'ring-2 ring-red-300' : ''
                            ]"
                        >
                            <img
                                :src="getImageUrl(img)"
                                :alt="`Image ${index + 1}`"
                                class="w-full h-full object-cover"
                                :class="{ 'opacity-50': uploadTasks.get(img.id)?.status === 'uploading' || uploadTasks.get(img.id)?.status === 'error' }"
                            />
                            
                            <div v-if="uploadTasks.has(img.id)" class="absolute inset-0 flex items-center justify-center bg-black/40">
                                <div v-if="uploadTasks.get(img.id)?.status === 'uploading'" class="w-full px-2">
                                    <div class="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            class="h-full bg-red-300 transition-all duration-300"
                                            :style="{ width: `${uploadTasks.get(img.id)?.progress || 0}%` }"
                                        />
                                    </div>
                                    <p class="text-xs text-white text-center mt-1">{{ uploadTasks.get(img.id)?.progress }}%</p>
                                </div>
                                <button
                                    v-else-if="uploadTasks.get(img.id)?.status === 'error'"
                                    @click.stop="retryUpload(img.id)"
                                    class="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                                    title="重试"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v16m16-16v16M4 4l16 16M20 4L4 20"/>
                                    </svg>
                                </button>
                                <svg v-else-if="uploadTasks.get(img.id)?.status === 'success'" class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            </div>

                            <div v-else class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    @click.stop="removeImage(index)"
                                    class="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                                    title="删除"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>

                            <div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                                {{ index + 1 }}
                            </div>
                        </div>

                        <!-- Grid End Upload Button -->
                        <div
                            @click="triggerFileInput"
                            class="aspect-square rounded-lg border-2 border-dashed border-[#c9c9c9]/30 hover:border-red-300/50 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all group"
                        >
                            <svg class="w-8 h-8 text-[#888] group-hover:text-red-300 mb-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            <span class="text-sm text-[#888] group-hover:text-red-300 transition-colors">添加图片</span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
.animate-spin {
    animation: spin 1s linear infinite;
}
</style>
