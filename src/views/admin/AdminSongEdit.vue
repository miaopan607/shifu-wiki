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
    artist: '',
    releaseDate: '',
    lyricist: '',
    composer: '',
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

  // === 专辑选择 ===
  const albumSearchQuery = ref('');
  const albumSearchResults = ref<any[]>([]);
  const isSearchingAlbums = ref(false);
  const showAlbumSearch = ref(false);
  const selectedAlbumTitle = ref(''); // 已选专辑的标题
  const albumMode = ref<'none' | 'linked' | 'manual'>('none'); // none=无专辑, linked=关联站内, manual=手动填写
  let albumSearchDebounce: ReturnType<typeof setTimeout> | null = null;

  // === 关联的全部专辑（只读，通过albums.tracks反查）===
  interface LinkedAlbumInfo {
    id: string;
    title: string;
    index: number;
    cover?: string;
  }
  const allLinkedAlbums = ref<LinkedAlbumInfo[]>([]);

  const loadAllLinkedAlbums = async (songId: string) => {
    try {
      const albumsResult = await pb.collection('albums').getFullList({
        fields: 'id,title,index,cover,tracks',
      });
      const linked: LinkedAlbumInfo[] = [];
      for (const album of albumsResult) {
        const tracks = Array.isArray(album.tracks) ? album.tracks : [];
        const isInAlbum = tracks.some((disc: any) => Array.isArray(disc.songs) && disc.songs.includes(songId));
        if (isInAlbum) {
          linked.push({
            id: album.id,
            title: album.title,
            index: album.index,
            cover: album.cover,
          });
        }
      }
      allLinkedAlbums.value = linked;
    } catch (err) {
      console.error('Failed to load linked albums:', err);
    }
  };

  const navigateToAlbumEdit = (albumId: string) => {
    router.push(`/admin/albums/${albumId}`);
  };

  const searchAlbums = () => {
    if (albumSearchDebounce) clearTimeout(albumSearchDebounce);
    const query = albumSearchQuery.value.trim();
    if (!query) {
      albumSearchResults.value = [];
      return;
    }
    isSearchingAlbums.value = true;
    albumSearchDebounce = setTimeout(async () => {
      try {
        const results = await pb.collection('albums').getList(1, 10, {
          filter: `title ~ "${query}"`,
          fields: 'id,title,index,cover,collectionId',
        });
        albumSearchResults.value = results.items;
      } catch (err) {
        console.error(err);
      } finally {
        isSearchingAlbums.value = false;
      }
    }, 300);
  };

  const selectAlbum = (albumRecord: any) => {
    song.value.defaultAlbum = albumRecord.id;
    song.value.defaultAlbumName = albumRecord.title;
    selectedAlbumTitle.value = albumRecord.title;
    albumMode.value = 'linked';
    showAlbumSearch.value = false;
    albumSearchQuery.value = '';
    albumSearchResults.value = [];
    markChanged();
  };

  const setManualAlbum = () => {
    albumMode.value = 'manual';
    song.value.defaultAlbum = '';
    showAlbumSearch.value = false;
    markChanged();
  };

  const clearAlbum = () => {
    albumMode.value = 'none';
    song.value.defaultAlbum = '';
    song.value.defaultAlbumName = '';
    selectedAlbumTitle.value = '';
    // If default cover was 'album', reset it
    if (song.value.defaultCover === 'album') {
      song.value.defaultCover = '';
    }
    markChanged();
  };

  // === 默认封面 ===
  const getAlbumCoverUrl = computed(() => {
    if (!song.value.defaultAlbum) return '';
    // We need the linked album's cover - stored when loaded
    return linkedAlbumCoverUrl.value;
  });
  const linkedAlbumCoverUrl = ref('');

  const defaultCoverOptions = computed(() => {
    const options: { value: string; label: string; url: string }[] = [
      { value: '', label: '不展示封面（缺省封面）', url: '' },
    ];
    if (song.value.defaultAlbum && linkedAlbumCoverUrl.value) {
      options.push({ value: 'album', label: `专辑封面 (${selectedAlbumTitle.value})`, url: linkedAlbumCoverUrl.value });
    }
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
  const hasChanges = ref(false);

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
    if (song.value.defaultCover === 'album') {
      return linkedAlbumCoverUrl.value;
    }
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

  // 设置默认封面
  const setDefaultCover = (coverId: string) => {
    song.value.defaultCover = `song_cover:${coverId}`;
    markChanged();
  };

  // 设置专辑封面为默认
  const setAlbumCoverAsDefault = () => {
    song.value.defaultCover = 'album';
    markChanged();
  };

  // 清除默认封面
  const clearDefaultCover = () => {
    song.value.defaultCover = '';
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

        // 设置专辑模式
        if (song.value.defaultAlbum) {
          albumMode.value = 'linked';
          try {
            const linkedAlbum = await pb.collection('albums').getOne(song.value.defaultAlbum as string);
            selectedAlbumTitle.value = linkedAlbum.title;
            if (linkedAlbum.cover) {
              linkedAlbumCoverUrl.value = pb.files.getURL(linkedAlbum, linkedAlbum.cover, { thumb: '400x400' });
            }
          } catch {
            /* album might have been deleted */
          }
        } else if (song.value.defaultAlbumName) {
          albumMode.value = 'manual';
        } else {
          albumMode.value = 'none';
        }

        // 加载关联的全部专辑
        await loadAllLinkedAlbums(route.params.id as string);
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

  const markChanged = () => {
    hasChanges.value = true;
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
  const saveSong = async () => {
    titleError.value = '';
    artistError.value = '';
    error.value = '';

    const normalizedTitle = song.value.title?.trim() || '';
    const normalizedArtist = song.value.artist?.trim() || '';

    if (!normalizedTitle) {
      titleError.value = '标题不能为空';
    }
    if (!normalizedArtist) {
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
        artist: normalizedArtist,
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
  });

  onUnmounted(() => {
    isDisposed = true;
    window.removeEventListener('beforeunload', handleBeforeUnload);
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
            <AdminInput
              v-model="song.artist"
              label="艺人"
              placeholder="艺人"
              required
              :error="artistError"
              @clear="artistError = ''"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <AdminInput v-model="song.lyricist" label="词作" placeholder="词作" />
            <AdminInput v-model="song.composer" label="曲作" placeholder="曲作" />
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
              <textarea
                v-model="link.name"
                v-autosize
                rows="1"
                placeholder="平台名称"
                class="w-1/3 px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] resize-none"
              ></textarea>
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

            <!-- 专辑封面选项 -->
            <button
              v-if="song.defaultAlbum && linkedAlbumCoverUrl"
              class="w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left group"
              :class="
                song.defaultCover === 'album'
                  ? 'border-red-300 bg-red-300/10'
                  : 'border-[#c9c9c9]/10 hover:border-[#c9c9c9]/30'
              "
              @click="setAlbumCoverAsDefault"
            >
              <div class="w-12 h-12 rounded overflow-hidden shrink-0">
                <img :src="linkedAlbumCoverUrl" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm truncate" :class="song.defaultCover === 'album' ? 'text-red-300' : 'text-[#c9c9c9]'">
                  专辑封面（{{ selectedAlbumTitle }}）
                </p>
              </div>
              <span v-if="song.defaultCover === 'album'" class="text-red-300 text-sm flex items-center gap-1">
                <AppIcon name="check" class-name="w-4 h-4" /> 默认展示
              </span>
            </button>

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
          <div v-if="albumMode === 'linked'" class="space-y-3">
            <div class="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
              <div v-if="linkedAlbumCoverUrl" class="w-10 h-10 rounded overflow-hidden shrink-0">
                <img :src="linkedAlbumCoverUrl" class="w-full h-full object-cover" />
              </div>
              <span class="text-[#c9c9c9] text-sm flex-1">{{ selectedAlbumTitle }}</span>
              <button class="text-red-400 hover:text-red-300 p-1" @click="clearAlbum">
                <AppIcon name="close" class-name="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- 手动填写 -->
          <div v-else-if="albumMode === 'manual'" class="space-y-3">
            <input
              v-model="song.defaultAlbumName"
              type="text"
              placeholder="输入专辑名称"
              class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
              @input="markChanged"
            />
            <p class="text-xs text-[#888]">本站暂无此专辑，仅显示名称不提供链接</p>
            <button class="text-xs text-[#888] hover:text-red-300 transition-colors" @click="clearAlbum">清除</button>
          </div>

          <!-- 选择界面 -->
          <div v-else class="space-y-3">
            <div v-if="showAlbumSearch" class="space-y-2">
              <input
                v-model="albumSearchQuery"
                type="text"
                placeholder="搜索专辑名"
                class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                @input="searchAlbums"
              />
              <div v-if="albumSearchResults.length > 0" class="max-h-40 overflow-y-auto space-y-1">
                <button
                  v-for="result in albumSearchResults"
                  :key="result.id"
                  class="w-full text-left p-2 bg-black/10 hover:bg-white/5 rounded text-sm transition-colors"
                  @click="selectAlbum(result)"
                >
                  <span class="text-[#c9c9c9]">{{ result.title }}</span>
                </button>
              </div>
              <div v-else-if="albumSearchQuery.trim() && !isSearchingAlbums" class="text-xs text-[#888] py-1"
                >未找到匹配的专辑</div
              >
              <button class="text-xs text-red-300/70 hover:text-red-300 transition-colors" @click="setManualAlbum"
                >本站无此专辑，手动填写名称</button
              >
              <button
                class="text-xs text-[#888] hover:text-[#c9c9c9] transition-colors ml-3"
                @click="showAlbumSearch = false"
                >取消</button
              >
            </div>
            <button
              v-else
              class="text-sm text-red-300/70 hover:text-red-300 transition-colors inline-flex items-center gap-1"
              @click="showAlbumSearch = true"
            >
              <AppIcon name="plus" class-name="w-3 h-3" /> 选择展示专辑
            </button>
          </div>
        </div>

        <!-- 关联的全部专辑（只读） -->
        <div
          v-if="isEdit && allLinkedAlbums.length > 0"
          class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4"
        >
          <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
            <AppIcon name="album" class-name="w-5 h-5 text-red-300" /> 关联的全部专辑
          </h2>
          <p class="text-xs text-[#888]">以下是包含此音乐的全部专辑（在专辑管理中编辑）。</p>
          <div class="space-y-2">
            <div
              v-for="album in allLinkedAlbums"
              :key="album.id"
              class="flex items-center gap-3 p-3 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors"
              @click="navigateToAlbumEdit(album.id)"
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
              <AppIcon name="external-link" class-name="w-4 h-4 text-[#888]" />
            </div>
          </div>
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
