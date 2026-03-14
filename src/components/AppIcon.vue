<script setup lang="ts">
  defineProps<{
    name: // 导航图标
      | 'dashboard'
      | 'songs'
      | 'albums'
      | 'activities'
      | 'galleries'
      | 'misc'
      | 'locks'
      | 'profile'
      | 'settings'
      // AdminLayout 通用图标
      | 'home'
      | 'upload'
      | 'logout'
      | 'menu'
      | 'chevron-left'
      | 'chevron-double-left'
      // MetaIcon 元数据图标
      | 'lyricist'
      | 'composer'
      | 'album'
      | 'date'
      | 'location'
      | 'music'
      | 'users'
      | 'tag'
      | 'image'
      | 'file'
      // 操作图标
      | 'plus'
      | 'refresh'
      | 'search'
      | 'edit'
      | 'trash'
      | 'close'
      | 'calendar'
      | 'warning'
      | 'check'
      | 'eye'
      | 'eye-off'
      | 'cloud-upload'
      | 'github'
      | 'logout-alt'
      | 'music-note'
      | 'photo'
      | 'image-placeholder'
      | 'x-circle'
      | 'info'
      | 'markdown'
      | 'chevron-down'
      | 'chevron-right'
      | 'external-link'
      | 'pause'
      | 'play'
      | 'link'
      | 'chevron-right'
      | 'save'
      // 时间图标
      | 'clock'
      // 平台图标
      | 'netease'
      | 'qq-music'
      | 'kugou'
      | 'kuwo'
      | 'bilibili'
      // 拖拽图标
      | 'drag'
      | 'mic';
    className?: string;
  }>();
</script>

<template>
  <!-- ========== 导航图标 ========== -->
  <!-- 仪表盘图标 - 四个方块 -->
  <svg
    v-if="name === 'dashboard'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>

  <!-- 音乐图标 - 音符 -->
  <svg
    v-else-if="name === 'songs'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
    />
  </svg>

  <!-- 专辑图标 - 唱片 -->
  <svg
    v-else-if="name === 'albums'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
  </svg>

  <!-- 活动图标 - 日历 -->
  <svg
    v-else-if="name === 'activities'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>

  <!-- 图集图标 - 图片 -->
  <svg
    v-else-if="name === 'galleries'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>

  <!-- 杂记图标 - 文件 -->
  <svg
    v-else-if="name === 'misc'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>

  <!-- 个人介绍图标 - 用户 -->
  <svg
    v-else-if="name === 'profile'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>

  <!-- 锁管理图标 - 锁 -->
  <svg
    v-else-if="name === 'locks'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    <circle cx="12" cy="16" r="1" />
  </svg>

  <!-- 设置图标 - 齿轮 -->
  <svg
    v-else-if="name === 'settings'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <circle cx="12" cy="12" r="3" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
    />
  </svg>

  <!-- ========== AdminLayout 通用图标 ========== -->
  <!-- 主页图标 - 房子 -->
  <svg
    v-else-if="name === 'home'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>

  <!-- 上传图标 - 向上箭头 -->
  <svg
    v-else-if="name === 'upload'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>

  <!-- 菜单图标 - 汉堡菜单 -->
  <svg
    v-else-if="name === 'menu'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>

  <!-- 退出登录图标 -->
  <svg
    v-else-if="name === 'logout'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>

  <!-- 另一种退出登录图标（门+箭头） -->
  <svg
    v-else-if="name === 'logout-alt'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>

  <!-- 左箭头 -->
  <svg
    v-else-if="name === 'chevron-left'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>

  <!-- 双左箭头 -->
  <svg
    v-else-if="name === 'chevron-double-left'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <polyline points="11 19l-7-7 7-7" />
    <polyline points="22 19l-7-7 7-7" />
  </svg>

  <!-- ========== MetaIcon 元数据图标 ========== -->
  <!-- 词作者图标 - 铅笔 -->
  <svg
    v-else-if="name === 'lyricist'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>

  <!-- 曲作者图标 - 音符 -->
  <svg
    v-else-if="name === 'composer'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
    />
  </svg>

  <!-- 专辑图标 - 唱片 -->
  <svg
    v-else-if="name === 'album'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
  </svg>

  <!-- 日期图标 - 日历 -->
  <svg
    v-else-if="name === 'date'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>

  <!-- 地点图标 - 定位 -->
  <svg
    v-else-if="name === 'location'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>

  <!-- 音乐图标 - 音符 -->
  <svg
    v-else-if="name === 'music'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
    />
  </svg>

  <!-- 用户组图标 - 制作人员 -->
  <svg
    v-else-if="name === 'users'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>

  <!-- 标签图标 -->
  <svg
    v-else-if="name === 'tag'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>

  <!-- 图片图标 -->
  <svg
    v-else-if="name === 'image'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>

  <!-- 文件图标 -->
  <svg
    v-else-if="name === 'file'"
    :class="className || 'w-3.5 h-3.5 opacity-70'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>

  <!-- ========== 操作图标 ========== -->
  <!-- 加号 -->
  <svg
    v-else-if="name === 'plus'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
  </svg>

  <!-- 刷新 -->
  <svg
    v-else-if="name === 'refresh'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>

  <!-- 搜索 -->
  <svg
    v-else-if="name === 'search'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>

  <!-- 编辑 - 铅笔 -->
  <svg
    v-else-if="name === 'edit'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>

  <!-- 删除 - 垃圾桶 -->
  <svg
    v-else-if="name === 'trash'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>

  <!-- 关闭 - X -->
  <svg
    v-else-if="name === 'close'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>

  <!-- 日历（带选择功能） -->
  <svg
    v-else-if="name === 'calendar'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>

  <!-- 警告 -->
  <svg
    v-else-if="name === 'warning'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>

  <!-- 勾选 -->
  <svg
    v-else-if="name === 'check'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
  </svg>

  <!-- 眼睛 - 显示 -->
  <svg
    v-else-if="name === 'eye'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>

  <!-- 眼睛 - 隐藏 -->
  <svg
    v-else-if="name === 'eye-off'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>

  <!-- 云上传 -->
  <svg
    v-else-if="name === 'cloud-upload'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>

  <!-- GitHub -->
  <svg v-else-if="name === 'github'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="currentColor">
    <path
      fill-rule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clip-rule="evenodd"
    />
  </svg>

  <!-- 大音符（专辑默认封面） -->
  <svg
    v-else-if="name === 'music-note'"
    :class="className || 'w-16 h-16'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
    />
  </svg>

  <!-- 照片图标 -->
  <svg
    v-else-if="name === 'photo'"
    :class="className || 'w-12 h-12'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>

  <!-- 图片占位符（图集空状态） -->
  <svg
    v-else-if="name === 'image-placeholder'"
    :class="className || 'w-16 h-16'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>

  <!-- 信息图标 -->
  <svg
    v-else-if="name === 'info'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>

  <!-- Markdown图标 -->
  <svg
    v-else-if="name === 'markdown'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
    <path d="M7 15V9l2 2 2-2v6" />
    <path d="m14 13 2 2 2-2" />
    <path d="M16 15V9" />
  </svg>

  <!-- 向下箭头（展开/折叠） -->
  <svg
    v-else-if="name === 'chevron-down'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
  </svg>

  <!-- 外部链接 -->
  <svg
    v-else-if="name === 'external-link'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 3h7m0 0v7m0-7L10 14" />
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5v14h14" />
  </svg>

  <!-- 暂停 -->
  <svg
    v-else-if="name === 'pause'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6" />
  </svg>

  <!-- 播放 -->
  <svg
    v-else-if="name === 'play'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
    />
  </svg>

  <!-- 链接 -->
  <svg
    v-else-if="name === 'link'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
    />
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
    />
  </svg>

  <!-- 向右箭头 -->
  <svg
    v-else-if="name === 'chevron-right'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>

  <!-- 保存 - 软盘 -->
  <svg
    v-else-if="name === 'save'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  </svg>

  <!-- 时钟图标 -->
  <svg
    v-else-if="name === 'clock'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>

  <!-- ========== 平台图标 ========== -->
  <!-- 网易云音乐 - 基于参考图 -->
  <svg v-else-if="name === 'netease'" :class="className || 'w-5 h-5'" viewBox="0 0 1024 1024" fill="currentColor">
    <path
      d="M350.375 62h323.25c100.875 0 138.375 10.5 173.25 30 34.875 19.5 65.625 50.25 85.125 85.125 19.5 34.875 30 72.375 30 173.25v323.25c0 100.125-10.5 136.5-30 173.25a204.375 204.375 0 0 1-85.125 85.125c-37.5 19.5-73.125 30-173.25 30h-323.25C249.5 962 212 951.5 177.125 932A204.375 204.375 0 0 1 92 846.875C72.5 811.975 62 774.475 62 673.6v-323.225C62 249.5 72.5 212 92 177.125A204.375 204.375 0 0 1 177.125 92c34.875-19.5 72.375-30 173.25-30zM645.125 177.875a156.75 156.75 0 0 0-58.125 0.75 110.25 110.25 0 0 0-53.625 21.375 108.375 108.375 0 0 0-27 34.125 103.5 103.5 0 0 0-5.625 75l9 34.875a187.5 187.5 0 0 0-104.25 72 169.5 169.5 0 0 0-28.5 103.5 163.875 163.875 0 0 0 9 49.125 135.375 135.375 0 0 0 46.125 71.25 122.625 122.625 0 0 0 90 16.875 127.875 127.875 0 0 0 103.125-129.75l-3.75-21.75c-7.875-30.375-16.125-60.375-23.625-90.375 12 1.5 24 6.75 31.5 12 11.25 7.875 21.75 15.375 31.5 22.875a158.25 158.25 0 0 1 47.625 73.125 187.5 187.5 0 0 1 0 104.25c-2.625 11.25-7.125 22.875-14.25 33.75a203.625 203.625 0 0 1-137.25 91.125 255.75 255.75 0 0 1-85.875 15.375 219.375 219.375 0 0 1-102.375-24.75 242.25 242.25 0 0 1-112.5-129.75 246 246 0 0 1-13.5-119.25 241.5 241.5 0 0 1 153.375-193.5 37.5 37.5 0 0 0 24-30.75 37.5 37.5 0 0 0-15.375-35.25 50.25 50.25 0 0 0-42-2.25 316.5 316.5 0 0 0-189.75 225 322.5 322.5 0 0 0 85.125 297.375 300 300 0 0 0 164.25 87 310.5 310.5 0 0 0 91.125 0 300 300 0 0 0 124.125-43.5 282 282 0 0 0 112.5-138 275.25 275.25 0 0 0 15-72 249.375 249.375 0 0 0-9.375-86.625 225 225 0 0 0-37.5-75 269.625 269.625 0 0 0-72.375-64.875 201 201 0 0 0-94.5-27.75l-13.875-52.125a26.625 26.625 0 0 1 7.125-24 37.5 37.5 0 0 1 24-12.375 67.875 67.875 0 0 1 37.5 12.375c4.125 2.25 7.125 6 11.25 8.625a37.5 37.5 0 0 0 51.375-11.625 37.5 37.5 0 0 0 3.375-34.875 43.875 43.875 0 0 0-15-18.375 156.75 156.75 0 0 0-58.875-28.5z"
    />
  </svg>

  <!-- QQ 音乐 - 基于参考图 -->
  <svg v-else-if="name === 'qq-music'" :class="className || 'w-5 h-5'" viewBox="0 0 1024 1024" fill="currentColor">
    <path
      d="M667.55 85.7c-40.2 11.59-80.1 24.93-120.88 34.49-46.02 10.77-93.32 15.96-140.63 15.38a257.95 257.95 0 0 0-42.23 2.33 24.47 24.47 0 0 0-21.67 26.33 24.29 24.29 0 0 0 4.19 11.65c22.14 39.5 45.15 78.06 67.87 116.1 19.22 33.61 37.86 67.57 58.25 101.25 24.18 41.77 49.22 82.95 73.63 124.72 4.08 6.7 6.99 13.63 11.65 22.95-13.98-1.46-24.47-2.62-35.19-3.2a206.92 206.92 0 0 0-90.29 14.51 191.77 191.77 0 0 0-111.85 106.48c-10.84 26.56-13.4 55.75-7.28 83.83a164.57 164.57 0 0 0 109.81 121.23c14.21 7.63 29.71 12.52 45.73 14.56 28.54 3.03 57.44 1.75 85.63-3.79 19.92-5.01 39.44-11.65 58.25-20.04a182.34 182.34 0 0 0 78.29-72.53 144.59 144.59 0 0 0 3.5-141.26c-13.11-25.29-29.13-49.35-42.82-73.7-18.64-32.5-37.28-65.01-56.22-97.51-24.47-42.35-49.22-84.41-73.63-126.41a382.32 382.32 0 0 1-14.85-29.07c114.7-6.2 216.93-110.8 239.08-261.1l3.2 2.04c3.5 20.27 7.57 40.31 9.9 60.93a23.71 23.71 0 0 0 10.49 19.69 430.15 430.15 0 0 1 159.62 240.24c11.07 46.72 14.56 94.95 10.19 142.72a398.05 398.05 0 0 1-22.14 107.65 524.29 524.29 0 0 1-38.45 81.79 423.51 423.51 0 0 1-110.97 124.2 454.79 454.79 0 0 1-93.21 53.07 438.48 438.48 0 0 1-111.56 30.76 449.78 449.78 0 0 1-116.51 0 410.69 410.69 0 0 1-139.46-42.93 446.75 446.75 0 0 1-198.06-203.07 372.07 372.07 0 0 1-34.37-110c-3-36.25-3.14-74.1.37-110.12a440 440 0 0 1 108.35-284.86 412.56 412.56 0 0 1 141-106.6c25.69-11.42 52.2-21.09 79.23-29.01a399.62 399.62 0 0 1 152.92-12.18 542.35 542.35 0 0 1 76.54 15.38c11.07 2.8 22.02 6.29 32.62 10.49 3.32 1.63 6.53 3.5 9.61 5.48v5.82z"
    />
  </svg>

  <!-- 酷狗音乐 - 基于参考图 -->
  <svg v-else-if="name === 'kugou'" :class="className || 'w-5 h-5'" viewBox="0 0 1024 1024" fill="currentColor">
    <path
      d="M616.16 231.31c11.84-7.66 25.72-12 39.79-12.77 17.84-0.67 35.94 4.61 50.37 15.19 16.76 12 28.46 30.78 31.9 51.1 3.97 21.85-1.98 45.16-15.63 62.63-4.66 5.97-10.2 11.19-15.86 16.2-51.8 47.96-103.7 95.84-155.46 143.86 55.98 48.45 111.82 97.09 167.77 145.59 10.71 9.36 19.14 21.38 23.68 34.9 6.76 19.31 5.55 41.16-3.11 59.68-11.09 24.31-35.18 42.07-61.69 45.47-21.33 3-43.7-3.22-60.5-16.67-8.61-7.02-16.84-14.48-25.27-21.7-42.6-37.04-85.26-74-127.86-111.03-8.64-7.18-16.74-15.03-25.66-21.86-0.06 29.02-0.01 58.04-0.03 87.06-0.14 12.42 0.82 25.07-2.44 37.23-4.47 18.09-15.58 34.39-30.68 45.3-13.93 10.17-31.26 15.59-48.51 15.14-16.91-0.28-33.64-6.23-47.04-16.53-19.69-14.92-31.61-39.34-31.35-64.04 0.01-134.35 0.01-268.71 0-403.06-0.06-20.61 7.87-41.33 22.37-56.08 9.04-9.57 20.62-16.67 33.12-20.75 18.7-6.14 39.67-4.93 57.58 3.22 20.19 9.07 36.21 26.88 42.95 47.98 3.19 9.51 4.23 19.61 4.01 29.61 0 22.05-0.05 44.1 0.02 66.15 5.12-3.25 8.93-8.1 13.6-11.91 47.06-43.6 94.21-87.11 141.27-130.7 7.4-6.58 14.28-13.84 22.66-19.21z"
    />
  </svg>

  <!-- 酷我音乐 - 基于参考图 -->
  <svg v-else-if="name === 'kuwo'" :class="className || 'w-5 h-5'" viewBox="0 0 1024 1024" fill="currentColor">
    <path
      d="M722.53 729.32L559.54 518.79v-20.37l190.15-190.16H613.87l-156.2 162.99 13.58-169.78-105.26 3.4-44.15 417.66 115.31 2.09 13.58-190.15 122.39 194.85z"
    />
    <path
      d="M512 63.78C264.45 63.78 63.78 264.45 63.78 512S264.45 960.22 512 960.22 960.22 759.55 960.22 512 759.55 63.78 512 63.78z m0 835.32c-213.79 0-387.1-173.31-387.1-387.1S298.21 124.9 512 124.9 899.1 298.21 899.1 512 725.79 899.1 512 899.1z"
    />
  </svg>

  <!-- 哔哩哔哩 - 基于参考图 -->
  <svg v-else-if="name === 'bilibili'" :class="className || 'w-5 h-5'" viewBox="0 0 1024 1024" fill="currentColor">
    <path
      d="M278.8864 148.1728c14.336-8.192 32.6144-9.3696 47.8208-2.6624 11.3664 4.6592 19.968 13.824 29.184 21.6064 38.144 32.9216 75.9808 66.304 114.2784 99.0208h80.4352c38.2976-32.768 76.0832-66.048 114.2272-98.9696 9.2672-7.7824 17.8688-16.896 29.2864-21.6576 14.7456-6.5024 32.4608-5.632 46.592 2.048 16.5888 8.5504 28.1088 26.2656 28.8256 44.9536 1.024 13.568-3.84 27.2896-12.3392 37.7856-7.5264 8.3456-16.5376 15.2064-24.8832 22.6816-5.3248 4.4032-10.1376 9.5232-16.0256 13.2096 23.6544 0 47.2576-0.256 70.912 0.1536 31.1296 0.8192 61.44 14.592 82.8928 37.1712 22.6304 22.2208 35.5328 53.5552 35.4816 85.1968 0.1024 108.4416 0 216.9344 0.0512 325.376-0.1024 16.384 0.8192 33.024-2.816 49.152-6.656 32.9728-28.8256 61.5936-56.9856 79.36a121.344 121.344 0 0 1-64.7168 17.7664H263.2704c-16.9984-0.1024-34.2528 0.8704-50.9952-2.8672-32.1024-6.4512-60.0064-27.648-77.824-54.6304a121.088 121.088 0 0 1-19.2512-66.9696v-321.536c0.1024-16.5376-0.9216-33.1776 2.4576-49.408 10.24-52.9408 58.9312-96.1024 112.9984-98.4576 24.6272-0.768 49.3056-0.2048 73.9328-0.3072-11.6224-8.3968-21.8112-18.5344-32.768-27.7504a55.04 55.04 0 0 1-20.5312-45.9264c0.7168-18.2272 11.6736-35.584 27.648-44.3392m-13.056 221.7984c-20.992 3.7376-38.912 20.3264-44.7488 40.7552a76.4928 76.4928 0 0 0-2.3552 21.7088c0.1024 89.0368-0.0512 178.0736 0.0512 267.1616-0.4096 24.2176 16.3328 47.1552 39.1168 54.8864 8.1408 2.9696 16.896 3.0208 25.3952 3.072 153.1904-0.1024 306.432 0.0512 459.6224-0.0512 22.4768 0.8704 44.0832-13.1072 53.5552-33.28 5.7856-11.5712 5.6832-24.7296 5.4784-37.376v-248.832c0-9.1136 0.3072-18.4832-2.304-27.2896a58.7776 58.7776 0 0 0-36.864-38.656c-9.7792-3.584-20.4288-3.0208-30.6688-3.072H292.5056c-8.8576 0-17.8176-0.3072-26.624 0.9728zM358.7072 455.5264c14.6432-1.4848 29.8496 3.2768 41.0112 12.8 12.4416 10.24 19.5584 26.112 19.7632 42.1376 0.3584 19.4048 0.1024 38.8608 0.1024 58.2656 0 12.8-3.3792 25.8048-11.3152 35.9424a54.9888 54.9888 0 0 1-48.4864 21.76 54.9376 54.9376 0 0 1-44.032-28.2624c-6.8096-11.6736-7.3728-25.4976-7.168-38.6048 0.4096-18.8416-1.024-37.7856 0.8704-56.576a55.296 55.296 0 0 1 49.2544-47.4624z m292.4544 0a55.2448 55.2448 0 0 1 60.7232 53.0432c0.8192 18.2272 0.1024 36.4544 0.4096 54.6816 0.1024 12.8-1.4336 26.112-8.4992 37.12-10.24 17.0496-30.3104 27.5456-50.176 26.112a55.04 55.04 0 0 1-43.3664-24.9856c-7.936-11.776-9.472-26.2656-9.1136-40.0896 0.3584-18.7392-0.6656-37.4784 0.6144-56.1664 1.8432-25.6 23.9104-47.5136 49.408-49.664z"
    />
  </svg>

  <!-- 拖拽图标 - 六点网格 -->
  <svg v-else-if="name === 'drag'" :class="className || 'w-5 h-5'" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>

  <!-- 麦克风图标 -->
  <svg
    v-else-if="name === 'mic'"
    :class="className || 'w-5 h-5'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
  </svg>
</template>
