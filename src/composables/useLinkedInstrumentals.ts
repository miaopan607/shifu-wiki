import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import type { Song } from '@/types';

export interface LinkedInstrumentalInfo {
  id: string;
  collectionId: string;
  title: string;
  index: number;
  artist: string[];
}

export interface UseLinkedInstrumentalsOptions {
  onChanged?: () => void;
}

export function useLinkedInstrumentals(options: UseLinkedInstrumentalsOptions = {}) {
  const { onChanged } = options;

  const router = useRouter();

  const instrumentals = ref<LinkedInstrumentalInfo[]>([]);
  const instrumentalsToAdd = ref<string[]>([]);
  const instrumentalsToRemove = ref<string[]>([]);

  const songsAsInstrumentalFor = ref<LinkedInstrumentalInfo[]>([]);
  const songsToAddAsInstrumentalFor = ref<string[]>([]);
  const songsToRemoveAsInstrumentalFor = ref<string[]>([]);

  const instrumentalSearchQuery = ref('');
  const instrumentalSearchResults = ref<any[]>([]);
  const showInstrumentalSearch = ref(false);
  const isSearchingInstrumentals = ref(false);

  const songSearchQuery = ref('');
  const songSearchResults = ref<any[]>([]);
  const showSongSearch = ref(false);
  const isSearchingSongs = ref(false);

  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  const loadLinkedInstrumentals = async (songId: string) => {
    try {
      const result = await pb.collection('songs').getFullList({
        filter: `instrumentalFor ?~ "${songId}"`,
        fields: 'id,collectionId,title,index,artist',
      });
      instrumentals.value = result.map(s => ({
        id: s.id,
        collectionId: s.collectionId,
        title: s.title,
        index: s.index,
        artist: Array.isArray(s.artist) ? s.artist : [],
      }));
    } catch (err) {
      console.error('Failed to load linked instrumentals:', err);
    }
  };

  const loadSongsAsInstrumentalFor = async (songId: string) => {
    try {
      const currentSong = await pb.collection('songs').getOne(songId, { fields: 'instrumentalFor' });
      const instrumentalForIds: string[] = Array.isArray((currentSong as any).instrumentalFor)
        ? (currentSong as any).instrumentalFor
        : [];

      if (instrumentalForIds.length === 0) {
        songsAsInstrumentalFor.value = [];
        return;
      }

      const filter = instrumentalForIds.map(id => `id="${id}"`).join(' || ');
      const result = await pb.collection('songs').getFullList({
        filter,
        fields: 'id,collectionId,title,index,artist',
      });
      songsAsInstrumentalFor.value = result.map(s => ({
        id: s.id,
        collectionId: s.collectionId,
        title: s.title,
        index: s.index,
        artist: Array.isArray(s.artist) ? s.artist : [],
      }));
    } catch (err) {
      console.error('Failed to load songs as instrumental for:', err);
    }
  };

  const searchInstrumentals = () => {
    if (searchDebounce) clearTimeout(searchDebounce);
    const query = instrumentalSearchQuery.value.trim();
    if (!query) {
      instrumentalSearchResults.value = [];
      return;
    }
    isSearchingInstrumentals.value = true;
    searchDebounce = setTimeout(async () => {
      try {
        const results = await pb.collection('songs').getList(1, 15, {
          filter: `title ~ "${query}" || artist ~ "${query}"`,
          fields: 'id,title,index,artist,collectionId',
        });
        instrumentalSearchResults.value = results.items.filter(
          item => !instrumentals.value.some(i => i.id === item.id)
        );
      } catch (err) {
        console.error(err);
      } finally {
        isSearchingInstrumentals.value = false;
      }
    }, 300);
  };

  const addInstrumental = (songRecord: any) => {
    instrumentals.value.push({
      id: songRecord.id,
      collectionId: songRecord.collectionId,
      title: songRecord.title,
      index: songRecord.index,
      artist: Array.isArray(songRecord.artist) ? songRecord.artist : [],
    });

    instrumentalsToRemove.value = instrumentalsToRemove.value.filter(id => id !== songRecord.id);
    instrumentalsToAdd.value.push(songRecord.id);

    showInstrumentalSearch.value = false;
    instrumentalSearchQuery.value = '';
    instrumentalSearchResults.value = [];
    onChanged?.();
  };

  const removeInstrumental = (songId: string) => {
    const index = instrumentals.value.findIndex(s => s.id === songId);
    if (index !== -1) {
      instrumentals.value.splice(index, 1);
    }

    if (instrumentalsToAdd.value.includes(songId)) {
      instrumentalsToAdd.value = instrumentalsToAdd.value.filter(id => id !== songId);
    } else {
      instrumentalsToRemove.value.push(songId);
    }

    onChanged?.();
  };

  const searchSongs = () => {
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
          fields: 'id,title,index,artist,collectionId',
        });
        songSearchResults.value = results.items.filter(
          item => !songsAsInstrumentalFor.value.some(s => s.id === item.id)
        );
      } catch (err) {
        console.error(err);
      } finally {
        isSearchingSongs.value = false;
      }
    }, 300);
  };

  const addSongAsInstrumentalFor = (songRecord: any) => {
    songsAsInstrumentalFor.value.push({
      id: songRecord.id,
      collectionId: songRecord.collectionId,
      title: songRecord.title,
      index: songRecord.index,
      artist: Array.isArray(songRecord.artist) ? songRecord.artist : [],
    });

    songsToRemoveAsInstrumentalFor.value = songsToRemoveAsInstrumentalFor.value.filter(id => id !== songRecord.id);
    songsToAddAsInstrumentalFor.value.push(songRecord.id);

    showSongSearch.value = false;
    songSearchQuery.value = '';
    songSearchResults.value = [];
    onChanged?.();
  };

  const removeSongAsInstrumentalFor = (songId: string) => {
    const index = songsAsInstrumentalFor.value.findIndex(s => s.id === songId);
    if (index !== -1) {
      songsAsInstrumentalFor.value.splice(index, 1);
    }

    if (songsToAddAsInstrumentalFor.value.includes(songId)) {
      songsToAddAsInstrumentalFor.value = songsToAddAsInstrumentalFor.value.filter(id => id !== songId);
    } else {
      songsToRemoveAsInstrumentalFor.value.push(songId);
    }

    onChanged?.();
  };

  const navigateToSongEdit = (songId: string) => {
    window.open(`/admin/songs/${songId}`, '_blank');
  };

  const handleInstrumentalUpdate = async (targetSongId: string) => {
    for (const instrumentalId of instrumentalsToRemove.value) {
      try {
        const instrumental = await pb.collection('songs').getOne<Song>(instrumentalId);
        const instrumentalFor = Array.isArray(instrumental.instrumentalFor) ? [...instrumental.instrumentalFor] : [];
        const updatedInstrumentalFor = instrumentalFor.filter(id => id !== targetSongId);
        await pb.collection('songs').update(instrumentalId, { instrumentalFor: updatedInstrumentalFor });
      } catch (err) {
        console.error(`Failed to remove instrumental ${instrumentalId}:`, err);
      }
    }

    for (const instrumentalId of instrumentalsToAdd.value) {
      try {
        const instrumental = await pb.collection('songs').getOne<Song>(instrumentalId);
        const instrumentalFor = Array.isArray(instrumental.instrumentalFor) ? [...instrumental.instrumentalFor] : [];
        if (!instrumentalFor.includes(targetSongId)) {
          instrumentalFor.push(targetSongId);
          await pb.collection('songs').update(instrumentalId, { instrumentalFor });
        }
      } catch (err) {
        console.error(`Failed to add instrumental ${instrumentalId}:`, err);
      }
    }

    const currentSong = await pb.collection('songs').getOne<Song>(targetSongId);
    let currentInstrumentalFor = Array.isArray(currentSong.instrumentalFor) ? [...currentSong.instrumentalFor] : [];

    for (const songId of songsToRemoveAsInstrumentalFor.value) {
      currentInstrumentalFor = currentInstrumentalFor.filter(id => id !== songId);
    }

    for (const songId of songsToAddAsInstrumentalFor.value) {
      if (!currentInstrumentalFor.includes(songId)) {
        currentInstrumentalFor.push(songId);
      }
    }

    await pb.collection('songs').update(targetSongId, { instrumentalFor: currentInstrumentalFor });
  };

  const closeInstrumentalSearch = () => {
    showInstrumentalSearch.value = false;
    instrumentalSearchQuery.value = '';
    instrumentalSearchResults.value = [];
  };

  const closeSongSearch = () => {
    showSongSearch.value = false;
    songSearchQuery.value = '';
    songSearchResults.value = [];
  };

  const formatArrayField = (value: string | string[] | undefined): string => {
    if (!value) return '';
    if (Array.isArray(value)) return value.join(' / ');
    return value;
  };

  return {
    instrumentals,
    instrumentalsToAdd,
    instrumentalsToRemove,
    songsAsInstrumentalFor,
    songsToAddAsInstrumentalFor,
    songsToRemoveAsInstrumentalFor,
    instrumentalSearchQuery,
    instrumentalSearchResults,
    showInstrumentalSearch,
    isSearchingInstrumentals,
    songSearchQuery,
    songSearchResults,
    showSongSearch,
    isSearchingSongs,

    loadLinkedInstrumentals,
    loadSongsAsInstrumentalFor,
    searchInstrumentals,
    addInstrumental,
    removeInstrumental,
    searchSongs,
    addSongAsInstrumentalFor,
    removeSongAsInstrumentalFor,
    navigateToSongEdit,
    handleInstrumentalUpdate,
    closeInstrumentalSearch,
    closeSongSearch,
    formatArrayField,
  };
}
