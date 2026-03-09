<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import {
    getSkipSingleLockDeleteConfirmPreference,
    updateSkipSingleLockDeleteConfirmPreference,
  } from '@/lib/adminPreferences';
  import { pb } from '@/lib/pocketbase';
  import { formatEditLockDateTime, type EditLockRecord } from '@/lib/editLock';
  import AppIcon from '@/components/AppIcon.vue';

  type ManagedEditLock = EditLockRecord & {
    collectionLabel: string;
    targetTitle: string;
    targetPath?: string;
  };

  type TargetTitleRecord = {
    title?: string | null;
  };

  const router = useRouter();

  const locks = ref<ManagedEditLock[]>([]);
  const loading = ref(true);
  const refreshing = ref(false);
  const searchQuery = ref('');
  const deleteConfirm = ref<string | null>(null);
  const deleting = ref(false);
  const batchDeleteConfirm = ref(false);
  const batchDeleting = ref(false);
  const selectedLockIds = ref<string[]>([]);
  const selectAllCheckbox = ref<HTMLInputElement | null>(null);
  const skipSingleDeleteConfirmDraft = ref(false);
  const error = ref('');

  const UNTITLED_TARGET_TEXT = '未命名记录';
  const MISSING_TARGET_TEXT = '记录不存在';

  const getCollectionLabel = (collection: string): string => {
    switch (collection) {
      case 'albums':
        return '专辑';
      case 'galleries':
        return '图集';
      default:
        return collection;
    }
  };

  const getTargetPath = (collection: string, recordId: string): string | undefined => {
    switch (collection) {
      case 'albums':
        return `/admin/albums/${recordId}`;
      case 'galleries':
        return `/admin/galleries/${recordId}`;
      default:
        return undefined;
    }
  };

  const getTargetKey = (collection: string, recordId: string) => `${collection}:${recordId}`;

  const fetchTargetTitle = async (collection: string, recordId: string): Promise<string> => {
    switch (collection) {
      case 'albums':
      case 'galleries': {
        try {
          const record = await pb.collection(collection).getOne<TargetTitleRecord>(recordId, {
            fields: 'id,title',
          });
          return record.title?.trim() || UNTITLED_TARGET_TEXT;
        } catch {
          return MISSING_TARGET_TEXT;
        }
      }
      default:
        return UNTITLED_TARGET_TEXT;
    }
  };

  const buildTargetTitleMap = async (editLocks: EditLockRecord[]): Promise<Map<string, string>> => {
    const uniqueTargets = Array.from(
      new Map(editLocks.map(lock => [getTargetKey(lock.collection, lock.recordId), lock])).values()
    );

    const entries = await Promise.all(
      uniqueTargets.map(
        async lock =>
          [
            getTargetKey(lock.collection, lock.recordId),
            await fetchTargetTitle(lock.collection, lock.recordId),
          ] as const
      )
    );

    return new Map(entries);
  };

  const mapLock = (lock: EditLockRecord, targetTitleMap: Map<string, string>): ManagedEditLock => ({
    ...lock,
    collectionLabel: getCollectionLabel(lock.collection),
    targetTitle: targetTitleMap.get(getTargetKey(lock.collection, lock.recordId)) || UNTITLED_TARGET_TEXT,
    targetPath: getTargetPath(lock.collection, lock.recordId),
  });

  const filteredLocks = computed(() => {
    if (!searchQuery.value.trim()) return locks.value;

    const query = searchQuery.value.trim().toLowerCase();
    return locks.value.filter(lock => {
      return (
        lock.collection.toLowerCase().includes(query) ||
        lock.collectionLabel.toLowerCase().includes(query) ||
        lock.targetTitle.toLowerCase().includes(query) ||
        lock.recordId.toLowerCase().includes(query) ||
        (lock.username || '').toLowerCase().includes(query)
      );
    });
  });

  const filteredLockIds = computed(() => filteredLocks.value.map(lock => lock.id));
  const selectedLockIdSet = computed(() => new Set(selectedLockIds.value));
  const selectedLocks = computed(() => locks.value.filter(lock => selectedLockIdSet.value.has(lock.id)));
  const selectedCount = computed(() => selectedLocks.value.length);
  const allFilteredSelected = computed(
    () => filteredLockIds.value.length > 0 && filteredLockIds.value.every(id => selectedLockIdSet.value.has(id))
  );
  const someFilteredSelected = computed(
    () => filteredLockIds.value.some(id => selectedLockIdSet.value.has(id)) && !allFilteredSelected.value
  );

  const stats = computed(() => ({
    total: locks.value.length,
    albums: locks.value.filter(lock => lock.collection === 'albums').length,
    galleries: locks.value.filter(lock => lock.collection === 'galleries').length,
    others: locks.value.filter(lock => !['albums', 'galleries'].includes(lock.collection)).length,
  }));

  const syncSelectionWithLocks = () => {
    const existingIds = new Set(locks.value.map(lock => lock.id));
    selectedLockIds.value = selectedLockIds.value.filter(id => existingIds.has(id));
    if (selectedLockIds.value.length === 0) {
      batchDeleteConfirm.value = false;
    }
  };

  watch([allFilteredSelected, someFilteredSelected], () => {
    if (!selectAllCheckbox.value) return;
    selectAllCheckbox.value.indeterminate = someFilteredSelected.value;
  });

  const fetchLocks = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      refreshing.value = true;
    } else {
      loading.value = true;
    }

    error.value = '';

    try {
      const result = await pb.collection('edit_locks').getFullList({
        sort: '-updated',
      });
      const editLocks = result as unknown as EditLockRecord[];
      const targetTitleMap = await buildTargetTitleMap(editLocks);
      locks.value = editLocks.map(lock => mapLock(lock, targetTitleMap));
      syncSelectionWithLocks();
    } catch (fetchError) {
      console.error('Failed to fetch edit locks:', fetchError);
      error.value = '获取编辑锁列表失败，请稍后重试。';
    } finally {
      loading.value = false;
      refreshing.value = false;
    }
  };

  onMounted(async () => {
    await fetchLocks();
  });

  const toggleLockSelection = (lockId: string) => {
    if (selectedLockIdSet.value.has(lockId)) {
      selectedLockIds.value = selectedLockIds.value.filter(id => id !== lockId);
      return;
    }

    selectedLockIds.value = [...selectedLockIds.value, lockId];
  };

  const toggleSelectAllFiltered = () => {
    if (filteredLockIds.value.length === 0) return;

    if (allFilteredSelected.value) {
      const filteredIdSet = new Set(filteredLockIds.value);
      selectedLockIds.value = selectedLockIds.value.filter(id => !filteredIdSet.has(id));
      return;
    }

    const nextSelection = new Set(selectedLockIds.value);
    filteredLockIds.value.forEach(id => nextSelection.add(id));
    selectedLockIds.value = Array.from(nextSelection);
  };

  const confirmDelete = (id: string) => {
    const lock = locks.value.find(item => item.id === id);
    if (!lock) return;

    if (getSkipSingleLockDeleteConfirmPreference()) {
      void deleteLock(lock);
      return;
    }

    skipSingleDeleteConfirmDraft.value = false;
    deleteConfirm.value = id;
  };

  const cancelDelete = () => {
    if (deleting.value) return;
    skipSingleDeleteConfirmDraft.value = false;
    deleteConfirm.value = null;
  };

  const cancelBatchDelete = () => {
    if (batchDeleting.value) return;
    batchDeleteConfirm.value = false;
  };

  const deleteLock = async (lock: ManagedEditLock) => {
    deleting.value = true;
    try {
      if (skipSingleDeleteConfirmDraft.value && !getSkipSingleLockDeleteConfirmPreference()) {
        await updateSkipSingleLockDeleteConfirmPreference(true);
      }

      await pb.collection('edit_locks').delete(lock.id);
      locks.value = locks.value.filter(item => item.id !== lock.id);
      selectedLockIds.value = selectedLockIds.value.filter(id => id !== lock.id);
      skipSingleDeleteConfirmDraft.value = false;
      deleteConfirm.value = null;
    } catch (deleteError) {
      console.error('Failed to delete edit lock:', deleteError);
      alert('移除锁失败，请重试');
    } finally {
      deleting.value = false;
    }
  };

  const deleteSelectedLocks = async () => {
    if (selectedLockIds.value.length === 0) {
      batchDeleteConfirm.value = false;
      return;
    }

    batchDeleting.value = true;

    try {
      const idsToDelete = [...selectedLockIds.value];
      const results = await Promise.allSettled(idsToDelete.map(lockId => pb.collection('edit_locks').delete(lockId)));

      const succeededIds = idsToDelete.filter((_, index) => results[index]?.status === 'fulfilled');
      const failedCount = results.length - succeededIds.length;

      locks.value = locks.value.filter(lock => !succeededIds.includes(lock.id));
      selectedLockIds.value = selectedLockIds.value.filter(id => !succeededIds.includes(id));
      batchDeleteConfirm.value = false;

      if (failedCount > 0) {
        await fetchLocks(true);
        alert(`已尝试批量移除所选锁，但有 ${failedCount} 个锁移除失败，请刷新后重试。`);
      }
    } catch (deleteError) {
      console.error('Failed to bulk delete edit locks:', deleteError);
      alert('批量移除锁失败，请重试');
    } finally {
      batchDeleting.value = false;
    }
  };

  const openTargetRecord = (lock: ManagedEditLock) => {
    if (!lock.targetPath) return;
    router.push(lock.targetPath);
  };
</script>

<template>
  <div class="relative min-h-100">
    <div
      v-if="loading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-[rgb(77,0,0)]/90 backdrop-blur-sm"
    >
      <div class="w-8 h-8 border-2 border-[#c9c9c9]/30 border-t-red-300 rounded-full animate-spin"></div>
    </div>

    <div v-if="loading" class="relative z-30 space-y-6">
      <h1 class="text-2xl font-semibold text-[#c9c9c9]">锁管理</h1>
    </div>

    <div v-else class="relative space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-[#c9c9c9]">锁管理</h1>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            :disabled="batchDeleting || selectedCount === 0"
            class="inline-flex items-center gap-2 px-4 py-2 border border-yellow-400/40 text-yellow-100 hover:bg-yellow-500/10 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="batchDeleteConfirm = true"
          >
            <AppIcon name="trash" class-name="w-5 h-5" />
            {{ selectedCount === 0 ? '删除所选' : `删除所选（${selectedCount}）` }}
          </button>
          <button
            :disabled="refreshing"
            class="inline-flex items-center gap-2 px-4 py-2 border border-red-300/50 text-red-300 hover:bg-white/5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="fetchLocks(true)"
          >
            <AppIcon name="refresh" :class-name="refreshing ? 'w-5 h-5 animate-spin' : 'w-5 h-5'" />
            {{ refreshing ? '刷新中...' : '刷新列表' }}
          </button>
        </div>
      </div>

      <div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
        <p class="text-yellow-400 flex items-start gap-2">
          <AppIcon name="warning" class-name="w-5 h-5 shrink-0 mt-0.5" />
          <span>编辑锁用于避免多人同时编辑同一条记录。只在确认原有锁已经失效时再移除它。</span>
        </p>
        <p class="pl-7 text-sm text-yellow-100/85"
          >如果编辑页异常关闭、浏览器崩溃或网络中断，旧锁可能会残留。移除锁不会修改记录内容，但可能让仍在编辑中的其他人失去并发保护。</p
        >
      </div>

      <div v-if="error" class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <p class="text-red-300">{{ error }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4">
          <p class="text-[#888] text-sm">总计</p>
          <p class="text-2xl font-semibold text-[#c9c9c9] mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4">
          <p class="text-[#888] text-sm">专辑锁</p>
          <p class="text-2xl font-semibold text-[#c9c9c9] mt-1">{{ stats.albums }}</p>
        </div>
        <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4">
          <p class="text-[#888] text-sm">图集锁</p>
          <p class="text-2xl font-semibold text-[#c9c9c9] mt-1">{{ stats.galleries }}</p>
        </div>
        <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-4">
          <p class="text-[#888] text-sm">其他</p>
          <p class="text-2xl font-semibold text-[#c9c9c9] mt-1">{{ stats.others }}</p>
        </div>
      </div>

      <div class="relative">
        <AppIcon name="search" class-name="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888]" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索锁用户、集合或记录 ID"
          class="w-full pl-10 pr-4 py-2.5 bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
        />
      </div>

      <div v-if="filteredLocks.length === 0" class="text-center py-20">
        <p class="text-[#888]">{{ searchQuery ? '没有找到匹配的锁' : '当前没有编辑锁' }}</p>
      </div>

      <div v-else class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 overflow-hidden">
        <table class="w-full text-left">
          <thead class="bg-white/5">
            <tr>
              <th class="px-4 py-3 text-sm font-medium text-[#888] w-14">
                <div class="flex items-center justify-center">
                  <input
                    ref="selectAllCheckbox"
                    type="checkbox"
                    class="lock-checkbox"
                    :checked="allFilteredSelected"
                    title="全选当前列表"
                    @click.stop
                    @change="toggleSelectAllFiltered"
                  />
                </div>
              </th>
              <th class="px-4 py-3 text-sm font-medium text-[#888]">记录类型</th>
              <th class="px-4 py-3 text-sm font-medium text-[#888]">标题</th>
              <th class="px-4 py-3 text-sm font-medium text-[#888]">锁用户</th>
              <th class="px-4 py-3 text-sm font-medium text-[#888]">加锁时间</th>
              <th class="px-4 py-3 text-sm font-medium text-[#888]">最后更新</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-[#888]">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#c9c9c9]/10">
            <tr
              v-for="lock in filteredLocks"
              :key="lock.id"
              class="transition-colors align-top cursor-pointer"
              :class="selectedLockIdSet.has(lock.id) ? 'bg-white/8' : 'hover:bg-white/5'"
              @click="toggleLockSelection(lock.id)"
            >
              <td class="px-4 py-3">
                <div class="flex items-center justify-center">
                  <input
                    type="checkbox"
                    class="lock-checkbox"
                    :checked="selectedLockIdSet.has(lock.id)"
                    @click.stop
                    @change="toggleLockSelection(lock.id)"
                  />
                </div>
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-[#c9c9c9]">{{ lock.collectionLabel }}</p>
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-[#c9c9c9]">{{ lock.targetTitle }}</p>
                <p class="text-xs text-[#888] break-all mt-1">ID: {{ lock.recordId }}</p>
              </td>
              <td class="px-4 py-3 text-sm text-[#c9c9c9]">
                {{ lock.username || '未知用户' }}
              </td>
              <td class="px-4 py-3 text-sm text-[#888]">
                {{ formatEditLockDateTime(lock.created) }}
              </td>
              <td class="px-4 py-3 text-sm text-[#888]">
                {{ formatEditLockDateTime(lock.updated) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="lock.targetPath"
                    class="px-3 py-1.5 text-sm text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
                    @click.stop="openTargetRecord(lock)"
                  >
                    打开记录
                  </button>
                  <button
                    class="px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    @click.stop="confirmDelete(lock.id)"
                    >移除锁</button
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="deleteConfirm"
        class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl max-w-sm w-full p-6 shadow-2xl">
          <h3 class="text-xl font-semibold text-[#c9c9c9] mb-2">确认移除锁</h3>
          <p class="text-[#888] mb-6">确定要移除这个编辑锁吗？这不会修改记录内容，但会解除当前的编辑保护。</p>
          <div class="flex items-center justify-between gap-3">
            <label class="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-[#c9c9c9]">
              <input
                v-model="skipSingleDeleteConfirmDraft"
                type="checkbox"
                class="lock-checkbox shrink-0"
                @click.stop
              />
              <span>不再提示</span>
            </label>
            <div class="flex justify-end gap-3">
              <button
                class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
                :disabled="deleting"
                @click="cancelDelete"
                >取消</button
              >
              <button
                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                :disabled="deleting"
                @click="deleteLock(locks.find(lock => lock.id === deleteConfirm)!)"
              >
                <span
                  v-if="deleting"
                  class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></span>
                确认移除
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="batchDeleteConfirm"
        class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl max-w-md w-full p-6 shadow-2xl">
          <h3 class="text-xl font-semibold text-[#c9c9c9] mb-2">确认批量移除锁</h3>
          <p class="text-[#888] mb-3">将批量移除 {{ selectedCount }} 个已勾选的编辑锁。</p>
          <p class="text-[#888] mb-6">这不会修改记录内容，但会解除这些记录当前的编辑保护。请确认这些锁都应该被移除。</p>
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-[#c9c9c9] hover:bg-white/5 rounded-lg transition-colors"
              :disabled="batchDeleting"
              @click="cancelBatchDelete"
              >取消</button
            >
            <button
              class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              :disabled="batchDeleting"
              @click="deleteSelectedLocks"
            >
              <span
                v-if="batchDeleting"
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              ></span>
              确认批量移除
            </button>
          </div>
        </div>
      </div>
    </div>
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

  .lock-checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    border: 1px solid rgb(201 201 201 / 0.26);
    background-color: rgb(88 8 8 / 0.82);
    background-image: none;
    background-position: center;
    background-repeat: no-repeat;
    background-size: 0.65rem 0.65rem;
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.05);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;
  }

  .lock-checkbox:hover {
    border-color: rgb(252 165 165 / 0.5);
    background-color: rgb(108 12 12 / 0.9);
  }

  .lock-checkbox:focus-visible {
    outline: 2px solid rgb(252 165 165 / 0.28);
    outline-offset: 2px;
  }

  .lock-checkbox:checked {
    border-color: rgb(252 165 165 / 0.72);
    background-color: rgb(252 165 165 / 0.92);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 8.5 6.2 11.5 13 4.8' fill='none' stroke='%234d0000' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.16);
  }
</style>
