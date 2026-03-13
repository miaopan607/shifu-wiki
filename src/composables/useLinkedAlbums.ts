import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import type { Album, AlbumDisc } from '@/types';

export interface LinkedAlbumInfo {
  id: string;
  collectionId: string;
  title: string;
  index: number;
  cover?: string;
}

export interface UseLinkedAlbumsOptions {
  onChanged?: () => void;
}

export function useLinkedAlbums(options: UseLinkedAlbumsOptions = {}) {
  const { onChanged } = options;

  const router = useRouter();

  const allLinkedAlbums = ref<LinkedAlbumInfo[]>([]);
  const albumsToLink = ref<string[]>([]);
  const albumsToUnlink = ref<string[]>([]);

  const songAlbumSearchQuery = ref('');
  const songAlbumSearchResults = ref<any[]>([]);
  const showSongAlbumSearch = ref(false);
  const isSearchingSongAlbums = ref(false);

  let songAlbumSearchDebounce: ReturnType<typeof setTimeout> | null = null;

  const loadAllLinkedAlbums = async (songId: string) => {
    try {
      const albumsResult = await pb.collection('albums').getFullList({
        fields: 'id,collectionId,title,index,cover,tracks',
      });
      const linked: LinkedAlbumInfo[] = [];
      for (const album of albumsResult) {
        const tracks = Array.isArray(album.tracks) ? album.tracks : [];
        const isInAlbum = tracks.some((disc: any) => Array.isArray(disc.songs) && disc.songs.includes(songId));
        if (isInAlbum) {
          linked.push({
            id: album.id,
            collectionId: album.collectionId,
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

  const searchSongAlbums = () => {
    if (songAlbumSearchDebounce) clearTimeout(songAlbumSearchDebounce);
    const query = songAlbumSearchQuery.value.trim();
    if (!query) {
      songAlbumSearchResults.value = [];
      return;
    }
    isSearchingSongAlbums.value = true;
    songAlbumSearchDebounce = setTimeout(async () => {
      try {
        const results = await pb.collection('albums').getList(1, 10, {
          filter: `title ~ "${query}"`,
          fields: 'id,title,index,cover,collectionId',
        });
        songAlbumSearchResults.value = results.items.filter(item => !allLinkedAlbums.value.some(a => a.id === item.id));
      } catch (err) {
        console.error(err);
      } finally {
        isSearchingSongAlbums.value = false;
      }
    }, 300);
  };

  const addAlbumToLink = (albumRecord: any) => {
    allLinkedAlbums.value.push({
      id: albumRecord.id,
      collectionId: albumRecord.collectionId,
      title: albumRecord.title,
      index: albumRecord.index,
      cover: albumRecord.cover,
    });

    albumsToUnlink.value = albumsToUnlink.value.filter(id => id !== albumRecord.id);
    albumsToLink.value.push(albumRecord.id);

    showSongAlbumSearch.value = false;
    songAlbumSearchQuery.value = '';
    songAlbumSearchResults.value = [];
    onChanged?.();
  };

  const removeAlbumFromLink = (albumId: string) => {
    const index = allLinkedAlbums.value.findIndex(a => a.id === albumId);
    if (index !== -1) {
      allLinkedAlbums.value.splice(index, 1);
    }

    if (albumsToLink.value.includes(albumId)) {
      albumsToLink.value = albumsToLink.value.filter(id => id !== albumId);
    } else {
      albumsToUnlink.value.push(albumId);
    }

    onChanged?.();
  };

  const navigateToAlbumEdit = (albumId: string) => {
    window.open(`/admin/albums/${albumId}`, '_blank');
  };

  const handleAlbumTrackUpdate = async (targetSongId: string) => {
    for (const albumId of albumsToUnlink.value) {
      try {
        const album = await pb.collection('albums').getOne<Album>(albumId);
        const tracks = Array.isArray(album.tracks) ? [...album.tracks] : [];
        let changed = false;
        tracks.forEach((disc: AlbumDisc) => {
          if (disc.songs.includes(targetSongId)) {
            disc.songs = disc.songs.filter((id: string) => id !== targetSongId);
            changed = true;
          }
        });
        if (changed) {
          await pb.collection('albums').update(albumId, { tracks });
        }
      } catch (err) {
        console.error(`Failed to unlink album ${albumId}:`, err);
      }
    }

    for (const albumId of albumsToLink.value) {
      try {
        const album = await pb.collection('albums').getOne<Album>(albumId);
        const tracks = Array.isArray(album.tracks) ? [...album.tracks] : [];
        const alreadyIn = tracks.some((disc: AlbumDisc) => disc.songs.includes(targetSongId));
        if (!alreadyIn) {
          if (tracks.length === 0) {
            tracks.push({ disc: 1, songs: [targetSongId] });
          } else if (tracks[0]) {
            tracks[0].songs.push(targetSongId);
          }
          await pb.collection('albums').update(albumId, { tracks });
        }
      } catch (err) {
        console.error(`Failed to link album ${albumId}:`, err);
      }
    }
  };

  const closeSongAlbumSearch = () => {
    showSongAlbumSearch.value = false;
    songAlbumSearchQuery.value = '';
    songAlbumSearchResults.value = [];
  };

  return {
    allLinkedAlbums,
    albumsToLink,
    albumsToUnlink,
    songAlbumSearchQuery,
    songAlbumSearchResults,
    showSongAlbumSearch,
    isSearchingSongAlbums,

    loadAllLinkedAlbums,
    searchSongAlbums,
    addAlbumToLink,
    removeAlbumFromLink,
    navigateToAlbumEdit,
    handleAlbumTrackUpdate,
    closeSongAlbumSearch,
  };
}
