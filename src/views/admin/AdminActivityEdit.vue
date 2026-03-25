<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import { pb, parseDateTimeFromBackend, normalizeDateTimeForStorage } from '@/lib/pocketbase';
  import { useEditLock } from '@/composables/useEditLock';
  import { uploadStore } from '@/stores/uploadStore';
  import { batchDeleteActivityImages, batchUpdateActivityImageSort } from '@/lib/batchOperations';
  import EditLockConflictDialog from '@/components/EditLockConflictDialog.vue';
  import EditLockWarning from '@/components/EditLockWarning.vue';
  import VersionConflictDialog from '@/components/VersionConflictDialog.vue';
  import AdminInput from '@/components/AdminInput.vue';
  import type { Activity, ActivityTimeSlot, TicketTier, TicketPlatform } from '@/types';
  import type { ActivityImageWithFile } from '@/types/admin';
  import type { BatchUploadTask } from '@/types/upload';
  import { DEFAULT_TIME_INPUT_MODE } from '@/types';
  import AppIcon from '@/components/AppIcon.vue';

  type ActivityPreviewSlot =
    | { type: 'image'; image: ActivityImageWithFile; originalIndex: number }
    | { type: 'placeholder'; key: string };

  const router = useRouter();
  const route = useRoute();

  const isNew = computed(() => route.name === 'admin-activity-new');
  const activityId = computed(() => {
    const id = route.params.id;
    return typeof id === 'string' ? id : '';
  });

  const loading = ref(true);
  const saving = ref(false);
  const error = ref('');
  const titleError = ref('');
  let isDisposed = false;
  const showVersionConflictDialog = ref(false);
  const latestConflictUpdated = ref<string | null>(null);
  const versionConflictSecondaryWarning = ref<string | null>(null);
  let versionConflictResolver: ((force: boolean) => void) | null = null;

  const originalUpdated = ref<string | null>(null);
  const currentBatchTask = ref<BatchUploadTask | null>(null);

  const editLock = useEditLock({
    collection: 'activities',
    recordId: activityId,
    isEdit: computed(() => !isNew.value),
  });

  const activity = ref<Partial<Activity>>({
    title: '',
    timeSlots: [],
    location: '',
    saleStartTimes: [],
    ticketTiers: [],
    ticketPlatforms: [],
    lineup: [],
    tags: [],
    description: '',
  });

  const tagInput = ref('');
  const saleStartTimeInput = ref('');
  const hasChanges = ref(false);

  const images = ref<ActivityImageWithFile[]>([]);
  const imagesToDelete = ref<string[]>([]);
  const draggedIndex = ref<number | null>(null);
  const dropTargetIndex = ref<number | null>(null);
  const isDraggingOver = ref(false);
  const dragCounter = ref(0);
  let dragPreviewElement: HTMLElement | null = null;
  let dragStartTimer: number | null = null;

  const fileInput = ref<HTMLInputElement | null>(null);

  const hasUnsavedFiles = computed(() => currentBatchTask.value !== null);
  const canSave = computed(() => !saving.value && activity.value.title?.trim());

  const previewSlots = computed<ActivityPreviewSlot[]>(() => {
    const slots: ActivityPreviewSlot[] = images.value.map((image, originalIndex) => ({
      type: 'image',
      image,
      originalIndex,
    }));

    if (draggedIndex.value === null) {
      return slots;
    }

    const remainingSlots = slots.filter(slot => slot.type !== 'image' || slot.originalIndex !== draggedIndex.value);
    const insertionIndex = Math.max(0, Math.min(dropTargetIndex.value ?? draggedIndex.value, remainingSlots.length));

    remainingSlots.splice(insertionIndex, 0, {
      type: 'placeholder',
      key: `placeholder-${draggedIndex.value}`,
    });

    return remainingSlots;
  });

  onMounted(async () => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    if (!isNew.value) {
      await fetchActivity();
      if (!error.value) {
        window.setTimeout(() => {
          void editLock.createEditLock();
        }, 0);
      }
    } else {
      loading.value = false;
    }
  });

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
      uploadStore.attachTaskLock(task.id, lockId, 'activities');
      editLock.currentLockId.value = null;
    }
  };

  const fetchActivity = async () => {
    if (!activityId.value) {
      error.value = '活动 ID 无效';
      loading.value = false;
      return;
    }

    try {
      const record = await pb.collection('activities').getOne(activityId.value);
      originalUpdated.value = record.updated;

      activity.value = {
        ...record,
        timeSlots: parseTimeSlots(record.timeSlots),
        tags: Array.isArray(record.tags) ? record.tags : [],
        ticketTiers: Array.isArray(record.ticketTiers) ? record.ticketTiers : [],
        ticketPlatforms: Array.isArray(record.ticketPlatforms) ? record.ticketPlatforms : [],
        lineup: Array.isArray(record.lineup) ? record.lineup : [],
        saleStartTimes: Array.isArray(record.saleStartTimes)
          ? record.saleStartTimes.map((t: string) => parseDateTimeFromBackend(t))
          : [],
      } as unknown as Activity;

      const imagesRes = await pb.collection('activity_images').getFullList({
        filter: `activity = "${activityId.value}"`,
        sort: 'sort',
      });

      images.value.forEach(img => {
        if (img.localUrl) {
          URL.revokeObjectURL(img.localUrl);
        }
      });

      images.value = imagesRes.map(img => ({
        ...img,
        collectionId: img.collectionId || '',
        collectionName: img.collectionName || 'activity_images',
        created: img.created,
        updated: img.updated,
        id: img.id,
        image: img.image,
        activity: img.activity,
        sort: img.sort,
      })) as ActivityImageWithFile[];
    } catch (err) {
      console.error('Failed to fetch activity:', err);
      error.value = '获取活动信息失败';
    } finally {
      loading.value = false;
    }
  };

  const parseTimeSlots = (raw: unknown): ActivityTimeSlot[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((slot: any) => {
        const type = slot.type === 'date' ? 'date' : 'datetime';
        let start = slot.start || '';
        let end = slot.end || undefined;

        if (type === 'date') {
          if (start.includes('T')) start = start.split('T')[0];
          if (start.includes(' ')) start = start.split(' ')[0];
          if (end && end.includes('T')) end = end.split('T')[0];
          if (end && end.includes(' ')) end = end.split(' ')[0];
        } else {
          if (start) {
            const startDate = new Date(start);
            if (!isNaN(startDate.getTime())) start = toDateTimeLocal(startDate);
          }
          if (end) {
            const endDate = new Date(end);
            if (!isNaN(endDate.getTime())) end = toDateTimeLocal(endDate);
          }
        }

        return { type, start, end };
      });
    }
    return [];
  };

  const addTimeSlot = () => {
    const newSlot: ActivityTimeSlot = {
      type: DEFAULT_TIME_INPUT_MODE,
      start: toDateTimeLocal(new Date()),
      end: toDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    };
    activity.value.timeSlots = [...(activity.value.timeSlots || []), newSlot];
    markChanged();
  };

  const removeTimeSlot = (index: number) => {
    const slots = activity.value.timeSlots || [];
    activity.value.timeSlots = slots.filter((_, i) => i !== index);
    markChanged();
  };

  const toggleSlotType = (index: number) => {
    const slots = activity.value.timeSlots || [];
    const slot = slots[index];
    if (!slot) return;

    const newType = slot.type === 'datetime' ? 'date' : 'datetime';
    const newSlot: ActivityTimeSlot = {
      type: newType,
      start: newType === 'datetime' ? toDateTimeLocal(new Date()) : toDateString(new Date()),
      end: newType === 'datetime' ? toDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000)) : undefined,
    };
    slots[index] = newSlot;
    activity.value.timeSlots = [...slots];
    markChanged();
  };

  const toDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // === 标签管理 ===
  const addTag = () => {
    const tag = tagInput.value.trim();
    if (tag && !activity.value.tags?.includes(tag)) {
      activity.value.tags = [...(activity.value.tags || []), tag];
      tagInput.value = '';
      markChanged();
    }
  };

  const removeTag = (tag: string) => {
    activity.value.tags = activity.value.tags?.filter(t => t !== tag);
    markChanged();
  };

  // === 起售时间管理 ===
  const addSaleStartTime = () => {
    const time = saleStartTimeInput.value.trim();
    if (time && !activity.value.saleStartTimes?.includes(time)) {
      activity.value.saleStartTimes = [...(activity.value.saleStartTimes || []), time];
      saleStartTimeInput.value = '';
      markChanged();
    }
  };

  const removeSaleStartTime = (time: string) => {
    activity.value.saleStartTimes = activity.value.saleStartTimes?.filter(t => t !== time);
    markChanged();
  };

  // === 阵容管理 ===
  const lineupInput = ref('');

  const addLineup = () => {
    const name = lineupInput.value.trim();
    if (name && !activity.value.lineup?.includes(name)) {
      activity.value.lineup = [...(activity.value.lineup || []), name];
      lineupInput.value = '';
      markChanged();
    }
  };

  const removeLineup = (name: string) => {
    activity.value.lineup = activity.value.lineup?.filter(n => n !== name);
    markChanged();
  };

  // === 票档管理 ===
  const newTicketTier = ref<TicketTier>({ price: '', name: '', description: '' });

  const addTicketTier = () => {
    if (newTicketTier.value.price.trim()) {
      activity.value.ticketTiers = [...(activity.value.ticketTiers || []), { ...newTicketTier.value }];
      newTicketTier.value = { price: '', name: '', description: '' };
      markChanged();
    }
  };

  const removeTicketTier = (index: number) => {
    const tiers = activity.value.ticketTiers || [];
    activity.value.ticketTiers = tiers.filter((_, i) => i !== index);
    markChanged();
  };

  // === 开票平台管理 ===
  const newTicketPlatform = ref<TicketPlatform>({ name: '', url: '' });

  const addTicketPlatform = () => {
    if (newTicketPlatform.value.name.trim()) {
      activity.value.ticketPlatforms = [...(activity.value.ticketPlatforms || []), { ...newTicketPlatform.value }];
      newTicketPlatform.value = { name: '', url: '' };
      markChanged();
    }
  };

  const removeTicketPlatform = (index: number) => {
    const platforms = activity.value.ticketPlatforms || [];
    activity.value.ticketPlatforms = platforms.filter((_, i) => i !== index);
    markChanged();
  };

  // === 图片管理 ===
  const addFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    markChanged();

    const nextSort = images.value.length > 0 ? Math.max(...images.value.map(img => img.sort || 0)) + 1 : 1;

    const filesToUpload: File[] = [];
    const sorts: number[] = [];
    const clientIds: string[] = [];
    const pendingImages: ActivityImageWithFile[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]!;
      const id = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const localUrl = URL.createObjectURL(file);
      const sort = nextSort + i;

      const tempImage: ActivityImageWithFile = {
        id,
        collectionId: '',
        collectionName: 'activity_images',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        image: file.name,
        activity: activityId.value || '',
        sort,
        file,
        isNew: true,
        localUrl,
      };
      images.value.push(tempImage);
      pendingImages.push(tempImage);

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
      pendingImages.forEach((image, index) => {
        image.uploadTaskFileId = appendedFiles[index]?.id;
      });
      return;
    }

    currentBatchTask.value = uploadStore.addBatchTask({
      type: 'activity_images',
      targetId: activityId.value || 'new',
      targetType: 'activity',
      targetName: activity.value.title || '新建活动',
      files: filesToUpload,
      sorts,
      clientIds,
    });

    pendingImages.forEach((image, index) => {
      image.uploadTaskFileId = currentBatchTask.value?.files[index]?.id;
    });
  };

  const triggerFileInput = () => {
    fileInput.value?.click();
  };

  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      addFiles(Array.from(target.files));
      target.value = '';
    }
  };

  const removeImage = async (index: number) => {
    const img = images.value[index];
    if (!img) return;

    if (img.localUrl) {
      URL.revokeObjectURL(img.localUrl);
    }

    if (img.id.startsWith('pending-')) {
      images.value.splice(index, 1);
      if (currentBatchTask.value && img.uploadTaskFileId) {
        uploadStore.removeFileFromTask(currentBatchTask.value.id, img.uploadTaskFileId);
        const taskStillExists = uploadStore.tasks.value.some(task => task.id === currentBatchTask.value?.id);
        if (!taskStillExists) {
          currentBatchTask.value = null;
        }
      }
    } else if (!img.isNew) {
      imagesToDelete.value.push(img.id);
      images.value.splice(index, 1);
    }

    markChanged();
  };

  const cleanupDragPreview = () => {
    if (!dragPreviewElement) return;
    dragPreviewElement.remove();
    dragPreviewElement = null;
  };

  const clearPendingDragStart = () => {
    if (dragStartTimer !== null) {
      window.clearTimeout(dragStartTimer);
      dragStartTimer = null;
    }
  };

  const handleDragStart = (index: number, event: DragEvent) => {
    const target = event.currentTarget as HTMLElement | null;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.dropEffect = 'move';
      event.dataTransfer.setData('text/plain', String(index));

      if (target) {
        cleanupDragPreview();

        const rect = target.getBoundingClientRect();
        const preview = target.cloneNode(true) as HTMLElement;
        preview.style.position = 'fixed';
        preview.style.top = '-10000px';
        preview.style.left = '-10000px';
        preview.style.width = `${rect.width}px`;
        preview.style.height = `${rect.height}px`;
        preview.style.pointerEvents = 'none';
        preview.style.margin = '0';
        preview.style.transform = 'none';
        preview.style.opacity = '1';
        preview.style.zIndex = '100000';
        document.body.appendChild(preview);
        dragPreviewElement = preview;

        event.dataTransfer.setDragImage(preview, rect.width / 2, rect.height / 2);
      }
    }

    clearPendingDragStart();
    dragStartTimer = window.setTimeout(() => {
      draggedIndex.value = index;
      dropTargetIndex.value = index;
      dragStartTimer = null;
    }, 0);
  };

  const handleDragEnd = () => {
    clearPendingDragStart();
    cleanupDragPreview();
    draggedIndex.value = null;
    dropTargetIndex.value = null;
  };

  const isFileDragEvent = (e: DragEvent): boolean => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  };

  const handleSortPreview = (index: number) => {
    if (draggedIndex.value === null) return;
    dropTargetIndex.value = index;
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (draggedIndex.value !== null || !isFileDragEvent(e)) return;
    dragCounter.value++;
    if (dragCounter.value === 1) {
      isDraggingOver.value = true;
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if (draggedIndex.value !== null || !isFileDragEvent(e)) return;
    dragCounter.value--;
    if (dragCounter.value === 0) {
      isDraggingOver.value = false;
    }
  };

  const handleDragOver = (e: DragEvent) => {
    if (draggedIndex.value !== null || isFileDragEvent(e)) {
      e.preventDefault();
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    dragCounter.value = 0;
    isDraggingOver.value = false;
    clearPendingDragStart();

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      await addFiles(Array.from(e.dataTransfer.files));
      cleanupDragPreview();
      return;
    }

    if (draggedIndex.value !== null && dropTargetIndex.value !== null) {
      const fromIndex = draggedIndex.value;
      const toIndex = dropTargetIndex.value;
      const [moved] = images.value.splice(fromIndex, 1);

      if (moved) {
        images.value.splice(toIndex, 0, moved);
        if (fromIndex !== toIndex) {
          markChanged();
        }
      }
    }

    cleanupDragPreview();
    draggedIndex.value = null;
    dropTargetIndex.value = null;
  };

  const handleDragOverItem = (slotIndex: number) => {
    if (draggedIndex.value === null) return;
    handleSortPreview(slotIndex);
  };

  const markChanged = () => {
    hasChanges.value = true;
  };

  const latestEditPath = computed(() => {
    if (isNew.value) {
      return router.resolve({ name: 'admin-activity-new' }).href;
    }
    return router.resolve({ name: 'admin-activity-edit', params: { id: activityId.value } }).href;
  });

  const requestVersionConflictResolution = (
    latestUpdated?: string | null,
    secondaryWarning?: string | null
  ): Promise<boolean> => {
    latestConflictUpdated.value = latestUpdated || null;
    versionConflictSecondaryWarning.value = secondaryWarning || null;
    showVersionConflictDialog.value = true;

    return new Promise(resolve => {
      versionConflictResolver = resolve;
    });
  };

  const resolveVersionConflict = (force: boolean) => {
    showVersionConflictDialog.value = false;
    versionConflictSecondaryWarning.value = null;
    const resolver = versionConflictResolver;
    versionConflictResolver = null;
    resolver?.(force);
  };

  const getServerActivityImageIdSet = async (): Promise<Set<string> | null> => {
    if (isNew.value) return null;
    try {
      const serverImages = await pb.collection('activity_images').getFullList({
        filter: `activity = "${activityId.value}"`,
        sort: 'sort',
      });
      return new Set(serverImages.map(image => image.id));
    } catch (err) {
      console.error('Failed to fetch current activity images:', err);
      return null;
    }
  };

  const getImagesForSave = (serverImageIds?: Set<string> | null): ActivityImageWithFile[] => {
    if (!serverImageIds) return [...images.value];
    return images.value.filter(image => image.isNew || image.id.startsWith('pending-') || serverImageIds.has(image.id));
  };

  const checkVersionConflict = async (): Promise<{
    hasConflict: boolean;
    currentUpdated?: string;
  }> => {
    if (isNew.value || !originalUpdated.value) return { hasConflict: false };

    try {
      const current = await pb.collection('activities').getOne(activityId.value);
      if (current.updated !== originalUpdated.value) {
        return { hasConflict: true, currentUpdated: current.updated };
      }
      return { hasConflict: false };
    } catch (err) {
      console.error('Failed to check version:', err);
      return { hasConflict: false };
    }
  };

  const saveActivity = async () => {
    titleError.value = '';

    if (tagInput.value.trim()) addTag();
    if (lineupInput.value.trim()) addLineup();
    if (saleStartTimeInput.value.trim()) addSaleStartTime();
    if (newTicketTier.value.price.trim()) addTicketTier();
    if (newTicketPlatform.value.name.trim()) addTicketPlatform();

    if (!activity.value.title?.trim()) {
      titleError.value = '活动名称不能为空';
      return;
    }

    saving.value = true;
    error.value = '';

    try {
      const lockMessage = await editLock.checkEditLock();
      if (lockMessage) {
        saving.value = false;
        const shouldForceSubmit = await editLock.requestEditLockConflictResolution(lockMessage);
        if (!shouldForceSubmit) return;
        const tookOverLock = await editLock.forceTakeoverEditLock();
        if (!tookOverLock) return;
        saving.value = true;
      }

      const hasLock = await editLock.ensureEditLock();
      if (!hasLock) {
        saving.value = false;
        const shouldForceSubmit = await editLock.requestEditLockConflictResolution(editLock.lockWarning.value);
        if (!shouldForceSubmit) return;
        const tookOverLock = await editLock.forceTakeoverEditLock();
        if (!tookOverLock) return;
        saving.value = true;
      }

      const { hasConflict, currentUpdated } = await checkVersionConflict();
      if (hasConflict) {
        saving.value = false;
        const shouldForce = await requestVersionConflictResolution(currentUpdated);
        if (!shouldForce) return;
        saving.value = true;
      }

      const imageIdsToDelete = [...imagesToDelete.value];
      if (imageIdsToDelete.length > 0) {
        const result = await batchDeleteActivityImages(imageIdsToDelete);
        if (result.failed.length > 0) {
          console.warn('Failed to delete images:', result.failed);
        }
      }
      imagesToDelete.value = [];

      const formData = new FormData();
      formData.append('title', activity.value.title.trim());
      formData.append('location', activity.value.location || '');

      const saleStartTimesData = (activity.value.saleStartTimes || [])
        .map(t => normalizeDateTimeForStorage(t))
        .filter(t => t);
      formData.append('saleStartTimes', JSON.stringify(saleStartTimesData));
      formData.append('ticketTiers', JSON.stringify(activity.value.ticketTiers || []));
      formData.append('ticketPlatforms', JSON.stringify(activity.value.ticketPlatforms || []));
      formData.append('lineup', JSON.stringify(activity.value.lineup || []));
      formData.append('tags', JSON.stringify(activity.value.tags || []));
      formData.append('description', activity.value.description || '');

      const timeSlotsData = activity.value.timeSlots?.map(slot => {
        if (slot.type === 'date') {
          const startStr = slot.start.includes('T') ? slot.start.split('T')[0] : slot.start;
          const endStr = slot.end ? (slot.end.includes('T') ? slot.end.split('T')[0] : slot.end) : null;
          return {
            type: 'date',
            start: startStr ? `${startStr} 00:00:00.000Z` : '',
            end: endStr ? `${endStr} 00:00:00.000Z` : null,
          };
        }
        return {
          type: slot.type,
          start: slot.start ? new Date(slot.start).toISOString() : '',
          end: slot.end ? new Date(slot.end).toISOString() : null,
        };
      });
      formData.append('timeSlots', JSON.stringify(timeSlotsData || []));

      let targetActivityId: string;

      if (isNew.value) {
        const maxIndexResult = await pb.collection('activities').getList(1, 1, {
          sort: '-index',
          fields: 'index',
        });
        const nextIndex = maxIndexResult.items.length > 0 ? ((maxIndexResult.items[0] as any).index as number) + 1 : 1;
        formData.append('index', String(nextIndex));

        const created = await pb.collection('activities').create(formData);
        targetActivityId = created.id;
      } else {
        await pb.collection('activities').update(activityId.value, formData);
        targetActivityId = activityId.value;
      }

      if (currentBatchTask.value) {
        currentBatchTask.value.targetId = targetActivityId;
        currentBatchTask.value.targetName = activity.value.title || '';
      }

      const serverImageIdsForSave = !isNew.value ? await getServerActivityImageIdSet() : null;
      const imagesForSave = getImagesForSave(serverImageIdsForSave);

      imagesForSave.forEach((img, index) => {
        img.sort = index + 1;
      });

      if (currentBatchTask.value) {
        imagesForSave.forEach((img, index) => {
          if (!img.uploadTaskFileId) return;
          const pendingFile = currentBatchTask.value?.files.find(file => file.id === img.uploadTaskFileId);
          if (pendingFile) {
            pendingFile.sort = index + 1;
          }
        });
      }

      if (!isNew.value) {
        const sortTargets = imagesForSave
          .map((img, index) => ({ id: img.id, sort: index + 1 }))
          .filter(
            (item, index) =>
              imagesForSave[index] &&
              !imagesForSave[index].isNew &&
              !imagesForSave[index].id.startsWith('pending-') &&
              (!serverImageIdsForSave || serverImageIdsForSave.has(item.id))
          );

        if (sortTargets.length > 0) {
          const result = await batchUpdateActivityImageSort(sortTargets);
          if (result.failed.length > 0) {
            console.warn('Failed to update sort order:', result.failed);
          }
        }
      }

      if (currentBatchTask.value) {
        await handoffEditLockToTask(currentBatchTask.value, targetActivityId);
        uploadStore.startPendingTasks(targetActivityId, 'activity');
        currentBatchTask.value = null;
      } else {
        await editLock.removeEditLock();
      }

      hasChanges.value = false;
      router.push('/admin/activities');
    } catch (err) {
      console.error('Failed to save activity:', err);
      error.value = '保存失败，请重试';
    } finally {
      saving.value = false;
    }
  };

  const cancelEdit = () => {
    if (hasChanges.value || hasUnsavedFiles.value) {
      if (!confirm('有未保存的更改，确定要离开吗？')) return;
    }

    if (currentBatchTask.value?.status === 'pending') {
      uploadStore.discardTask(currentBatchTask.value.id);
      currentBatchTask.value = null;
    }

    router.push('/admin/activities');
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

  onUnmounted(async () => {
    isDisposed = true;
    window.removeEventListener('dragenter', handleDragEnter);
    window.removeEventListener('dragleave', handleDragLeave);
    window.removeEventListener('dragover', handleDragOver);
    window.removeEventListener('drop', handleDrop);
    window.removeEventListener('beforeunload', handleBeforeUnload);

    images.value.forEach(img => {
      if (img.localUrl) {
        URL.revokeObjectURL(img.localUrl);
      }
    });

    if (currentBatchTask.value?.status === 'pending') {
      uploadStore.discardTask(currentBatchTask.value.id);
      currentBatchTask.value = null;
    }

    clearPendingDragStart();
    cleanupDragPreview();
    await editLock.dispose();
  });
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <h1 class="text-2xl font-semibold text-[#c9c9c9] flex items-center gap-3">
          {{ isNew ? '新建活动' : '编辑活动' }}
          <span v-if="!isNew && !loading && activity.index" class="text-lg text-[#888] font-normal"
            >#{{ activity.index }}</span
          >
        </h1>
      </div>
      <div class="flex gap-3">
        <button
          tabindex="-1"
          class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors inline-flex items-center gap-2"
          @click="cancelEdit"
        >
          <AppIcon name="close" class-name="w-4 h-4" />
          取消
        </button>
        <button
          tabindex="-1"
          :disabled="!canSave"
          class="px-6 py-2 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          @click="saveActivity"
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

    <div v-else class="max-w-4xl mx-auto space-y-6">
      <!-- 基本信息 -->
      <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
        <h2 class="text-lg font-semibold text-[#c9c9c9] border-b border-[#c9c9c9]/20 pb-3 flex items-center gap-2">
          <AppIcon name="info" class-name="w-5 h-5 text-red-300" />
          基本信息
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminInput
            v-model="activity.title"
            label="名称"
            placeholder="活动名称"
            required
            :error="titleError"
            @clear="titleError = ''"
            @input="markChanged"
          />

          <AdminInput v-model="activity.location" label="地点" placeholder="活动地点" @input="markChanged" />
        </div>
      </div>

      <!-- 起售时间 -->
      <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
        <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
          <AppIcon name="ticket" class-name="w-5 h-5 text-red-300" />
          起售时间
        </h2>
        <div class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="time in activity.saleStartTimes"
            :key="time"
            class="inline-flex items-center gap-1 px-3 py-1 bg-red-300/10 text-red-300 rounded-full text-sm"
          >
            {{ time }}
            <button
              tabindex="-1"
              class="-m-1 p-1 hover:text-white transition-colors"
              @click="removeSaleStartTime(time)"
            >
              <AppIcon name="close" class-name="w-4 h-4" />
            </button>
          </span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="saleStartTimeInput"
            type="datetime-local"
            class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
          />
          <button
            tabindex="-1"
            class="px-4 py-2 bg-white/5 text-[#c9c9c9] rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-1"
            @click="addSaleStartTime"
          >
            <AppIcon name="plus" class-name="w-4 h-4" />
            添加
          </button>
        </div>
      </div>

      <!-- 阵容 -->
      <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
        <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
          <AppIcon name="user" class-name="w-5 h-5 text-red-300" />
          阵容
        </h2>
        <div class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="name in activity.lineup"
            :key="name"
            class="inline-flex items-center gap-1 px-3 py-1 bg-red-300/10 text-red-300 rounded-full text-sm"
          >
            {{ name }}
            <button tabindex="-1" class="-m-1 p-1 hover:text-white transition-colors" @click="removeLineup(name)">
              <AppIcon name="close" class-name="w-4 h-4" />
            </button>
          </span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="lineupInput"
            type="text"
            placeholder="艺人名称"
            class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
            @keyup.enter="addLineup"
          />
          <button
            tabindex="-1"
            class="px-4 py-2 bg-white/5 text-[#c9c9c9] rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-1"
            @click="addLineup"
          >
            <AppIcon name="plus" class-name="w-4 h-4" />
            添加
          </button>
        </div>
      </div>

      <!-- 票档 -->
      <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
        <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
          <AppIcon name="ticket" class-name="w-5 h-5 text-red-300" />
          票档
        </h2>
        <div v-if="activity.ticketTiers && activity.ticketTiers.length > 0" class="space-y-2">
          <div
            v-for="(tier, index) in activity.ticketTiers"
            :key="index"
            class="flex items-start justify-between p-3 bg-black/20 rounded-lg"
          >
            <div>
              <div class="text-red-300 font-medium">{{ tier.price }}</div>
              <div v-if="tier.name" class="text-[#c9c9c9]">{{ tier.name }}</div>
              <div v-if="tier.description" class="text-sm text-[#888] mt-1">{{ tier.description }}</div>
            </div>
            <button
              tabindex="-1"
              class="p-1 text-[#888] hover:text-red-500 transition-colors"
              @click="removeTicketTier(index)"
            >
              <AppIcon name="trash" class-name="w-4 h-4" />
            </button>
          </div>
        </div>
        <div class="space-y-2 p-3 bg-black/10 rounded-lg border border-dashed border-[#c9c9c9]/20">
          <div class="flex gap-2">
            <input
              v-model="newTicketTier.price"
              type="text"
              placeholder="价格 *"
              class="w-28 px-3 py-1.5 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
            />
            <input
              v-model="newTicketTier.name"
              type="text"
              placeholder="票档名称（可选）"
              class="flex-1 px-3 py-1.5 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
            />
          </div>
          <input
            v-model="newTicketTier.description"
            type="text"
            placeholder="描述/权益说明（可选）"
            class="w-full px-3 py-1.5 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
          />
          <button
            tabindex="-1"
            class="w-full py-1.5 bg-white/5 text-[#c9c9c9] rounded hover:bg-white/10 transition-colors text-sm"
            @click="addTicketTier"
          >
            添加票档
          </button>
        </div>
      </div>

      <!-- 开票平台 -->
      <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
        <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
          <AppIcon name="link" class-name="w-5 h-5 text-red-300" />
          开票平台
        </h2>
        <div v-if="activity.ticketPlatforms && activity.ticketPlatforms.length > 0" class="space-y-2">
          <div
            v-for="(platform, index) in activity.ticketPlatforms"
            :key="index"
            class="flex items-center justify-between p-3 bg-black/20 rounded-lg"
          >
            <div>
              <div class="text-[#c9c9c9]">{{ platform.name }}</div>
              <a
                v-if="platform.url"
                :href="platform.url"
                target="_blank"
                class="text-sm text-red-300 hover:underline break-all"
                >{{ platform.url }}</a
              >
            </div>
            <button
              tabindex="-1"
              class="p-1 text-[#888] hover:text-red-500 transition-colors"
              @click="removeTicketPlatform(index)"
            >
              <AppIcon name="trash" class-name="w-4 h-4" />
            </button>
          </div>
        </div>
        <div class="flex gap-2">
          <input
            v-model="newTicketPlatform.name"
            type="text"
            placeholder="平台名称"
            class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
            @keyup.enter="addTicketPlatform"
          />
          <input
            v-model="newTicketPlatform.url"
            type="text"
            placeholder="购票链接（可选）"
            class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
            @keyup.enter="addTicketPlatform"
          />
          <button
            tabindex="-1"
            class="px-4 py-2 bg-white/5 text-[#c9c9c9] rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-1"
            @click="addTicketPlatform"
          >
            <AppIcon name="plus" class-name="w-4 h-4" />
            添加
          </button>
        </div>
      </div>

      <!-- 标签 -->
      <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
        <h2 class="text-lg font-medium text-[#c9c9c9] flex items-center gap-2">
          <AppIcon name="tag" class-name="w-5 h-5 text-red-300" />
          标签
        </h2>
        <div class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="tag in activity.tags"
            :key="tag"
            class="inline-flex items-center gap-1 px-3 py-1 bg-red-300/10 text-red-300 rounded-full text-sm"
          >
            {{ tag }}
            <button tabindex="-1" class="-m-1 p-1 hover:text-white transition-colors" @click="removeTag(tag)">
              <AppIcon name="close" class-name="w-4 h-4" />
            </button>
          </span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="tagInput"
            type="text"
            placeholder="添加标签"
            class="flex-1 px-4 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
            @keyup.enter="addTag"
          />
          <button
            tabindex="-1"
            class="px-4 py-2 bg-white/5 text-[#c9c9c9] rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-1"
            @click="addTag"
          >
            <AppIcon name="plus" class-name="w-4 h-4" />
            添加
          </button>
        </div>
      </div>

      <!-- 时间段管理 -->
      <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
        <div class="flex items-center justify-between border-b border-[#c9c9c9]/20 pb-3">
          <h2 class="text-lg font-semibold text-[#c9c9c9] flex items-center gap-2">
            <AppIcon name="clock" class-name="w-5 h-5 text-red-300" />
            时间段
          </h2>
        </div>

        <div v-if="!activity.timeSlots || activity.timeSlots.length === 0" class="text-center py-8 text-[#888]">
          暂无时间段，点击下方按钮添加
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="(slot, index) in activity.timeSlots"
            :key="index"
            class="bg-black/20 border border-[#c9c9c9]/10 rounded-lg p-4 space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-[#c9c9c9]">时间段 #{{ index + 1 }}</span>
              <div class="flex items-center gap-2">
                <button
                  tabindex="-1"
                  class="flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors"
                  :class="
                    slot.type === 'date' ? 'bg-red-300 text-[rgb(77,0,0)]' : 'bg-white/5 text-[#888] hover:bg-white/10'
                  "
                  @click="toggleSlotType(index)"
                >
                  <div
                    class="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                    :class="slot.type === 'date' ? 'border-[rgb(77,0,0)] bg-[rgb(77,0,0)]' : 'border-current'"
                  >
                    <svg
                      v-if="slot.type === 'date'"
                      class="w-2.5 h-2.5 text-red-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      stroke-width="3"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>仅日期</span>
                </button>
                <button
                  tabindex="-1"
                  class="p-1.5 text-[#888] hover:text-red-500 transition-colors"
                  title="删除"
                  @click="removeTimeSlot(index)"
                >
                  <AppIcon name="trash" class-name="w-4 h-4" />
                </button>
              </div>
            </div>

            <div v-if="slot.type === 'datetime'" class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-xs text-[#888]">开始时间</label>
                <input
                  v-model="slot.start"
                  type="datetime-local"
                  class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                  @input="markChanged"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs text-[#888]">结束时间</label>
                <input
                  v-model="slot.end"
                  type="datetime-local"
                  class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                  @input="markChanged"
                />
              </div>
            </div>

            <div v-else class="space-y-1">
              <label class="text-xs text-[#888]">日期</label>
              <input
                v-model="slot.start"
                type="date"
                class="w-full px-3 py-2 bg-black/20 border border-[#c9c9c9]/20 rounded text-[#e0e0e0] text-sm focus:outline-none focus:border-red-300/50"
                @input="markChanged"
              />
            </div>
          </div>
        </div>

        <button
          tabindex="-1"
          class="w-full py-3 border border-dashed border-[#c9c9c9]/30 rounded-lg text-[#888] hover:text-red-300 hover:border-red-300/50 transition-colors flex items-center justify-center gap-2"
          @click="addTimeSlot"
        >
          <AppIcon name="plus" class-name="w-4 h-4" />
          添加时间段
        </button>
      </div>

      <!-- 活动详情 -->
      <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-4">
        <AdminInput
          v-model="activity.description"
          label="详情"
          icon="info"
          type="markdown"
          placeholder="活动详情"
          label-size="lg"
          @input="markChanged"
          @clear="markChanged"
        />
      </div>

      <!-- 图片管理 -->
      <div class="relative bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 flex flex-col overflow-hidden">
        <div class="relative z-10 bg-[rgb(60,0,0)] flex items-center justify-between border-b border-[#c9c9c9]/20 p-6">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-semibold text-[#c9c9c9] flex items-center gap-2">
              <AppIcon name="image" class-name="w-5 h-5 text-red-300" />
              相关图片
            </h2>
            <span class="text-sm text-[#888]">{{ images.length }} 张图片</span>
          </div>
          <button
            tabindex="-1"
            class="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-[#c9c9c9]/20 rounded-lg text-sm text-[#c9c9c9] transition-colors group"
            @click="triggerFileInput"
          >
            <AppIcon name="plus" class-name="w-4 h-4 text-[#888] group-hover:text-red-300" />
            添加图片
          </button>
        </div>

        <div class="p-6">
          <input ref="fileInput" type="file" multiple accept="image/*" class="hidden" @change="handleFileSelect" />

          <Teleport to="body">
            <div
              v-if="isDraggingOver"
              class="fixed inset-0 bg-black/80 z-10000 flex items-center justify-center pointer-events-none"
            >
              <div class="text-center">
                <AppIcon name="photo" class-name="w-16 h-16 mx-auto text-red-300 mb-4" />
                <p class="text-xl text-[#c9c9c9]">拖放图片到此处上传</p>
              </div>
            </div>
          </Teleport>

          <div v-if="images.length === 0">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <div
                class="aspect-square rounded-lg border-2 border-dashed border-[#c9c9c9]/30 hover:border-red-300/50 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all group"
                @click="triggerFileInput"
                @dragenter="handleDragEnter"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
              >
                <AppIcon name="plus" class-name="w-8 h-8 text-[#888] group-hover:text-red-300 mb-2 transition-colors" />
                <span class="text-sm text-[#888] group-hover:text-red-300 transition-colors">点击或拖动添加图片</span>
              </div>
            </div>
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div v-for="(slot, index) in previewSlots" :key="slot.type === 'image' ? slot.image.id : slot.key">
              <div
                v-if="slot.type === 'placeholder'"
                class="relative aspect-square rounded-lg border-2 border-dashed border-red-300/60 bg-black/10"
                @dragenter.prevent.stop="handleSortPreview(index)"
                @dragover.prevent.stop="handleSortPreview(index)"
                @drop.prevent.stop="handleDrop"
              >
                <div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                  {{ index + 1 }}
                </div>
              </div>

              <div
                v-else
                draggable="true"
                :class="[
                  'group relative aspect-square rounded-lg overflow-hidden bg-[rgb(77,0,0)] cursor-move',
                  slot.image.isNew ? 'ring-2 ring-yellow-500/50' : '',
                ]"
                @dragstart="handleDragStart(slot.originalIndex, $event)"
                @dragend="handleDragEnd"
                @dragenter.prevent.stop="handleDragOverItem(index)"
                @dragover.prevent.stop="handleDragOverItem(index)"
                @drop.prevent.stop="handleDrop"
              >
                <img
                  :src="slot.image.localUrl || pb.files.getURL(slot.image, slot.image.image, { thumb: '0x720' })"
                  :alt="`Image ${index + 1}`"
                  class="w-full h-full object-cover"
                  draggable="false"
                />

                <div
                  v-if="slot.image.isNew"
                  class="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500/80 text-black text-xs font-medium rounded"
                  >未上传
                </div>

                <div
                  class="absolute inset-0 bg-black/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <button
                    tabindex="-1"
                    class="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                    title="删除"
                    @click.stop="removeImage(slot.originalIndex)"
                  >
                    <AppIcon name="trash" class-name="w-5 h-5" />
                  </button>
                </div>

                <div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                  {{ index + 1 }}
                </div>
              </div>
            </div>

            <div
              class="aspect-square rounded-lg border-2 border-dashed border-[#c9c9c9]/30 hover:border-red-300/50 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all group"
              @click="triggerFileInput"
              @dragenter.prevent.stop="handleSortPreview(images.length)"
              @dragover.prevent.stop="handleSortPreview(images.length)"
              @drop.prevent.stop="handleDrop"
            >
              <AppIcon name="plus" class-name="w-8 h-8 text-[#888] group-hover:text-red-300 mb-2 transition-colors" />
              <span class="text-sm text-[#888] group-hover:text-red-300 transition-colors">点击或拖动添加图片</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <VersionConflictDialog
    :visible="showVersionConflictDialog"
    title="该活动"
    :latest-edit-path="latestEditPath"
    :original-updated="originalUpdated"
    :latest-updated="latestConflictUpdated"
    :secondary-warning="versionConflictSecondaryWarning"
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
