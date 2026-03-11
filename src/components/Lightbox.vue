<!-- 这玩意就是个巨大的史山。 -->
<script setup lang="ts">
  import { ref, watch, onUnmounted, onMounted, computed } from 'vue';
  import { pb } from '@/lib/pocketbase';
  import type { GalleryImage } from '@/types';

  interface Props {
    images: GalleryImage[];
    initialIndex: number;
    galleryTitle: string;
    modelValue: boolean;
  }

  const props = defineProps<Props>();
  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
  }>();

  const currentIndex = ref(props.initialIndex);
  const isPushed = ref(false);

  // 缩放相关状态
  // pixelScale: 相对于真实像素的比例（100% = 1:1 点对点）
  const pixelScale = ref(1);
  const translateX = ref(0);
  const translateY = ref(0);
  const isDragging = ref(false);
  const dragStartX = ref(0);
  const dragStartY = ref(0);
  const initialTranslateX = ref(0);
  const initialTranslateY = ref(0);

  // 触摸缩放相关
  const initialPinchDistance = ref(0);
  const initialPinchScale = ref(1);
  const isPinching = ref(false);

  // 图片实际尺寸
  const imageNaturalWidth = ref(0);
  const imageNaturalHeight = ref(0);
  // 图片加载状态
  const isImageLoading = ref(true);
  // 当前图片URL（用于检测图片变化）
  const currentImageUrl = ref('');

  const MIN_PIXEL_SCALE = 0.05;
  const MAX_PIXEL_SCALE = 5;
  const ZOOM_RATIO = 0.1; // 每次缩放10%

  const cleanup = () => {
    document.body.style.overflow = '';
  };

  // 计算适应屏幕的缩放比例
  const getFitScale = () => {
    if (!imageNaturalWidth.value || !imageNaturalHeight.value) return 1;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scaleX = viewportWidth / imageNaturalWidth.value;
    const scaleY = viewportHeight / imageNaturalHeight.value;
    // 适应屏幕（完整显示图片）
    return Math.min(scaleX, scaleY);
  };

  const resetTransform = () => {
    // 默认使用适应屏幕的比例
    pixelScale.value = getFitScale();
    translateX.value = 0;
    translateY.value = 0;
  };

  const handlePopstate = () => {
    if (props.modelValue) {
      isPushed.value = false;
      emit('update:modelValue', false);
    }
  };

  // 鼠标滚轮缩放 - 按比例缩放
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const ratio = e.deltaY > 0 ? 1 - ZOOM_RATIO : 1 + ZOOM_RATIO;
    const newScale = Math.min(MAX_PIXEL_SCALE, Math.max(MIN_PIXEL_SCALE, pixelScale.value * ratio));
    pixelScale.value = newScale;
  };

  // 鼠标拖拽
  const handleMouseDown = (e: MouseEvent) => {
    isDragging.value = true;
    dragStartX.value = e.clientX;
    dragStartY.value = e.clientY;
    initialTranslateX.value = translateX.value;
    initialTranslateY.value = translateY.value;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return;
    e.preventDefault();
    const deltaX = e.clientX - dragStartX.value;
    const deltaY = e.clientY - dragStartY.value;
    translateX.value = initialTranslateX.value + deltaX;
    translateY.value = initialTranslateY.value + deltaY;
  };

  const handleMouseUp = () => {
    isDragging.value = false;
  };

  // 触摸事件（双指缩放 + 单指拖拽）
  const getPinchDistance = (touches: TouchList) => {
    const touch0 = touches[0]!;
    const touch1 = touches[1]!;
    const dx = touch0.clientX - touch1.clientX;
    const dy = touch0.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      // 双指缩放开始
      isPinching.value = true;
      initialPinchDistance.value = getPinchDistance(e.touches);
      initialPinchScale.value = pixelScale.value;
    } else if (e.touches.length === 1) {
      // 单指拖拽开始
      const touch = e.touches[0]!;
      isDragging.value = true;
      dragStartX.value = touch.clientX;
      dragStartY.value = touch.clientY;
      initialTranslateX.value = translateX.value;
      initialTranslateY.value = translateY.value;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && isPinching.value) {
      // 双指缩放中
      e.preventDefault();
      const distance = getPinchDistance(e.touches);
      const pinchScale = distance / initialPinchDistance.value;
      const newScale = Math.min(MAX_PIXEL_SCALE, Math.max(MIN_PIXEL_SCALE, initialPinchScale.value * pinchScale));
      pixelScale.value = newScale;
    } else if (e.touches.length === 1 && isDragging.value) {
      // 单指拖拽中
      e.preventDefault();
      const touch = e.touches[0]!;
      const deltaX = touch.clientX - dragStartX.value;
      const deltaY = touch.clientY - dragStartY.value;
      translateX.value = initialTranslateX.value + deltaX;
      translateY.value = initialTranslateY.value + deltaY;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      isPinching.value = false;
    }
    if (e.touches.length === 0) {
      isDragging.value = false;
    }
  };

  // 键盘事件处理
  const handleKeydown = (e: KeyboardEvent) => {
    if (!props.modelValue) return;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        prev();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        next();
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  };

  onMounted(() => {
    window.addEventListener('popstate', handlePopstate);
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('popstate', handlePopstate);
    window.removeEventListener('keydown', handleKeydown);
    cleanup();
  });

  watch(
    () => props.modelValue,
    open => {
      if (open) {
        currentIndex.value = props.initialIndex;
        document.body.style.overflow = 'hidden';
        // 重置状态，等待图片加载
        resetImageState();
        if (!isPushed.value) {
          window.history.pushState({ lightboxOpen: true }, '', '');
          isPushed.value = true;
        }
      } else {
        cleanup();
        if (isPushed.value) {
          window.history.back();
          isPushed.value = false;
        }
      }
    }
  );

  // 重置图片状态的辅助函数
  const resetImageState = () => {
    isImageLoading.value = true;
    pixelScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    imageNaturalWidth.value = 0;
    imageNaturalHeight.value = 0;
    const img = currentImage();
    currentImageUrl.value = img ? getFullImageUrl(img, img.image) : '';
  };

  watch(
    () => props.initialIndex,
    index => {
      if (props.modelValue) {
        currentIndex.value = index;
        // 重置状态，等待新图片加载
        resetImageState();
      }
    }
  );

  // 监听当前索引变化（通过 prev/next 触发）
  watch(currentIndex, () => {
    resetImageState();
  });

  const close = () => {
    emit('update:modelValue', false);
  };

  const prev = () => {
    if (props.images.length <= 1) return;
    currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length;
  };

  const next = () => {
    if (props.images.length <= 1) return;
    currentIndex.value = (currentIndex.value + 1) % props.images.length;
  };

  const currentImage = () => {
    if (props.images.length === 0) return null;
    return props.images[currentIndex.value] || null;
  };

  const getFullImageUrl = (record: GalleryImage, filename: string) => {
    return pb.files.getURL(record, filename);
  };

  const onImageLoad = (e: Event) => {
    const img = e.target as HTMLImageElement;
    // 检查加载的图片是否仍是当前图片（防止前一张图片的加载回调覆盖当前状态）
    if (img.src !== currentImageUrl.value) {
      return;
    }
    imageNaturalWidth.value = img.naturalWidth;
    imageNaturalHeight.value = img.naturalHeight;
    isImageLoading.value = false;
    // 图片加载完成后设置初始缩放为适应屏幕
    pixelScale.value = getFitScale();
  };

  // 工具栏功能 - 按比例缩放
  const zoomIn = () => {
    pixelScale.value = Math.min(MAX_PIXEL_SCALE, pixelScale.value * (1 + ZOOM_RATIO));
  };

  const zoomOut = () => {
    pixelScale.value = Math.max(MIN_PIXEL_SCALE, pixelScale.value * (1 - ZOOM_RATIO));
  };

  const zoomToFit = () => {
    pixelScale.value = getFitScale();
    translateX.value = 0;
    translateY.value = 0;
  };

  const zoomToActual = () => {
    // 1:1 比例：图片像素与屏幕像素 1:1 对应
    pixelScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  };

  // 计算显示的缩放比例（加载中时不显示）
  const displayScale = computed(() => {
    if (isImageLoading.value) return null;
    return Math.round(pixelScale.value * 100);
  });
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none"
    @wheel="handleWheel"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- 关闭按钮 -->
    <button
      class="absolute top-4 right-4 text-white/80 hover:text-white text-3xl w-10 h-10 flex items-center justify-center transition-colors z-30"
      @click.stop="close"
    >
      ×
    </button>

    <!-- 上一张按钮 -->
    <button
      v-if="images.length > 1"
      class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl w-12 h-12 flex items-center justify-center transition-colors z-30"
      @click.stop="prev"
    >
      ←
    </button>

    <!-- 下一张按钮 -->
    <button
      v-if="images.length > 1"
      class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl w-12 h-12 flex items-center justify-center transition-colors z-30"
      @click.stop="next"
    >
      →
    </button>

    <!-- 图片计数器 -->
    <div class="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm z-30">
      {{ currentIndex + 1 }} / {{ images.length }}
    </div>

    <!-- 点击关闭区域 - 放在图片后面 -->
    <div class="absolute inset-0 z-0" @click="close"></div>

    <!-- 图片容器 -->
    <div class="relative z-10 flex items-center justify-center pointer-events-none">
      <img
        v-if="currentImage()"
        :key="currentImageUrl"
        :src="currentImageUrl"
        :alt="galleryTitle"
        class="object-contain pointer-events-auto"
        :class="[
          isImageLoading ? 'max-w-[100vw] max-h-[100vh]' : 'max-w-none max-h-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        ]"
        :style="
          isImageLoading
            ? {}
            : {
                width: `${imageNaturalWidth}px`,
                height: `${imageNaturalHeight}px`,
                transform: `scale(${pixelScale}) translate(${translateX / pixelScale}px, ${translateY / pixelScale}px)`,
              }
        "
        draggable="false"
        @mousedown="handleMouseDown"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @load="onImageLoad"
      />
    </div>

    <!-- 底部工具栏 -->
    <div
      class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-lg px-4 py-2 backdrop-blur-sm z-30"
    >
      <!-- 缩小按钮 -->
      <button
        class="text-white/70 hover:text-white w-8 h-8 flex items-center justify-center transition-colors"
        @click.stop="zoomOut"
        title="缩小"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      <!-- 缩放比例 -->
      <div class="text-white/80 text-sm min-w-[60px] text-center font-mono">
        {{ displayScale !== null ? displayScale + '%' : '-' }}
      </div>

      <!-- 放大按钮 -->
      <button
        class="text-white/70 hover:text-white w-8 h-8 flex items-center justify-center transition-colors"
        @click.stop="zoomIn"
        title="放大"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      <!-- 分隔线 -->
      <div class="w-px h-5 bg-white/20 mx-1"></div>

      <!-- 1:1 按钮 -->
      <button
        class="text-white/70 hover:text-white px-2 h-8 flex items-center justify-center transition-colors text-sm font-medium"
        @click.stop="zoomToActual"
        title="实际大小 (1:1)"
      >
        1:1
      </button>

      <!-- 自适应按钮 -->
      <button
        class="text-white/70 hover:text-white w-8 h-8 flex items-center justify-center transition-colors"
        @click.stop="zoomToFit"
        title="适应屏幕"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l-7" />
        </svg>
      </button>
    </div>
  </div>
</template>
