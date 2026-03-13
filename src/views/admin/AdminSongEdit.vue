<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import {
    pb,
    decodeSongLinkNames,
    encodeSongLinkNames,
    parseDateFromBackend,
    normalizeDateForStorage,
  } from '@/lib/pocketbase';
  import { useEditLock } from '@/composables/useEditLock';
  import { useDisplayAlbum } from '@/composables/useDisplayAlbum';
  import { useLinkedAlbums } from '@/composables/useLinkedAlbums';
  import { uploadStore } from '@/stores/uploadStore';
  import EditLockConflictDialog from '@/components/EditLockConflictDialog.vue';
  import EditLockWarning from '@/components/EditLockWarning.vue';
  import VersionConflictDialog from '@/components/VersionConflictDialog.vue';
  import AdminInput from '@/components/AdminInput.vue';
  import AppIcon from '@/components/AppIcon.vue';
  import type { Song } from '@/types';
  import type { SongCoverWithFile } from '@/types/admin';
  import type { BatchUploadTask } from '@/types/upload';

  const route = useRoute();
  const router = useRouter();
  const isEdit = ref(route.params.id !== undefined);
  const loading = ref(false);
  const saving = ref(false);
  const datePicker = ref<HTMLInputElement | null>(null);
  const titleError = ref('');
  const artistError = ref('');
  const error = ref('');
  let isDisposed = false;
  const showVersionConflictDialog = ref(false);
  const latestConflictUpdated = ref<string | null>(null);
  let versionConflictResolver: ((force: boolean) => void) | null = null;

  const originalUpdated = ref<string | null>(null);
  const currentBatchTask = ref<BatchUploadTask | null>(null);

  // 使用编辑锁 Composable
  const editLock = useEditLock({
    collection: 'songs',
    recordId: computed(() => (route.params.id as string) || null),
    isEdit,
  });

  const song = ref<Partial<Song>>({
    title: '',
    artist: [],
    releaseDate: '',
    lyricist: [],
    composer: [],
    lyrics: '',
    credits: '',
    description: '',
    defaultAlbum: '',
    defaultAlbumName: '',
    defaultCover: '',
    links: [
      { name: '网易云音乐', url: '' },
      { name: '酷狗音乐', url: '' },
      { name: 'QQ 音乐', url: '' },
      { name: '酷我音乐', url: '' },
    ],
    otherLinks: [],
    qqId: '',
    neteaseId: '',
    enabledPlatform: '',
  });

  // === 变更追踪 ===
  const hasChanges = ref(false);
  const markChanged = () => {
    hasChanges.value = true;
  };

  // === 清除默认封面 ===
  const clearDefaultCover = () => {
    song.value.defaultCover = '';
    markChanged();
  };

  // === 展示专辑 Composable ===
  const displayAlbum = useDisplayAlbum({
    defaultAlbum: computed({
      get: () => song.value.defaultAlbum || '',
      set: val => (song.value.defaultAlbum = val),
    }),
    defaultAlbumName: computed({
      get: () => song.value.defaultAlbumName || '',
      set: val => (song.value.defaultAlbumName = val),
    }),
    onChanged: () => markChanged(),
  });

  // === 关联专辑 Composable ===
  const linkedAlbums = useLinkedAlbums({
    onChanged: () => markChanged(),
  });

  // === 默认封面 ===
  const defaultCoverOptions = computed(() => {
    const options: { value: string; label: string; url: string }[] = [
      { value: '', label: '不展示封面（缺省封面）', url: '' },
    ];
    // 专辑封面选项
    linkedAlbums.allLinkedAlbums.value.forEach(album => {
      if (album.cover) {
        const url = pb.files.getURL(album, album.cover, { thumb: '400x400' });
        options.push({
          value: `album_cover:${album.id}`,
          label: `专辑封面 (${album.title})`,
          url,
        });
      }
    });
    // 自有封面选项
    for (const cover of covers.value) {
      if (cover.id.startsWith('pending-')) continue;
      const url = getCoverUrl(cover);
      options.push({ value: `song_cover:${cover.id}`, label: `自有封面 #${covers.value.indexOf(cover) + 1}`, url });
    }
    return options;
  });

  const setDefaultCoverSource = (value: string) => {
    song.value.defaultCover = value;
    markChanged();
  };

  // === 封面管理 ===
  const covers = ref<SongCoverWithFile[]>([]);
  const coversToDelete = ref<string[]>([]);
  const fileInput = ref<HTMLInputElement | null>(null);

  const hasUnsavedFiles = computed(() => currentBatchTask.value !== null);

  const getCoverUrl = (cover: SongCoverWithFile, thumb = true) => {
    if (cover.localUrl) return cover.localUrl;
    if (cover.image && cover.collectionId) {
      return pb.files.getURL(cover, cover.image, thumb ? { thumb: '400x400' } : undefined);
    }
    return '';
  };

  // 获取默认封面URL（用于预览区域）
  const defaultCoverPreviewUrl = computed(() => {
    if (!song.value.defaultCover) return '';

    // 专辑封面
    if (song.value.defaultCover.startsWith('album_cover:')) {
      const albumId = song.value.defaultCover.replace('album_cover:', '');
      const album = linkedAlbums.allLinkedAlbums.value.find(a => a.id === albumId);
      if (album?.cover) {
        return pb.files.getURL(album, album.cover, { thumb: '400x400' });
      }
    }

    // 自有封面
    if (song.value.defaultCover?.startsWith('song_cover:')) {
      const coverId = song.value.defaultCover.replace('song_cover:', '');
      const cover = covers.value.find(c => c.id === coverId);
      if (cover) return getCoverUrl(cover);
    }
    return '';
  });

  // 检查封面是否是默认封面
  const isDefaultCover = (cover: SongCoverWithFile) => {
    if (song.value.defaultCover?.startsWith('song_cover:')) {
      const coverId = song.value.defaultCover.replace('song_cover:', '');
      return cover.id === coverId;
    }
    return false;
  };

  // 检查专辑是否是默认封面
  const isDefaultAlbumCover = (albumId: string) => {
    return song.value.defaultCover === `album_cover:${albumId}`;
  };

  // 设置默认封面
  const setDefaultCover = (coverId: string) => {
    song.value.defaultCover = `song_cover:${coverId}`;
    markChanged();
  };

  // 设置专辑封面为默认
  const setAlbumCoverAsDefault = (albumId: string) => {
    song.value.defaultCover = `album_cover:${albumId}`;
    markChanged();
  };

  // 拖放相关
  const isDraggingOver = ref(false);
  const dragCounter = ref(0);

  const isFileDragEvent = (e: DragEvent): boolean => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  };

  const handleDragOver = (e: DragEvent) => {
    if (isFileDragEvent(e)) {
      e.preventDefault();
    }
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (!isFileDragEvent(e)) return;

    dragCounter.value++;
    if (dragCounter.value === 1) {
      isDraggingOver.value = true;
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if (!isFileDragEvent(e)) return;

    dragCounter.value--;
    if (dragCounter.value === 0) {
      isDraggingOver.value = false;
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.value = 0;
    isDraggingOver.value = false;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      addCoverFiles(Array.from(files));
    }
  };

  const handoffEditLockToTask = async (task: BatchUploadTask, targetId: string) => {
    let lockId = editLock.currentLockId.value;

    if (!lockId) {
      const result = await editLock.createEditLock();
      if (!result) {
        throw new Error('无法为后台上传创建编辑锁');
      }
      lockId = editLock.currentLockId.value;
    }

    if (lockId) {
      uploadStore.attachTaskLock(task.id, lockId, 'songs');
      editLock.currentLockId.value = null;
    }
  };

  // === 加载 ===
  onMounted(async () => {
    if (isEdit.value) {
      loading.value = true;
      try {
        const record = await pb.collection('songs').getOne(route.params.id as string);
        originalUpdated.value = record.updated;
        const decodedRecord = decodeSongLinkNames(record as Song);
        song.value = {
          ...decodedRecord,
          releaseDate: decodedRecord.releaseDate ? parseDateFromBackend(decodedRecord.releaseDate) : '',
          artist: Array.isArray(decodedRecord.artist)
            ? decodedRecord.artist
            : decodedRecord.artist
              ? [decodedRecord.artist]
              : [],
          lyricist: Array.isArray(decodedRecord.lyricist)
            ? decodedRecord.lyricist
            : decodedRecord.lyricist
              ? [decodedRecord.lyricist]
              : [],
          composer: Array.isArray(decodedRecord.composer)
            ? decodedRecord.composer
            : decodedRecord.composer
              ? [decodedRecord.composer]
              : [],
          links: Array.isArray(decodedRecord.links) ? decodedRecord.links : song.value.links,
          otherLinks: Array.isArray(decodedRecord.otherLinks) ? decodedRecord.otherLinks : [],
        } as unknown as Song;

        // 加载封面
        const coversRes = await pb.collection('song_covers').getFullList({
          filter: `song = "${route.params.id}"`,
          sort: 'sort',
        });
        covers.value = coversRes.map(c => ({
          ...c,
          collectionId: c.collectionId || '',
          collectionName: c.collectionName || 'song_covers',
          created: c.created,
          updated: c.updated,
          id: c.id,
          image: c.image,
          song: c.song,
          sort: c.sort,
        })) as SongCoverWithFile[];

        // 初始化展示专辑
        await displayAlbum.initDisplayAlbum();

        // 加载关联的全部专辑
        await linkedAlbums.loadAllLinkedAlbums(route.params.id as string);
      } catch (err) {
        console.error('Failed to fetch song:', err);
        alert('获取音乐详情失败');
        router.push('/admin/songs');
      } finally {
        loading.value = false;
        if (!error.value) {
          window.setTimeout(() => {
            void editLock.createEditLock();
          }, 0);
        }
      }
    }
  });

  // === 封面操作 ===
  const addCoverFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    markChanged();

    const nextSort = covers.value.length > 0 ? Math.max(...covers.value.map(c => c.sort || 0)) + 1 : 1;

    const filesToUpload: File[] = [];
    const sorts: number[] = [];
    const clientIds: string[] = [];
    const pendingCovers: SongCoverWithFile[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]!;
      const id = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const localUrl = URL.createObjectURL(file);
      const sort = nextSort + i;

      const tempCover: SongCoverWithFile = {
        id,
        collectionId: '',
        collectionName: 'song_covers',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        image: file.name,
        song: (route.params.id as string) || '',
        sort,
        file,
        isNew: true,
        localUrl,
      };
      covers.value.push(tempCover);
      pendingCovers.push(tempCover);

      filesToUpload.push(file);
      sorts.push(sort);
      clientIds.push(id);
    }

    if (currentBatchTask.value) {
      const appendedFiles = uploadStore.appendFilesToTask(currentBatchTask.value.id, {
        files: filesToUpload,
        sorts,
        clientIds,
      });
      pendingCovers.forEach((cover, index) => {
        cover.uploadTaskFileId = appendedFiles[index]?.id;
      });
      return;
    }

    currentBatchTask.value = uploadStore.addBatchTask({
      type: 'song_covers',
      targetId: (route.params.id as string) || 'new',
      targetType: 'song',
      targetName: song.value.title || '新建音乐',
      files: filesToUpload,
      sorts,
      clientIds,
    });

    pendingCovers.forEach((cover, index) => {
      cover.uploadTaskFileId = currentBatchTask.value?.files[index]?.id;
    });
  };

  const handleCoverFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      addCoverFiles(Array.from(target.files));
      target.value = '';
    }
  };

  const removeCover = (index: number) => {
    const cover = covers.value[index];
    if (!cover) return;

    if (cover.localUrl) {
      URL.revokeObjectURL(cover.localUrl);
    }

    if (cover.id.startsWith('pending-')) {
      covers.value.splice(index, 1);
      if (currentBatchTask.value && cover.uploadTaskFileId) {
        uploadStore.removeFileFromTask(currentBatchTask.value.id, cover.uploadTaskFileId);
        const taskStillExists = uploadStore.tasks.value.some(task => task.id === currentBatchTask.value?.id);
        if (!taskStillExists) {
          currentBatchTask.value = null;
        }
      }
    } else if (!cover.isNew) {
      coversToDelete.value.push(cover.id);
      covers.value.splice(index, 1);
    }

    markChanged();
  };

  // === 链接管理 ===
  const presetPlatforms = ['网易云音乐', '酷狗音乐', 'QQ 音乐', '酷我音乐', '哔哩哔哩'];

  const showPlatformDropdown = ref<number | null>(null);

  const selectPlatform = (index: number, platform: string) => {
    if (song.value.links && song.value.links[index]) {
      song.value.links[index].name = platform;
    }
    showPlatformDropdown.value = null;
    markChanged();
  };

  const togglePlatformDropdown = (index: number) => {
    showPlatformDropdown.value = showPlatformDropdown.value === index ? null : index;
  };

  const closePlatformDropdown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.platform-select-container')) {
      showPlatformDropdown.value = null;
    }
  };

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

  // === 版本冲突 ===
  const latestEditPath = computed(() => {
    if (!isEdit.value) {
      return router.resolve({ name: 'admin-song-new' }).href;
    }
    return router.resolve({ name: 'admin-song-edit', params: { id: route.params.id as string } }).href;
  });

  const requestVersionConflictResolution = (latestUpdated?: string | null): Promise<boolean> => {
    latestConflictUpdated.value = latestUpdated || null;
    showVersionConflictDialog.value = true;
    return new Promise(resolve => {
      versionConflictResolver = resolve;
    });
  };

  const resolveVersionConflict = (force: boolean) => {
    showVersionConflictDialog.value = false;
    const resolver = versionConflictResolver;
    versionConflictResolver = null;
    resolver?.(force);
  };

  const checkVersionConflict = async (): Promise<{ hasConflict: boolean; currentUpdated?: string }> => {
    if (!isEdit.value || !originalUpdated.value) return { hasConflict: false };
    try {
      const current = await pb.collection('songs').getOne(route.params.id as string);
      if (current.updated !== originalUpdated.value) {
        return { hasConflict: true, currentUpdated: current.updated };
      }
      return { hasConflict: false };
    } catch (err) {
      console.error('Failed to check version:', err);
      return { hasConflict: false };
    }
  };

  // === 保存 ===
  // === 标签输入处理 ===
  const artistInput = ref('');
  const lyricistInput = ref('');
  const composerInput = ref('');

  const addTag = (field: 'artist' | 'lyricist' | 'composer') => {
    const inputRef = field === 'artist' ? artistInput : field === 'lyricist' ? lyricistInput : composerInput;
    const tag = inputRef.value.trim();
    if (tag && !song.value[field]?.includes(tag)) {
      song.value[field] = [...(song.value[field] || []), tag];
      inputRef.value = '';
      markChanged();
    }
  };

  const removeTag = (field: 'artist' | 'lyricist' | 'composer', tag: string) => {
    song.value[field] = song.value[field]?.filter(t => t !== tag);
    markChanged();
  };

  const saveSong = async () => {
    titleError.value = '';
    artistError.value = '';
    error.value = '';

    const normalizedTitle = song.value.title?.trim() || '';

    if (!normalizedTitle) {
      titleError.value = '标题不能为空';
    }
    if (!song.value.artist || song.value.artist.length === 0) {
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
      // 1. 编辑锁检查
      if (isEdit.value) {
        const lockMessage = await editLock.checkEditLock();
        if (lockMessage) {
          saving.value = false;
          const shouldForce = await editLock.requestEditLockConflictResolution(lockMessage);
          if (!shouldForce) return;
          const took = await editLock.forceTakeoverEditLock();
          if (!took) return;
          saving.value = true;
        }
        const hasLock = await editLock.ensureEditLock();
        if (!hasLock) {
          saving.value = false;
          const shouldForce = await editLock.requestEditLockConflictResolution(editLock.lockWarning.value);
          if (!shouldForce) return;
          const took = await editLock.forceTakeoverEditLock();
          if (!took) return;
          saving.value = true;
        }

        // 2. 版本冲突检查
        const { hasConflict, currentUpdated } = await checkVersionConflict();
        if (hasConflict) {
          saving.value = false;
          const shouldForce = await requestVersionConflictResolution(currentUpdated);
          if (!shouldForce) return;
          saving.value = true;
        }
      }

      // 3. 删除标记删除的封面
      await Promise.allSettled(coversToDelete.value.map(id => pb.collection('song_covers').delete(id)));
      coversToDelete.value = [];

      // 4. 更新已有封面
      const existingCovers = covers.value.filter(c => !c.id.startsWith('pending-') && !c.isNew);
      await Promise.allSettled(
        existingCovers.map((cover, index) =>
          pb.collection('song_covers').update(cover.id, {
            sort: index + 1,
          })
        )
      );

      // 5. 保存歌曲
      let index = song.value.index;
      if (!isEdit.value) {
        const maxIndexResult = await pb.collection('songs').getList(1, 1, {
          sort: '-index',
          fields: 'index',
        });
        index = maxIndexResult.items.length > 0 ? ((maxIndexResult.items[0] as any).index as number) + 1 : 1;
      }

      const data = encodeSongLinkNames({
        ...song.value,
        title: normalizedTitle,
        artist: song.value.artist || [],
        lyricist: song.value.lyricist || [],
        composer: song.value.composer || [],
        index,
        links: normalizedLinks,
        otherLinks: normalizedOtherLinks,
        releaseDate: normalizeDateForStorage(song.value.releaseDate),
        defaultAlbum: song.value.defaultAlbum || '',
        defaultAlbumName: song.value.defaultAlbumName || '',
        defaultCover: song.value.defaultCover || '',
      });

      let targetSongId: string;

      if (isEdit.value) {
        await pb.collection('songs').update(route.params.id as string, data);
        targetSongId = route.params.id as string;
      } else {
        const created = await pb.collection('songs').create(data);
        targetSongId = created.id;
      }

      // 5.5. 关联/取消关联专辑
      await linkedAlbums.handleAlbumTrackUpdate(targetSongId);

      // 6. 上传封面
      if (currentBatchTask.value) {
        currentBatchTask.value.targetId = targetSongId;
        currentBatchTask.value.targetName = normalizedTitle;

        const newCovers = covers.value.filter(c => c.id.startsWith('pending-'));
        newCovers.forEach((cover, idx) => {
          if (!cover.uploadTaskFileId) return;
          const taskFile = currentBatchTask.value?.files.find(f => f.id === cover.uploadTaskFileId);
          if (taskFile) {
            taskFile.sort = existingCovers.length + idx + 1;
          }
        });

        await handoffEditLockToTask(currentBatchTask.value, targetSongId);
        uploadStore.startPendingTasks(targetSongId, 'song');
        currentBatchTask.value = null;
      } else if (isEdit.value) {
        await editLock.removeEditLock();
      }

      hasChanges.value = false;
      router.push('/admin/songs');
    } catch (err) {
      console.error('Failed to save song:', err);
      error.value = '保存失败，请检查输入是否完整';
    } finally {
      saving.value = false;
    }
  };

  const cancel = () => {
    if (hasChanges.value || hasUnsavedFiles.value) {
      if (!confirm('有未保存的更改，确定要离开吗？')) return;
    }
    if (currentBatchTask.value?.status === 'pending') {
      uploadStore.discardTask(currentBatchTask.value.id);
      currentBatchTask.value = null;
    }
    router.push('/admin/songs');
  };

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasChanges.value || hasUnsavedFiles.value) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  };

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', closePlatformDropdown);
  });

  onUnmounted(() => {
    isDisposed = true;
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('click', closePlatformDropdown);
    covers.value.forEach(c => {
      if (c.localUrl) URL.revokeObjectURL(c.localUrl);
    });
    if (currentBatchTask.value?.status === 'pending') {
      uploadStore.discardTask(currentBatchTask.value.id);
      currentBatchTask.value = null;
    }
    // 删除编辑锁（Composable 会自动处理，这里显式调用以确保顺序）
    void editLock.dispose();
  });

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
        <h1 class="text-2xl font-semibold text-[#c9c9c9] flex items-center gap-3">
          {{ isEdit ? '编辑音乐' : '新建音乐' }}
          <span v-if="isEdit && !loading && song.index" class="text-lg text-[#888] font-normal">#{{ song.index }}</span>
        </h1>
      </div>
      <div class="flex gap-3">
        <button
          class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors inline-flex items-center gap-2"
          @click="cancel"
        >
          <AppIcon name="close" class-name="w-4 h-4" />
          取消
        </button>
        <button
          class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors flex items-center gap-2"
          :disabled="saving"
          @click="saveSong"
        >
          <AppIcon v-if="saving" name="refresh" class-name="w-4 h-4 animate-spin" />
          <AppIcon v-else name="save" class-name="w-4 h-4" />
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
      <p class="text-red-300">{{ error }}</p>
    </div>

    <EditLockWarning
      :lock-warning="editLock.lockWarning.value"
      :conflicting-lock="editLock.conflictingLock.value"
      :current-lock-id="editLock.currentLockId.value"
      :taking-over-lock="editLock.takingOverLock.value"
      :saving="saving"
      @take-over-lock="editLock.takeOverConflictingEditLock"
    />

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-8 lg:order-1 space-y-6">
        <!-- 基本信息 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
          <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3 flex items-center gap-2">
            <AppIcon name="info" class-name="w-5 h-5 text-red-300" />
            基本信息
          </h2>

          <div class="grid grid-cols-2 gap-4">
            <AdminInput
              v-model="song.title"
              label="标题"
              placeholder="标题"
              required
              :error="titleError"
              @clear="titleError = ''"
            />
            <!-- 艺人标签输入 -->
            <div class="space-y-2">
              <label class="text-sm text-[#888]">艺人 <span class="text-red-400">*</span></label>
              <div class="flex flex-wrap gap-2 mb-2">
                <span
                  v-for="tag in song.artist"
                  :key="tag"
                  class="inline-flex items-center gap-1 px-3 py-1 bg-red-300/10 text-red-300 rounded-full text-sm"
                >
                  {{ tag }}
                  <button class="-m-1 p-1 hover:text-white transition-colors" @click="removeTag('artist', tag)">
                    <AppIcon name="close" class-name="w-4 h-4" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="artistInput"
                  type="text"
                  placeholder="添加艺人"
                  class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
                  @keyup.enter="addTag('artist')"
                />
                <button
                  class="px-4 py-2 bg-white/5 text-[#c9c9c9] rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-1"
                  @click="addTag('artist')"
                >
                  <AppIcon name="plus" class-name="w-4 h-4" />
                  添加
                </button>
              </div>
              <p v-if="artistError" class="text-sm text-red-400">{{ artistError }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- 词作标签输入 -->
            <div class="space-y-2">
              <label class="text-sm text-[#888]">词作</label>
              <div class="flex flex-wrap gap-2 mb-2">
                <span
                  v-for="tag in song.lyricist"
                  :key="tag"
                  class="inline-flex items-center gap-1 px-3 py-1 bg-red-300/10 text-red-300 rounded-full text-sm"
                >
                  {{ tag }}
                  <button class="-m-1 p-1 hover:text-white transition-colors" @click="removeTag('lyricist', tag)">
                    <AppIcon name="close" class-name="w-4 h-4" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="lyricistInput"
                  type="text"
                  placeholder="添加词作"
                  class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
                  @keyup.enter="addTag('lyricist')"
                />
                <button
                  class="px-4 py-2 bg-white/5 text-[#c9c9c9] rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-1"
                  @click="addTag('lyricist')"
                >
                  <AppIcon name="plus" class-name="w-4 h-4" />
                  添加
                </button>
              </div>
            </div>
            <!-- 曲作标签输入 -->
            <div class="space-y-2">
              <label class="text-sm text-[#888]">曲作</label>
              <div class="flex flex-wrap gap-2 mb-2">
                <span
                  v-for="tag in song.composer"
                  :key="tag"
                  class="inline-flex items-center gap-1 px-3 py-1 bg-red-300/10 text-red-300 rounded-full text-sm"
                >
                  {{ tag }}
                  <button class="-m-1 p-1 hover:text-white transition-colors" @click="removeTag('composer', tag)">
                    <AppIcon name="close" class-name="w-4 h-4" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="composerInput"
                  type="text"
                  placeholder="添加曲作"
                  class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
                  @keyup.enter="addTag('composer')"
                />
                <button
                  class="px-4 py-2 bg-white/5 text-[#c9c9c9] rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-1"
                  @click="addTag('composer')"
                >
                  <AppIcon name="plus" class-name="w-4 h-4" />
                  添加
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm text-[#888]">发布日期</label>
            <div class="relative group">
              <input
                :value="song.releaseDate"
                type="text"
                placeholder="YYYY/MM/DD"
                class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-24"
                @input="handleDateInput"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  v-if="song.releaseDate"
                  class="p-1.5 text-[#888] hover:text-red-300 transition-colors"
                  title="清空"
                  @click="song.releaseDate = ''"
                >
                  <AppIcon name="close" class-name="w-4 h-4" />
                </button>
                <button
                  class="p-1.5 text-[#888] hover:text-red-300 transition-colors"
                  title="选择日期"
                  @click="openDatePicker"
                >
                  <AppIcon name="calendar" class-name="w-5 h-5" />
                </button>
                <input
                  ref="datePicker"
                  type="date"
                  class="absolute opacity-0 pointer-events-none w-0 h-0"
                  @change="(e: any) => (song.releaseDate = e.target.value)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 描述 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <AdminInput
            v-model="song.description"
            label="描述"
            icon="info"
            type="markdown"
            placeholder="音乐描述"
            label-size="lg"
          />
        </div>

        <!-- 链接列表 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
              <AppIcon name="external-link" class-name="w-5 h-5 text-red-300" />
              平台链接
            </h2>
            <button
              class="text-sm text-red-300 hover:text-[#fca5a5] transition-colors inline-flex items-center gap-1"
              @click="addLink"
            >
              <AppIcon name="plus" class-name="w-4 h-4" />
              添加
            </button>
          </div>
          <div class="space-y-3">
            <div v-for="(link, index) in song.links" :key="index" class="flex gap-3">
              <div class="w-1/3 relative platform-select-container">
                <div class="flex gap-1">
                  <input
                    v-model="link.name"
                    type="text"
                    placeholder="平台名称"
                    class="flex-1 px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                  />
                  <button
                    type="button"
                    class="px-2 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#888] hover:text-red-300 hover:border-red-300/50 transition-colors"
                    @click.stop="togglePlatformDropdown(index)"
                  >
                    <AppIcon
                      name="chevron-down"
                      class-name="w-4 h-4 transition-transform"
                      :class="{ 'rotate-180': showPlatformDropdown === index }"
                    />
                  </button>
                </div>
                <div
                  v-if="showPlatformDropdown === index"
                  class="absolute top-full left-0 right-0 mt-1 bg-[rgb(50,0,0)] border border-[#c9c9c9]/20 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                >
                  <div
                    v-for="platform in presetPlatforms"
                    :key="platform"
                    class="px-3 py-2 text-sm text-[#c9c9c9] hover:bg-red-300/10 cursor-pointer transition-colors"
                    @click="selectPlatform(index, platform)"
                  >
                    {{ platform }}
                  </div>
                </div>
              </div>
              <input
                v-model="link.url"
                type="text"
                placeholder="链接地址"
                class="flex-1 px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm"
              />
              <button class="text-red-400 hover:text-red-300 p-2" @click="removeLink(index)">
                <AppIcon name="trash" class-name="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <!-- 其他相关链接 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
              <AppIcon name="link" class-name="w-5 h-5 text-red-300" />
              其他相关链接
            </h2>
            <button
              class="text-sm text-red-300 hover:text-[#fca5a5] transition-colors inline-flex items-center gap-1"
              @click="addOtherLink"
            >
              <AppIcon name="plus" class-name="w-4 h-4" />
              添加
            </button>
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
              <button class="text-red-400 hover:text-red-300 p-2" @click="removeOtherLink(index)">
                <AppIcon name="trash" class-name="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <!-- 平台 ID -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
            <AppIcon name="music" class-name="w-5 h-5 text-red-300" />
            平台 ID
          </h2>
          <p class="text-xs text-[#888] leading-relaxed">
            用于播放音乐，仅非 VIP 歌曲可播全曲，建议启用不用 VIP
            就能播的平台。如果没有能播的，建议一个平台也不启用，也可以不填，反正不启用的话也没用。
          </p>
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm text-[#888] flex items-center justify-between">
                <span>QQ 音乐 ID</span>
                <label class="flex items-center gap-1.5 cursor-pointer group">
                  <input
                    v-model="song.enabledPlatform"
                    type="radio"
                    value="qq"
                    class="w-3.5 h-3.5 accent-red-300"
                    @change="markChanged"
                  />
                  <span class="text-xs group-hover:text-red-300 transition-colors">启用</span>
                </label>
              </label>
              <input
                v-model="song.qqId"
                type="text"
                placeholder="输入 QQ 音乐 ID"
                class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                @input="markChanged"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm text-[#888] flex items-center justify-between">
                <span>网易云音乐 ID</span>
                <label class="flex items-center gap-1.5 cursor-pointer group">
                  <input
                    v-model="song.enabledPlatform"
                    type="radio"
                    value="netease"
                    class="w-3.5 h-3.5 accent-red-300"
                    @change="markChanged"
                  />
                  <span class="text-xs group-hover:text-red-300 transition-colors">启用</span>
                </label>
              </label>
              <input
                v-model="song.neteaseId"
                type="text"
                placeholder="输入网易云音乐 ID"
                class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                @input="markChanged"
              />
            </div>
            <div v-if="song.enabledPlatform" class="flex justify-end">
              <button
                class="text-xs text-[#888] hover:text-red-300 transition-colors"
                @click="
                  song.enabledPlatform = '';
                  markChanged();
                "
              >
                取消启用标记
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-4 lg:order-2 space-y-6">
        <!-- 封面 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
            <AppIcon name="image" class-name="w-5 h-5 text-red-300" /> 封面
          </h2>

          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleCoverFileSelect" />

          <!-- 全局拖拽遮罩 -->
          <Teleport to="body">
            <div
              v-if="isDraggingOver"
              class="fixed inset-0 bg-black/80 z-10000 flex items-center justify-center pointer-events-none"
            >
              <div class="text-center">
                <AppIcon name="photo" class-name="w-16 h-16 mx-auto text-red-300 mb-4" />
                <p class="text-xl text-[#c9c9c9]">拖放图片到此处上传封面</p>
              </div>
            </div>
          </Teleport>

          <!-- 默认封面预览 -->
          <div
            class="aspect-square rounded-lg overflow-hidden border-2 border-[#c9c9c9]/20 relative"
            @dragenter="handleDragEnter"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <img v-if="defaultCoverPreviewUrl" :src="defaultCoverPreviewUrl" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex flex-col items-center justify-center bg-black/10">
              <AppIcon name="image-placeholder" class-name="w-12 h-12 text-[#888] mb-2" />
              <p class="text-sm text-[#888]">暂无封面</p>
            </div>
          </div>

          <!-- 封面列表 -->
          <div class="space-y-2">
            <!-- 缺省封面选项 -->
            <button
              class="w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left"
              :class="
                !song.defaultCover ? 'border-red-300 bg-red-300/10' : 'border-[#c9c9c9]/10 hover:border-[#c9c9c9]/30'
              "
              @click="clearDefaultCover"
            >
              <div class="w-12 h-12 rounded bg-[#c9c9c9]/10 flex items-center justify-center shrink-0">
                <AppIcon name="image-placeholder" class-name="w-6 h-6 text-[#888]" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm" :class="!song.defaultCover ? 'text-red-300' : 'text-[#c9c9c9]'"
                  >不展示封面（缺省）</p
                >
              </div>
              <span v-if="!song.defaultCover" class="text-red-300 text-sm flex items-center gap-1">
                <AppIcon name="check" class-name="w-4 h-4" /> 默认展示
              </span>
            </button>

            <!-- 专辑封面选项 (从关联专辑中选) -->
            <template v-for="album in linkedAlbums.allLinkedAlbums.value" :key="album.id">
              <button
                v-if="album.cover"
                class="w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left group"
                :class="
                  isDefaultAlbumCover(album.id)
                    ? 'border-red-300 bg-red-300/10'
                    : 'border-[#c9c9c9]/10 hover:border-[#c9c9c9]/30'
                "
                @click="setAlbumCoverAsDefault(album.id)"
              >
                <div class="w-12 h-12 rounded overflow-hidden shrink-0">
                  <img
                    :src="pb.files.getURL(album, album.cover, { thumb: '400x400' })"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-[#888] mb-0.5">专辑封面</p>
                  <p
                    class="text-sm truncate"
                    :class="isDefaultAlbumCover(album.id) ? 'text-red-300' : 'text-[#c9c9c9]'"
                  >
                    {{ album.title }}
                  </p>
                </div>
                <span v-if="isDefaultAlbumCover(album.id)" class="text-red-300 text-sm flex items-center gap-1">
                  <AppIcon name="check" class-name="w-4 h-4" /> 默认展示
                </span>
              </button>
            </template>

            <!-- 自有封面列表 -->
            <div
              v-for="(cover, index) in covers"
              :key="cover.id"
              class="w-full flex items-center gap-3 p-2 rounded-lg border transition-all group"
              :class="[
                isDefaultCover(cover)
                  ? 'border-red-300 bg-red-300/10'
                  : 'border-[#c9c9c9]/10 hover:border-[#c9c9c9]/30',
                cover.id.startsWith('pending-') ? 'opacity-70' : '',
              ]"
              @mouseenter="cover.showDelete = true"
              @mouseleave="cover.showDelete = false"
            >
              <div
                class="w-12 h-12 rounded overflow-hidden shrink-0 cursor-pointer"
                :class="cover.id.startsWith('pending-') ? 'border border-dashed border-[#c9c9c9]/30' : ''"
                @click="!cover.id.startsWith('pending-') && setDefaultCover(cover.id)"
              >
                <img :src="getCoverUrl(cover)" class="w-full h-full object-cover" />
              </div>
              <div
                class="flex-1 min-w-0 cursor-pointer"
                @click="!cover.id.startsWith('pending-') && setDefaultCover(cover.id)"
              >
                <p class="text-sm" :class="isDefaultCover(cover) ? 'text-red-300' : 'text-[#c9c9c9]'">
                  自有封面 #{{ index + 1 }}
                  <span v-if="cover.id.startsWith('pending-')" class="text-[#888] text-xs ml-1">（待上传）</span>
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="isDefaultCover(cover)" class="text-red-300 text-sm flex items-center gap-1">
                  <AppIcon name="check" class-name="w-4 h-4" /> 默认展示
                </span>
                <!-- 删除按钮 - 只有自有封面可删除（不是待上传状态的） -->
                <button
                  v-if="!cover.id.startsWith('pending-')"
                  class="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-white/5 transition-all"
                  :class="cover.showDelete ? 'opacity-100' : 'opacity-0'"
                  title="删除"
                  @click.stop="removeCover(index)"
                >
                  <AppIcon name="trash" class-name="w-4 h-4" />
                </button>
                <button
                  v-else
                  class="text-[#888] hover:text-red-300 p-1.5 rounded hover:bg-white/5 transition-all"
                  :class="cover.showDelete ? 'opacity-100' : 'opacity-0'"
                  title="取消"
                  @click.stop="removeCover(index)"
                >
                  <AppIcon name="close" class-name="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- 上传按钮 -->
            <button
              class="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-[#c9c9c9]/20 hover:border-red-300/50 hover:bg-red-300/5 transition-all text-[#888] hover:text-red-300"
              @click="fileInput?.click()"
            >
              <AppIcon name="plus" class-name="w-4 h-4" />
              <span class="text-sm">上传封面</span>
            </button>
          </div>
        </div>

        <!-- 展示专辑（用于前台显示） -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
            <AppIcon name="album" class-name="w-5 h-5 text-red-300" /> 展示专辑
          </h2>
          <p class="text-xs text-[#888]"
            >此处选择的专辑仅用于前台展示，不影响专辑与音乐的关联关系。完整的关联请在专辑管理中配置。</p
          >

          <!-- 已关联专辑 -->
          <div v-if="displayAlbum.albumMode.value === 'linked'" class="space-y-3">
            <div class="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
              <template v-if="song.defaultAlbum">
                <div
                  v-if="linkedAlbums.allLinkedAlbums.value.find(a => a.id === song.defaultAlbum)?.cover"
                  class="w-10 h-10 rounded overflow-hidden shrink-0"
                >
                  <img
                    :src="
                      pb.files.getURL(
                        linkedAlbums.allLinkedAlbums.value.find(a => a.id === song.defaultAlbum)!,
                        linkedAlbums.allLinkedAlbums.value.find(a => a.id === song.defaultAlbum)!.cover!,
                        { thumb: '400x400' }
                      )
                    "
                    class="w-full h-full object-cover"
                  />
                </div>
              </template>
              <span class="text-[#c9c9c9] text-sm flex-1">{{ displayAlbum.selectedAlbumTitle.value }}</span>
              <button class="text-red-400 hover:text-red-300 p-1" @click="displayAlbum.clearAlbum()">
                <AppIcon name="close" class-name="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- 手动填写 -->
          <div v-else-if="displayAlbum.albumMode.value === 'manual'" class="space-y-3">
            <input
              v-model="song.defaultAlbumName"
              type="text"
              placeholder="输入专辑名称"
              class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
              @input="markChanged"
            />
            <p class="text-xs text-[#888]">本站暂无此专辑，仅显示名称不提供链接</p>
            <button class="text-xs text-[#888] hover:text-red-300 transition-colors" @click="displayAlbum.clearAlbum()"
              >清除</button
            >
          </div>

          <!-- 选择界面 -->
          <div v-else class="space-y-3">
            <div v-if="displayAlbum.showAlbumSearch.value" class="space-y-2">
              <input
                v-model="displayAlbum.albumSearchQuery.value"
                type="text"
                placeholder="搜索专辑名"
                class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                @input="displayAlbum.searchAlbums()"
              />
              <div v-if="displayAlbum.albumSearchResults.value.length > 0" class="max-h-40 overflow-y-auto space-y-1">
                <button
                  v-for="result in displayAlbum.albumSearchResults.value"
                  :key="result.id"
                  class="w-full text-left p-2 bg-black/10 hover:bg-white/5 rounded text-sm transition-colors"
                  @click="displayAlbum.selectAlbum(result)"
                >
                  <span class="text-[#c9c9c9]">{{ result.title }}</span>
                </button>
              </div>
              <div
                v-else-if="displayAlbum.albumSearchQuery.value.trim() && !displayAlbum.isSearchingAlbums.value"
                class="text-xs text-[#888] py-1"
                >未找到匹配的专辑</div
              >
              <button
                class="text-xs text-red-300/70 hover:text-red-300 transition-colors"
                @click="displayAlbum.setManualAlbum()"
                >本站无此专辑，手动填写名称</button
              >
              <button
                class="text-xs text-[#888] hover:text-[#c9c9c9] transition-colors ml-3"
                @click="displayAlbum.showAlbumSearch.value = false"
                >取消</button
              >
            </div>
            <button
              v-else
              class="text-sm text-red-300/70 hover:text-red-300 transition-colors inline-flex items-center gap-1"
              @click="displayAlbum.showAlbumSearch.value = true"
            >
              <AppIcon name="plus" class-name="w-3 h-3" /> 选择展示专辑
            </button>
          </div>
        </div>

        <!-- 关联的全部专辑 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
              <AppIcon name="album" class-name="w-5 h-5 text-red-300" /> 关联的全部专辑
            </h2>
            <button
              v-if="!linkedAlbums.showSongAlbumSearch.value"
              class="text-sm text-red-300 hover:text-[#fca5a5] transition-colors inline-flex items-center gap-1"
              @click="linkedAlbums.showSongAlbumSearch.value = true"
            >
              <AppIcon name="plus" class-name="w-4 h-4" />
              添加关联
            </button>
          </div>

          <p class="text-xs text-[#888]"> 以下是包含此音乐的全部专辑。添加或删除后，需保存后才会提交到数据库。 </p>

          <!-- 添加专辑搜索 -->
          <div v-if="linkedAlbums.showSongAlbumSearch.value" class="space-y-2 p-3 bg-black/10 rounded-lg">
            <div class="flex items-center gap-2">
              <input
                v-model="linkedAlbums.songAlbumSearchQuery.value"
                type="text"
                placeholder="搜索要添加的专辑名"
                class="flex-1 px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                @input="linkedAlbums.searchSongAlbums()"
              />
              <button
                class="text-[#888] hover:text-[#c9c9c9] transition-colors"
                @click="linkedAlbums.closeSongAlbumSearch()"
              >
                <AppIcon name="close" class-name="w-5 h-5" />
              </button>
            </div>
            <div v-if="linkedAlbums.songAlbumSearchResults.value.length > 0" class="max-h-40 overflow-y-auto space-y-1">
              <button
                v-for="result in linkedAlbums.songAlbumSearchResults.value"
                :key="result.id"
                class="w-full text-left p-2 bg-black/20 hover:bg-red-300/10 rounded text-sm transition-colors flex items-center gap-2"
                @click="linkedAlbums.addAlbumToLink(result)"
              >
                <div v-if="result.cover" class="w-8 h-8 rounded overflow-hidden shrink-0">
                  <img
                    :src="
                      pb.files.getURL({ collectionId: result.collectionId, id: result.id }, result.cover, {
                        thumb: '100x100',
                      })
                    "
                    class="w-full h-full object-cover"
                  />
                </div>
                <span class="text-[#c9c9c9]">{{ result.title }}</span>
              </button>
            </div>
            <div
              v-else-if="linkedAlbums.songAlbumSearchQuery.value.trim() && !linkedAlbums.isSearchingSongAlbums.value"
              class="text-xs text-[#888] py-1 text-center"
              >未找到匹配的专辑 (或专辑已在关联列表中)</div
            >
          </div>

          <div v-if="linkedAlbums.allLinkedAlbums.value.length > 0" class="space-y-2">
            <div
              v-for="album in linkedAlbums.allLinkedAlbums.value"
              :key="album.id"
              class="flex items-center gap-3 p-3 bg-black/20 rounded-lg group"
            >
              <div v-if="album.cover" class="w-10 h-10 rounded overflow-hidden shrink-0">
                <img
                  :src="pb.files.getURL({ collectionId: 'albums', id: album.id }, album.cover, { thumb: '400x400' })"
                  class="w-full h-full object-cover"
                />
              </div>
              <div v-else class="w-10 h-10 rounded bg-[#c9c9c9]/10 flex items-center justify-center shrink-0">
                <AppIcon name="album" class-name="w-5 h-5 text-[#888]" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[#c9c9c9] text-sm truncate">{{ album.title }}</p>
                <p class="text-xs text-[#888]">#{{ album.index }}</p>
              </div>
              <button
                class="text-[#888] hover:text-red-300 p-1.5 rounded hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
                title="取消关联"
                @click.stop="linkedAlbums.removeAlbumFromLink(album.id)"
              >
                <AppIcon name="close" class-name="w-4 h-4" />
              </button>
              <button
                title="在专辑管理中编辑"
                class="text-[#888] hover:text-red-300 p-1.5"
                @click="linkedAlbums.navigateToAlbumEdit(album.id)"
              >
                <AppIcon name="external-link" class-name="w-4 h-4" />
              </button>
            </div>
          </div>
          <p v-else class="text-sm text-[#888] text-center py-4">暂无关联专辑</p>
        </div>

        <!-- 歌词 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <AdminInput
            v-model="song.lyrics"
            label="歌词"
            icon="lyricist"
            type="textarea"
            placeholder="歌词"
            label-size="lg"
          />
        </div>

        <!-- 制作人员 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <AdminInput
            v-model="song.credits"
            label="制作人员"
            icon="users"
            type="textarea"
            placeholder="制作人员名单"
            label-size="lg"
          />
        </div>
      </div>
    </div>
  </div>

  <VersionConflictDialog
    :visible="showVersionConflictDialog"
    title="该音乐"
    :latest-edit-path="latestEditPath"
    :original-updated="originalUpdated"
    :latest-updated="latestConflictUpdated"
    @cancel="resolveVersionConflict(false)"
    @force="resolveVersionConflict(true)"
  />

  <EditLockConflictDialog
    :visible="editLock.showEditLockConflictDialog.value"
    :message="editLock.editLockConflictMessage.value"
    :locking-user="editLock.conflictingLock.value?.username || null"
    :locked-at="editLock.conflictingLock.value?.created || editLock.conflictingLock.value?.updated || null"
    @close="editLock.resolveEditLockConflict(false)"
    @force="editLock.resolveEditLockConflict(true)"
  />
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

  textarea {
    resize: none;
  }
</style>
