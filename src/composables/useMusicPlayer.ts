import { ref, computed, watch } from 'vue';

export interface MusicData {
  success: boolean;
  platform?: string;
  musicId?: string;
  name?: string;
  artists?: string[];
  musicUrl?: string;
  cover?: string;
  message?: string;
}

export interface Song {
  id: string;
  title: string;
}

const MUSIC_SERVER_URL = import.meta.env.VITE_MUSIC_SERVER_URL || 'http://localhost:3001';

// 全局播放状态
const currentSong = ref<Song | null>(null);
const currentMusicData = ref<MusicData | null>(null);
const isPlaying = ref(false);
const isLoading = ref(false);
const audioElement = ref<HTMLAudioElement | null>(null);
const currentTime = ref(0);
const duration = ref(0);
const error = ref<string | null>(null);

// 监听播放状态，动态添加/移除 body 类名
watch([currentSong, currentMusicData], ([song, musicData]) => {
  const hasPlayer = song && musicData;
  if (hasPlayer) {
    document.body.classList.add('has-music-player');
  } else {
    document.body.classList.remove('has-music-player');
  }
});

export function useMusicPlayer() {
  // 初始化音频元素
  const initAudio = () => {
    if (!audioElement.value) {
      audioElement.value = new Audio();

      audioElement.value.addEventListener('timeupdate', () => {
        currentTime.value = audioElement.value?.currentTime || 0;
      });

      audioElement.value.addEventListener('loadedmetadata', () => {
        duration.value = audioElement.value?.duration || 0;
      });

      audioElement.value.addEventListener('ended', () => {
        isPlaying.value = false;
        currentTime.value = 0;
      });

      audioElement.value.addEventListener('error', () => {
        error.value = '播放失败';
        isPlaying.value = false;
        isLoading.value = false;
      });

      audioElement.value.addEventListener('canplay', () => {
        isLoading.value = false;
      });

      audioElement.value.addEventListener('waiting', () => {
        isLoading.value = true;
      });
    }
    return audioElement.value;
  };

  // 获取音乐播放链接
  const fetchMusicUrl = async (songId: string): Promise<MusicData | null> => {
    try {
      const response = await fetch(`${MUSIC_SERVER_URL}/api/music/play?id=${songId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch music data');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching music URL:', err);
      error.value = '获取播放链接失败';
      return null;
    }
  };

  // 播放歌曲
  const playSong = async (song: Song) => {
    error.value = null;

    // 如果是同一首歌,切换播放状态
    if (currentSong.value?.id === song.id && currentMusicData.value) {
      togglePlay();
      return;
    }

    isLoading.value = true;

    // 获取音乐数据（后端会自动查询数据库获取平台和ID）
    const musicData = await fetchMusicUrl(song.id);

    if (!musicData || !musicData.success || !musicData.musicUrl) {
      error.value = musicData?.message || '无法获取播放链接';
      isLoading.value = false;
      return;
    }

    currentSong.value = song;
    currentMusicData.value = musicData;

    // 播放音乐
    const audio = initAudio();
    audio.src = musicData.musicUrl;

    try {
      await audio.play();
      isPlaying.value = true;
    } catch (err) {
      console.error('Error playing audio:', err);
      error.value = '播放失败';
      isPlaying.value = false;
    } finally {
      isLoading.value = false;
    }
  };

  // 暂停播放
  const pause = () => {
    if (audioElement.value) {
      audioElement.value.pause();
      isPlaying.value = false;
    }
  };

  // 切换播放状态
  const togglePlay = () => {
    if (!audioElement.value || !currentMusicData.value) return;

    if (isPlaying.value) {
      pause();
    } else {
      audioElement.value.play();
      isPlaying.value = true;
    }
  };

  // 停止播放
  const stop = () => {
    if (audioElement.value) {
      audioElement.value.pause();
      audioElement.value.currentTime = 0;
      isPlaying.value = false;
      currentTime.value = 0;
    }
    currentSong.value = null;
    currentMusicData.value = null;
  };

  // 跳转到指定时间
  const seek = (time: number) => {
    if (audioElement.value) {
      audioElement.value.currentTime = time;
      currentTime.value = time;
    }
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算属性
  const progress = computed(() => {
    if (duration.value === 0) return 0;
    return (currentTime.value / duration.value) * 100;
  });

  const hasMusic = computed(() => {
    return !!currentSong.value;
  });

  return {
    // 状态
    currentSong,
    currentMusicData,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    progress,
    error,
    hasMusic,

    // 方法
    playSong,
    pause,
    togglePlay,
    stop,
    seek,
    formatTime,
    initAudio,
  };
}
