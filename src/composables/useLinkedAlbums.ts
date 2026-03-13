import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { pb } from '@/lib/pocketbase';
import type { Album, AlbumDisc } from '@/types';

export interface DiscInfo {
  disc: number;
  name: string;
}

export interface LinkedAlbumInfo {
  id: string;
  collectionId: string;
  title: string;
  index: number;
  cover?: string;
  disc: number;
  originalDisc: number;
  discs: DiscInfo[];
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
        let foundDisc: number | null = null;
        for (const disc of tracks) {
          if (Array.isArray(disc.songs) && disc.songs.includes(songId)) {
            foundDisc = disc.disc;
            break;
          }
        }
        if (foundDisc !== null) {
          const discs: DiscInfo[] = tracks.map((d: AlbumDisc) => ({
            disc: d.disc,
            name: d.name || `Disc ${d.disc}`,
          }));
          linked.push({
            id: album.id,
            collectionId: album.collectionId,
            title: album.title,
            index: album.index,
            cover: album.cover,
            disc: foundDisc,
            originalDisc: foundDisc,
            discs,
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

  const addAlbumToLink = async (albumRecord: any) => {
    let tracks: AlbumDisc[] = [];
    try {
      const album = await pb.collection('albums').getOne(albumRecord.id, { fields: 'tracks' });
      tracks = Array.isArray(album.tracks) ? album.tracks : [];
    } catch (err) {
      console.error('Failed to fetch album tracks:', err);
    }

    const discs: DiscInfo[] = tracks.map(d => ({
      disc: d.disc,
      name: d.name || `Disc ${d.disc}`,
    }));

    const defaultDisc = discs.length > 0 ? discs[0]!.disc : 1;

    allLinkedAlbums.value.push({
      id: albumRecord.id,
      collectionId: albumRecord.collectionId,
      title: albumRecord.title,
      index: albumRecord.index,
      cover: albumRecord.cover,
      disc: defaultDisc,
      originalDisc: defaultDisc,
      discs,
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

  const setAlbumDisc = (albumId: string, disc: number) => {
    const album = allLinkedAlbums.value.find(a => a.id === albumId);
    if (album && album.disc !== disc) {
      album.disc = disc;
      onChanged?.();
    }
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
        const albumInfo = allLinkedAlbums.value.find(a => a.id === albumId);
        const targetDisc = albumInfo?.disc || 1;
        const album = await pb.collection('albums').getOne<Album>(albumId);
        const tracks = Array.isArray(album.tracks) ? [...album.tracks] : [];
        const alreadyIn = tracks.some((disc: AlbumDisc) => disc.songs.includes(targetSongId));
        if (!alreadyIn) {
          let targetDiscData = tracks.find((d: AlbumDisc) => d.disc === targetDisc);
          if (!targetDiscData) {
            targetDiscData = { disc: targetDisc, name: `Disc ${targetDisc}`, songs: [] };
            tracks.push(targetDiscData);
          }
          if (!targetDiscData.songs) {
            targetDiscData.songs = [];
          }
          targetDiscData.songs.push(targetSongId);
          await pb.collection('albums').update(albumId, { tracks });
        }
      } catch (err) {
        console.error(`Failed to link album ${albumId}:`, err);
      }
    }

    for (const albumInfo of allLinkedAlbums.value) {
      if (albumsToLink.value.includes(albumInfo.id)) continue;
      if (albumsToUnlink.value.includes(albumInfo.id)) continue;
      if (albumInfo.disc === albumInfo.originalDisc) continue;

      try {
        const album = await pb.collection('albums').getOne<Album>(albumInfo.id);
        const tracks = Array.isArray(album.tracks) ? [...album.tracks] : [];
        let changed = false;

        for (const disc of tracks) {
          if (disc.songs.includes(targetSongId)) {
            disc.songs = disc.songs.filter((id: string) => id !== targetSongId);
            changed = true;
          }
        }

        let targetDiscData = tracks.find((d: AlbumDisc) => d.disc === albumInfo.disc);
        if (!targetDiscData) {
          targetDiscData = { disc: albumInfo.disc, name: `Disc ${albumInfo.disc}`, songs: [] };
          tracks.push(targetDiscData);
        }
        if (!targetDiscData.songs) {
          targetDiscData.songs = [];
        }
        targetDiscData.songs.push(targetSongId);
        changed = true;

        if (changed) {
          await pb.collection('albums').update(albumInfo.id, { tracks });
        }
      } catch (err) {
        console.error(`Failed to update disc for album ${albumInfo.id}:`, err);
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
    setAlbumDisc,
    navigateToAlbumEdit,
    handleAlbumTrackUpdate,
    closeSongAlbumSearch,
  };
}
