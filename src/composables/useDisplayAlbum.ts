import { ref, type Ref } from 'vue';
import { pb } from '@/lib/pocketbase';

export type DisplayAlbumMode = 'none' | 'linked' | 'manual';

export interface DisplayAlbumOptions {
  defaultAlbum: Ref<string>;
  defaultAlbumName: Ref<string>;
  onChanged?: () => void;
}

export interface AlbumSearchResult {
  id: string;
  collectionId: string;
  title: string;
  index: number;
  cover?: string;
}

export function useDisplayAlbum(options: DisplayAlbumOptions) {
  const { defaultAlbum, defaultAlbumName, onChanged } = options;

  const albumSearchQuery = ref('');
  const albumSearchResults = ref<AlbumSearchResult[]>([]);
  const isSearchingAlbums = ref(false);
  const showAlbumSearch = ref(false);
  const selectedAlbumTitle = ref('');
  const selectedAlbumCover = ref<string>('');
  const selectedAlbumCollectionId = ref<string>('');
  const albumMode = ref<DisplayAlbumMode>('none');

  let albumSearchDebounce: ReturnType<typeof setTimeout> | null = null;

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
        albumSearchResults.value = results.items as unknown as AlbumSearchResult[];
      } catch (err) {
        console.error(err);
      } finally {
        isSearchingAlbums.value = false;
      }
    }, 300);
  };

  const selectAlbum = (albumRecord: AlbumSearchResult) => {
    defaultAlbum.value = albumRecord.id;
    defaultAlbumName.value = albumRecord.title;
    selectedAlbumTitle.value = albumRecord.title;
    selectedAlbumCover.value = albumRecord.cover || '';
    selectedAlbumCollectionId.value = albumRecord.collectionId;
    albumMode.value = 'linked';
    showAlbumSearch.value = false;
    albumSearchQuery.value = '';
    albumSearchResults.value = [];
    onChanged?.();
  };

  const setManualAlbum = () => {
    albumMode.value = 'manual';
    defaultAlbum.value = '';
    showAlbumSearch.value = false;
    onChanged?.();
  };

  const clearAlbum = () => {
    albumMode.value = 'none';
    defaultAlbum.value = '';
    defaultAlbumName.value = '';
    selectedAlbumTitle.value = '';
    selectedAlbumCover.value = '';
    selectedAlbumCollectionId.value = '';
    onChanged?.();
  };

  const initDisplayAlbum = async () => {
    if (defaultAlbum.value) {
      albumMode.value = 'linked';
      try {
        const linkedAlbum = await pb.collection('albums').getOne(defaultAlbum.value, {
          fields: 'id,title,cover,collectionId',
        });
        selectedAlbumTitle.value = linkedAlbum.title;
        selectedAlbumCover.value = linkedAlbum.cover || '';
        selectedAlbumCollectionId.value = linkedAlbum.collectionId;
      } catch {
        /* album might have been deleted */
      }
    } else if (defaultAlbumName.value) {
      albumMode.value = 'manual';
    } else {
      albumMode.value = 'none';
    }
  };

  return {
    albumSearchQuery,
    albumSearchResults,
    isSearchingAlbums,
    showAlbumSearch,
    selectedAlbumTitle,
    selectedAlbumCover,
    selectedAlbumCollectionId,
    albumMode,

    searchAlbums,
    selectAlbum,
    setManualAlbum,
    clearAlbum,
    initDisplayAlbum,
  };
}
