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
      | 'save';
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
</template>
