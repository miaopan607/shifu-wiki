<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { pb, parseDateFromBackend, normalizeDateForStorage } from '@/lib/pocketbase';
  import { useEditLock } from '@/composables/useEditLock';
  import EditLockConflictDialog from '@/components/EditLockConflictDialog.vue';
  import EditLockWarning from '@/components/EditLockWarning.vue';
  import VersionConflictDialog from '@/components/VersionConflictDialog.vue';
  import AdminInput from '@/components/AdminInput.vue';
  import type { Album, AlbumDisc } from '@/types';
  import { normalizeAlbumTracks } from '@/lib/albumTracks';
  import AppIcon from '@/components/AppIcon.vue';

  interface DragState {
    songId: string;
  }

  interface DropTarget {
    discIndex: number;
    songIndex: number;
  }

  const route = useRoute();
  const router = useRouter();
  const isEdit = ref(route.params.id !== undefined);
  const loading = ref(false);
  const saving = ref(false);
  const datePicker = ref<HTMLInputElement | null>(null);
  const titleError = ref('');
  const error = ref('');
  let isDisposed = false;
  const showVersionConflictDialog = ref(false);
  const latestConflictUpdated = ref<string | null>(null);
  let versionConflictResolver: ((force: boolean) => void) | null = null;

  const originalUpdated = ref<string | null>(null);
  const hasChanges = ref(false);

  // 使用编辑锁 Composable
  const editLock = useEditLock({
    collection: 'albums',
    recordId: computed(() => (route.params.id as string) || null),
    isEdit,
  });

  const album = ref<Partial<Album>>({
    title: '',
    releaseDate: '',
    description: '',
    tracks: [{ disc: 1, name: 'Disc 1', songs: [] }],
  });

  // === 单封面管理 ===
  const coverFile = ref<File | null>(null);
  const coverPreviewUrl = ref('');
  const removeCoverFlag = ref(false);
  const fileInput = ref<HTMLInputElement | null>(null);

  const currentCoverUrl = computed(() => {
    if (removeCoverFlag.value) return '';
    if (coverPreviewUrl.value) return coverPreviewUrl.value;
    if (isEdit.value && album.value.cover && album.value.collectionId) {
      return pb.files.getURL(album.value as any, album.value.cover, { thumb: '400x400' });
    }
    return '';
  });

  // === 曲目管理 ===
  const songSearchQuery = ref('');
  const songSearchResults = ref<any[]>([]);
  const searchingDisc = ref<number | null>(null);
  const isSearchingSongs = ref(false);

  // === 删除 Disc 确认弹窗 ===
  const showDeleteDiscConfirm = ref(false);
  const discToDeleteIndex = ref<number | null>(null);
  const discToDeleteName = ref('');
  const discToDeleteSongCount = ref(0);

  const allLinkedSongIds = computed(() => {
    const ids = new Set<string>();
    for (const disc of album.value.tracks || []) {
      for (const songId of disc.songs) {
        ids.add(songId);
      }
    }
    return ids;
  });

  const songCache = ref<Map<string, any>>(new Map());

  // 拖拽排序状态
  const draggedItem = ref<DragState | null>(null);
  // tempTracks: 拖拽过程中的临时状态，用于实时预览
  const tempTracks = ref<AlbumDisc[] | null>(null);
  // activeDropTarget: 当前拖拽悬停的 Disc 索引
  const activeDropTarget = ref<number | null>(null);

  const getSongName = (songId: string) => {
    return songCache.value.get(songId)?.title || songId;
  };

  // 计算预览状态的曲目列表
  const previewTracks = computed<AlbumDisc[]>(() => {
    if (tempTracks.value) {
      return tempTracks.value;
    }
    return album.value.tracks || [];
  });

  // 将数组转换为 / 分隔的字符串
  const formatArrayField = (value: string | string[] | undefined): string => {
    if (!value) return '';
    if (Array.isArray(value)) return value.join(' / ');
    return value;
  };

  const getSongArtist = (songId: string) => {
    const artist = songCache.value.get(songId)?.artist;
    return formatArrayField(artist);
  };

  // === 版本冲突 ===
  const latestEditPath = computed(() => {
    if (!isEdit.value) return router.resolve({ name: 'admin-album-new' }).href;
    return router.resolve({ name: 'admin-album-edit', params: { id: route.params.id as string } }).href;
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
      const current = await pb.collection('albums').getOne(route.params.id as string);
      if (current.updated !== originalUpdated.value) return { hasConflict: true, currentUpdated: current.updated };
      return { hasConflict: false };
    } catch (err) {
      console.error(err);
      return { hasConflict: false };
    }
  };

  // === 加载 ===
  onMounted(async () => {
    if (isEdit.value) {
      loading.value = true;
      try {
        const record = await pb.collection('albums').getOne(route.params.id as string);
        originalUpdated.value = record.updated;
        const parsedTracks = normalizeAlbumTracks((record as any).tracks);
        // 为没有 name 的 disc 添加默认名称
        const tracksWithName = parsedTracks.map(d => ({
          ...d,
          name: d.name || `Disc ${d.disc}`,
        }));
        album.value = {
          ...record,
          releaseDate: record.releaseDate ? parseDateFromBackend(record.releaseDate) : '',
          tracks: tracksWithName.length > 0 ? tracksWithName : [{ disc: 1, name: 'Disc 1', songs: [] }],
        } as unknown as Album;

        // 加载歌曲名缓存
        const allSongIds = (album.value.tracks || []).flatMap(d => d.songs);
        if (allSongIds.length > 0) {
          const filter = allSongIds.map(id => `id="${id}"`).join(' || ');
          const songs = await pb.collection('songs').getFullList({ filter, fields: 'id,title,artist' });
          songs.forEach(s => songCache.value.set(s.id, s));
        }
      } catch (err) {
        console.error('Failed to fetch album:', err);
        alert('获取专辑详情失败');
        router.push('/admin/albums');
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
  const handleCoverSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      coverFile.value = target.files[0];
      if (coverPreviewUrl.value) URL.revokeObjectURL(coverPreviewUrl.value);
      coverPreviewUrl.value = URL.createObjectURL(target.files[0]);
      removeCoverFlag.value = false;
      hasChanges.value = true;
      target.value = '';
    }
  };

  const removeCover = () => {
    if (coverPreviewUrl.value) URL.revokeObjectURL(coverPreviewUrl.value);
    coverFile.value = null;
    coverPreviewUrl.value = '';
    removeCoverFlag.value = true;
    hasChanges.value = true;
  };

  // === 曲目操作 ===
  const addDisc = () => {
    if (!album.value.tracks) album.value.tracks = [];
    const maxDisc = album.value.tracks.reduce((max, d) => Math.max(max, d.disc), 0);
    const newDiscNumber = maxDisc + 1;
    album.value.tracks.push({ disc: newDiscNumber, name: `Disc ${newDiscNumber}`, songs: [] });
    hasChanges.value = true;
  };

  const confirmRemoveDisc = (discIndex: number) => {
    const disc = album.value.tracks?.[discIndex];
    if (!disc) return;

    if (disc.songs.length > 0) {
      discToDeleteIndex.value = discIndex;
      discToDeleteName.value = disc.name || `Disc ${disc.disc}`;
      discToDeleteSongCount.value = disc.songs.length;
      showDeleteDiscConfirm.value = true;
    } else {
      removeDisc(discIndex);
    }
  };

  const removeDisc = (discIndex: number) => {
    album.value.tracks?.splice(discIndex, 1);
    hasChanges.value = true;
  };

  const cancelRemoveDisc = () => {
    showDeleteDiscConfirm.value = false;
    discToDeleteIndex.value = null;
    discToDeleteName.value = '';
    discToDeleteSongCount.value = 0;
  };

  const executeRemoveDisc = () => {
    if (discToDeleteIndex.value !== null) {
      removeDisc(discToDeleteIndex.value);
    }
    cancelRemoveDisc();
  };

  const removeSongFromDisc = (discIndex: number, songIndex: number) => {
    album.value.tracks?.[discIndex]?.songs.splice(songIndex, 1);
    hasChanges.value = true;
  };

  // === 拖拽排序功能 ===
  const handleDragStart = (discIndex: number, songIndex: number, event: DragEvent) => {
    // 使用 previewTracks 获取当前显示的歌曲ID（因为用户看到的是预览列表）
    const disc = previewTracks.value[discIndex];
    if (!disc) return;

    const songId = disc.songs[songIndex];
    if (!songId) return;

    // 初始化临时状态
    if (album.value.tracks) {
      tempTracks.value = album.value.tracks.map(d => ({
        ...d,
        songs: [...d.songs],
      }));
    }

    draggedItem.value = { songId };

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.dropEffect = 'move';
      // 使用透明图片作为拖拽图像（隐藏默认拖拽效果）
      const transparentImg = new Image();
      transparentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      event.dataTransfer.setDragImage(transparentImg, 0, 0);
    }
  };

  const handleDragEnd = () => {
    draggedItem.value = null;
    tempTracks.value = null;
    activeDropTarget.value = null;
  };

  const handleGlobalDragOver = (event: DragEvent) => {
    event.preventDefault();
    // 如果鼠标不在任何 Disc 容器上，恢复原始预览状态并清除悬停状态
    activeDropTarget.value = null;
    if (draggedItem.value && album.value.tracks) {
      tempTracks.value = album.value.tracks.map(d => ({
        ...d,
        songs: [...d.songs],
      }));
    }
  };

  const handleDragOver = (discIndex: number, event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation(); // 阻止冒泡到 handleGlobalDragOver
    if (!draggedItem.value || !tempTracks.value) return;

    // 设置当前悬停的 Disc
    activeDropTarget.value = discIndex;

    // 获取当前 Disc 中的所有歌曲元素
    const targetDiscEl = event.currentTarget as HTMLElement;
    const songElements = Array.from(targetDiscEl.querySelectorAll('[data-song-id]'));

    // 计算鼠标相对于这些元素的位置，找到插入点
    let insertIndex = songElements.length;

    // 如果没有歌曲，直接插入到末尾（index=0）
    if (songElements.length === 0) {
      insertIndex = 0;
    } else {
      // 先找到被拖拽元素的当前 DOM 索引（如果在这个 Disc 里）
      let currentDragIndex = -1;
      for (let i = 0; i < songElements.length; i++) {
        if (songElements[i]?.getAttribute('data-song-id') === draggedItem.value.songId) {
          currentDragIndex = i;
          break;
        }
      }

      // 遍历所有歌曲元素，找到插入点
      // 这里的逻辑是：如果是向下拖拽，我们希望只要碰到下一个元素的头部就交换
      // 如果是向上拖拽，我们希望只要碰到上一个元素的底部就交换
      for (let i = 0; i < songElements.length; i++) {
        const el = songElements[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();

        let threshold = rect.top + rect.height / 2; // 默认 50%

        // 动态调整阈值
        if (currentDragIndex !== -1) {
          if (i < currentDragIndex) {
            // 向上拖拽的目标元素：只要鼠标没超过底部太多，都算“前面”
            // 即更容易判定为插入到该元素之前
            // 设为 rect.bottom - 5px，意味着只要鼠标进入该元素底部 5px 区域，就视为“之前”
            threshold = rect.bottom - 5;
          } else if (i > currentDragIndex) {
            // 向下拖拽的目标元素：只要鼠标超过顶部一点点，就算“后面”（即继续循环）
            // 即“插入到该元素之前”的区域变小
            // 设为 rect.top + 5px，意味着只要鼠标超过顶部 5px，就视为“之后”
            threshold = rect.top + 5;
          }
        } else {
          // 跨 Disc 拖拽：保持默认 50% 或者更激进一点？
          // 如果是从别的 Disc 拖过来，通常希望它是“挤进来”的
          // 这里保持默认逻辑比较稳妥
        }

        // 如果鼠标在阈值上方，则插入到该元素之前
        if (event.clientY < threshold) {
          insertIndex = i;
          break;
        }
      }
    }

    // 查找被拖拽元素在 tempTracks 中的位置
    let dragDiscIndex = -1;
    let dragSongIndex = -1;
    if (tempTracks.value) {
      for (let i = 0; i < tempTracks.value.length; i++) {
        const disc = tempTracks.value[i];
        if (!disc) continue;
        const idx = disc.songs.indexOf(draggedItem.value.songId);
        if (idx !== -1) {
          dragDiscIndex = i;
          dragSongIndex = idx;
          break;
        }
      }
    }
    if (dragDiscIndex === -1) return;

    // 如果已经在正确的位置，不操作
    // 情况1：同一个Disc，dragIndex == insertIndex (插在自己原来的位置)
    // 情况2：同一个Disc，dragIndex == insertIndex - 1 (插在自己后面的位置，实际上位置没变)
    if (dragDiscIndex === discIndex) {
      if (dragSongIndex === insertIndex || dragSongIndex === insertIndex - 1) {
        return;
      }
    }

    // 执行移动操作
    const dragDisc = tempTracks.value[dragDiscIndex];
    if (!dragDisc) return;

    // 1. 移除
    dragDisc.songs.splice(dragSongIndex, 1);

    // 2. 插入
    // 如果是在同一个 Disc，且 dragIndex < insertIndex，移除后后面的元素索引减小了1
    let finalInsertIndex = insertIndex;
    if (dragDiscIndex === discIndex && dragSongIndex < insertIndex) {
      finalInsertIndex--;
    }

    // 插入到目标 Disc
    const targetDisc = tempTracks.value[discIndex];
    if (!targetDisc) return;
    // 确保索引有效
    finalInsertIndex = Math.max(0, Math.min(finalInsertIndex, targetDisc.songs.length));
    targetDisc.songs.splice(finalInsertIndex, 0, draggedItem.value.songId);
  };

  const handleDrop = (discIndex: number, event: DragEvent) => {
    event.preventDefault();
    if (tempTracks.value) {
      album.value.tracks = JSON.parse(JSON.stringify(tempTracks.value));
      hasChanges.value = true;
    }
    handleDragEnd();
  };

  let searchDebounce: ReturnType<typeof setTimeout> | null = null;
  const searchSongs = (discIndex: number) => {
    searchingDisc.value = discIndex;
    if (searchDebounce) clearTimeout(searchDebounce);
    const query = songSearchQuery.value.trim();
    if (!query) {
      songSearchResults.value = [];
      return;
    }
    isSearchingSongs.value = true;
    searchDebounce = setTimeout(async () => {
      try {
        const results = await pb.collection('songs').getList(1, 15, {
          filter: `title ~ "${query}" || artist ~ "${query}"`,
          fields: 'id,title,artist',
        });
        songSearchResults.value = results.items.filter(s => !allLinkedSongIds.value.has(s.id));
      } catch (err) {
        console.error(err);
      } finally {
        isSearchingSongs.value = false;
      }
    }, 300);
  };

  const addSongToDisc = (discIndex: number, song: any) => {
    const disc = album.value.tracks?.[discIndex];
    if (!disc) return;
    disc.songs.push(song.id);
    songCache.value.set(song.id, song);
    songSearchResults.value = songSearchResults.value.filter(s => s.id !== song.id);
    hasChanges.value = true;
  };

  const closeSearch = () => {
    searchingDisc.value = null;
    songSearchQuery.value = '';
    songSearchResults.value = [];
  };

  const markChanged = () => {
    hasChanges.value = true;
  };

  // === 保存 ===
  const saveAlbum = async () => {
    titleError.value = '';
    error.value = '';
    const normalizedTitle = album.value.title?.trim() || '';
    if (!normalizedTitle) {
      titleError.value = '标题不能为空';
      return;
    }

    saving.value = true;
    try {
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
        const { hasConflict, currentUpdated } = await checkVersionConflict();
        if (hasConflict) {
          saving.value = false;
          const shouldForce = await requestVersionConflictResolution(currentUpdated);
          if (!shouldForce) return;
          saving.value = true;
        }
      }

      let index = album.value.index;
      if (!isEdit.value) {
        const maxResult = await pb.collection('albums').getList(1, 1, { sort: '-index', fields: 'index' });
        index = maxResult.items.length > 0 ? ((maxResult.items[0] as any).index as number) + 1 : 1;
      }

      const normalizedTracks = normalizeAlbumTracks(album.value.tracks);

      const payload: Record<string, unknown> = {
        title: normalizedTitle,
        index,
        releaseDate: normalizeDateForStorage(album.value.releaseDate) || '',
        description: album.value.description || '',
        tracks: normalizedTracks,
      };

      if (coverFile.value) {
        payload.cover = coverFile.value;
      } else if (removeCoverFlag.value) {
        payload.cover = '';
      }

      if (isEdit.value) {
        await pb.collection('albums').update(route.params.id as string, payload);
      } else {
        await pb.collection('albums').create(payload);
      }

      await editLock.removeEditLock();
      hasChanges.value = false;
      router.push('/admin/albums');
    } catch (err) {
      console.error('Failed to save album:', err);
      error.value = '保存失败，请检查输入是否完整';
    } finally {
      saving.value = false;
    }
  };

  const cancel = () => {
    if (hasChanges.value && !confirm('有未保存的更改，确定要离开吗？')) return;
    router.push('/admin/albums');
  };

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasChanges.value) {
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
    if (coverPreviewUrl.value) URL.revokeObjectURL(coverPreviewUrl.value);
    // 删除编辑锁（Composable 会自动处理，这里显式调用以确保顺序）
    void editLock.dispose();
  });

  const openDatePicker = () => {
    if (!datePicker.value) return;
    try {
      if (typeof (datePicker.value as any).showPicker === 'function') (datePicker.value as any).showPicker();
      else datePicker.value.click();
    } catch (e) {
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
        if (value.length > 6) formatted += '/' + value.slice(6, 8);
      }
    }
    album.value.releaseDate = formatted;
  };
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <h1 class="text-2xl font-semibold text-[#c9c9c9] flex items-center gap-3">
          {{ isEdit ? '编辑专辑' : '新建专辑' }}
          <span v-if="isEdit && !loading && album.index" class="text-lg text-[#888] font-normal"
            >#{{ album.index }}</span
          >
        </h1>
      </div>
      <div class="flex gap-3">
        <button
          class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors inline-flex items-center gap-2"
          @click="cancel"
        >
          <AppIcon name="close" class-name="w-4 h-4" /> 取消
        </button>
        <button
          class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors flex items-center gap-2"
          :disabled="saving"
          @click="saveAlbum"
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
            <AppIcon name="info" class-name="w-5 h-5 text-red-300" /> 基本信息
          </h2>
          <AdminInput
            v-model="album.title"
            label="专辑名"
            placeholder="专辑名"
            required
            :error="titleError"
            @clear="titleError = ''"
            @update:model-value="markChanged"
          />
          <div class="space-y-2">
            <label class="text-sm text-[#888]">发布日期</label>
            <div class="relative group">
              <input
                :value="album.releaseDate"
                type="text"
                placeholder="YYYY/MM/DD"
                class="w-full px-4 py-2.5 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all pr-24"
                @input="handleDateInput"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  v-if="album.releaseDate"
                  class="p-1.5 text-[#888] hover:text-red-300 transition-colors"
                  @click="album.releaseDate = ''"
                  ><AppIcon name="close" class-name="w-4 h-4"
                /></button>
                <button class="p-1.5 text-[#888] hover:text-red-300 transition-colors" @click="openDatePicker"
                  ><AppIcon name="calendar" class-name="w-5 h-5"
                /></button>
                <input
                  ref="datePicker"
                  type="date"
                  class="absolute opacity-0 pointer-events-none w-0 h-0"
                  @change="(e: any) => (album.releaseDate = e.target.value)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 描述 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <AdminInput
            v-model="album.description"
            label="描述"
            icon="info"
            type="markdown"
            placeholder="专辑描述"
            label-size="lg"
            @update:model-value="markChanged"
          />
        </div>

        <!-- 曲目管理 -->
        <div
          class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4"
          @dragover="handleGlobalDragOver"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
              <AppIcon name="music" class-name="w-5 h-5 text-red-300" /> 曲目管理
            </h2>
            <button
              class="text-sm text-red-300 hover:text-[#fca5a5] transition-colors inline-flex items-center gap-1"
              @click="addDisc"
            >
              <AppIcon name="plus" class-name="w-4 h-4" /> 添加 Disc
            </button>
          </div>

          <div
            v-for="(disc, discIndex) in previewTracks"
            :key="disc.disc"
            class="border border-[#c9c9c9]/10 rounded-lg p-4 space-y-3"
            :class="{
              'bg-red-300/5': activeDropTarget === discIndex,
            }"
            @dragover="handleDragOver(discIndex, $event)"
            @drop="handleDrop(discIndex, $event)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1">
                <h3 v-if="(previewTracks.length || 0) > 1" class="text-[#c9c9c9] font-medium shrink-0"
                  >Disc {{ disc.disc }}</h3
                >
                <h3 v-else class="text-[#c9c9c9] font-medium shrink-0">曲目</h3>
                <div v-if="(previewTracks.length || 0) > 1" class="flex-1 min-w-0 relative">
                  <input
                    :value="album.tracks?.[discIndex]?.name || disc.name"
                    type="text"
                    placeholder="Disc 名称"
                    :class="[
                      'w-full px-3 py-1.5 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50',
                      album.tracks?.[discIndex]?.name && album.tracks[discIndex].name !== `Disc ${disc.disc}`
                        ? 'pr-8'
                        : '',
                    ]"
                    @input="
                      (e: Event) => {
                        if (album.tracks?.[discIndex]) {
                          album.tracks[discIndex].name = (e.target as HTMLInputElement).value;
                          markChanged();
                        }
                      }
                    "
                  />
                  <button
                    v-if="album.tracks?.[discIndex]?.name && album.tracks[discIndex].name !== `Disc ${disc.disc}`"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-[#888] hover:text-red-300 transition-colors p-0.5"
                    title="还原为默认名称"
                    @click="
                      () => {
                        if (album.tracks?.[discIndex]) {
                          album.tracks[discIndex].name = `Disc ${disc.disc}`;
                          markChanged();
                        }
                      }
                    "
                  >
                    <AppIcon name="close" class-name="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <button
                v-if="(previewTracks.length || 0) > 1"
                class="text-red-400 hover:text-red-300 p-1 ml-2"
                @click="confirmRemoveDisc(discIndex)"
              >
                <AppIcon name="trash" class-name="w-4 h-4" />
              </button>
            </div>

            <div v-if="disc.songs.length > 0" class="space-y-1">
              <div
                v-for="(songId, songIndex) in disc.songs"
                :key="songId"
                class="flex items-center gap-3 p-2 bg-black/20 rounded group cursor-move transition-all"
                :class="{
                  'opacity-40': draggedItem?.songId === songId,
                }"
                :data-song-id="songId"
                draggable="true"
                @dragstart="handleDragStart(discIndex, songIndex, $event)"
                @dragend="handleDragEnd"
              >
                <AppIcon name="drag" class-name="w-4 h-4 text-[#666] shrink-0" />
                <span class="text-[#888] text-xs w-5 text-right">{{ songIndex + 1 }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-[#c9c9c9] text-sm truncate">{{ getSongName(songId) }}</p>
                  <p v-if="getSongArtist(songId)" class="text-[#888] text-xs truncate">{{ getSongArtist(songId) }}</p>
                </div>
                <button
                  class="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  @click="removeSongFromDisc(discIndex, songIndex)"
                >
                  <AppIcon name="close" class-name="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- 搜索添加歌曲 -->
            <div v-if="searchingDisc === discIndex" class="space-y-2">
              <input
                v-model="songSearchQuery"
                type="text"
                placeholder="搜索歌曲标题或艺人"
                class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                @input="searchSongs(discIndex)"
              />
              <div v-if="songSearchResults.length > 0" class="max-h-40 overflow-y-auto space-y-1">
                <button
                  v-for="result in songSearchResults"
                  :key="result.id"
                  class="w-full text-left p-2 bg-black/10 hover:bg-white/5 rounded text-sm transition-colors"
                  @click="addSongToDisc(discIndex, result)"
                >
                  <span class="text-[#c9c9c9]">{{ result.title }}</span>
                  <span v-if="result.artist" class="text-[#888] ml-2">{{ formatArrayField(result.artist) }}</span>
                </button>
              </div>
              <div v-else-if="songSearchQuery.trim() && !isSearchingSongs" class="text-xs text-[#888] py-2"
                >未找到匹配的歌曲</div
              >
              <button class="text-xs text-[#888] hover:text-[#c9c9c9] transition-colors" @click="closeSearch"
                >关闭搜索</button
              >
            </div>
            <button
              v-else
              class="text-sm text-red-300/70 hover:text-red-300 transition-colors inline-flex items-center gap-1"
              @click="
                searchingDisc = discIndex;
                songSearchQuery = '';
              "
            >
              <AppIcon name="plus" class-name="w-3 h-3" /> 添加歌曲
            </button>
          </div>
        </div>
      </div>

      <div class="lg:col-span-4 lg:order-2 space-y-6">
        <!-- 封面 -->
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
          <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
            <AppIcon name="image" class-name="w-5 h-5 text-red-300" /> 专辑封面
          </h2>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleCoverSelect" />

          <div v-if="currentCoverUrl" class="relative group aspect-square rounded-lg overflow-hidden">
            <img :src="currentCoverUrl" class="w-full h-full object-cover" />
            <div
              class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
            >
              <button
                class="text-xs text-[#c9c9c9] hover:text-red-300 px-2 py-1 bg-black/40 rounded"
                @click="fileInput?.click()"
                >更换</button
              >
              <button class="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-black/40 rounded" @click="removeCover"
                >删除</button
              >
            </div>
          </div>
          <div
            v-else
            class="aspect-square rounded-lg border-2 border-dashed border-[#c9c9c9]/20 flex flex-col items-center justify-center cursor-pointer hover:border-red-300/50 transition-colors"
            @click="fileInput?.click()"
          >
            <AppIcon name="image-placeholder" class-name="w-12 h-12 mx-auto text-[#888] mb-2" />
            <p class="text-sm text-[#888]">点击上传封面</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <VersionConflictDialog
    :visible="showVersionConflictDialog"
    title="该专辑"
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

  <!-- 删除 Disc 确认弹窗 -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showDeleteDiscConfirm"
        class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="cancelRemoveDisc"
      >
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl max-w-sm w-full p-6 shadow-2xl">
          <h3 class="text-xl font-semibold text-[#c9c9c9] mb-2">确认删除 Disc</h3>
          <p class="text-[#888] mb-3">
            确定要删除 "{{ discToDeleteName }}" 吗？此操作将同时移除该 Disc 中的 {{ discToDeleteSongCount }} 首歌曲。
          </p>
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
              @click="cancelRemoveDisc"
            >
              取消
            </button>
            <button
              class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              @click="executeRemoveDisc"
            >
              <AppIcon name="trash" class-name="w-4 h-4" />
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
