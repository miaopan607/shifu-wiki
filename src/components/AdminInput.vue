<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { marked } from 'marked';
  import AppIcon from '@/components/AppIcon.vue';

  type InputType = 'text' | 'textarea' | 'markdown';

  type IconName =
    | 'dashboard'
    | 'songs'
    | 'albums'
    | 'activities'
    | 'galleries'
    | 'misc'
    | 'locks'
    | 'profile'
    | 'settings'
    | 'home'
    | 'upload'
    | 'logout'
    | 'menu'
    | 'chevron-left'
    | 'chevron-double-left'
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
    | 'external-link'
    | 'pause'
    | 'play'
    | 'link';

  const props = withDefaults(
    defineProps<{
      modelValue?: string;
      label?: string;
      icon?: IconName;
      type?: InputType;
      placeholder?: string;
      required?: boolean;
      error?: string;
      showClear?: boolean;
      disabled?: boolean;
      rows?: number;
      labelSize?: 'sm' | 'lg';
    }>(),
    {
      modelValue: '',
      type: 'text',
      showClear: true,
      rows: 1,
      labelSize: 'sm',
    }
  );

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
    (e: 'clear'): void;
  }>();

  const showPreview = ref(false);

  const hasContent = computed(() => props.modelValue && props.modelValue.length > 0);

  const isMultiline = computed(() => props.type === 'textarea' || props.type === 'markdown');

  const renderMarkdown = (content: string | undefined) => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
  };

  const handleClear = () => {
    emit('update:modelValue', '');
    emit('clear');
  };

  const filterNewlines = (value: string) => {
    return value.replace(/\r\n|\r|\n/g, ' ');
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement | HTMLInputElement;
    let value = target.value;

    if (!isMultiline.value) {
      value = filterNewlines(value);
    }

    emit('update:modelValue', value);
  };
</script>

<template>
  <div class="space-y-2">
    <div v-if="label || isMultiline" class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <AppIcon
          v-if="icon"
          :name="icon"
          :class-name="labelSize === 'lg' ? 'w-5 h-5 text-red-300' : 'w-4 h-4 text-[#888]'"
        />
        <label v-if="label" :class="labelSize === 'lg' ? 'text-lg font-medium text-[#c9c9c9]' : 'text-sm text-[#888]'">
          {{ label }}
          <span v-if="required" class="text-red-300">*</span>
        </label>
        <AppIcon v-if="type === 'markdown'" name="markdown" class-name="w-4 h-4 text-[#888]" />
      </div>
      <div v-if="isMultiline" class="flex items-center gap-2">
        <button
          v-if="type === 'markdown'"
          tabindex="-1"
          class="px-3 py-1.5 text-sm text-red-300 bg-black/20 rounded-lg hover:bg-black/30 hover:text-[#fca5a5] transition-colors"
          @click="showPreview = !showPreview"
        >
          {{ showPreview ? '编辑模式' : '预览模式' }}
        </button>
        <button
          v-if="hasContent && showClear"
          tabindex="-1"
          class="p-1.5 text-[#888] bg-black/20 rounded-lg hover:bg-black/30 hover:text-red-300 transition-colors"
          title="清空"
          @click="handleClear"
        >
          <AppIcon name="close" class-name="w-4 h-4" />
        </button>
      </div>
    </div>

    <div
      v-if="type === 'markdown' && showPreview"
      class="w-full px-4 py-3 bg-black/10 border border-[#c9c9c9]/10 rounded-lg text-[#e0e0e0] min-h-25 prose prose-invert prose-sm max-w-none"
      v-html="renderMarkdown(modelValue)"
    ></div>

    <div v-else class="relative group">
      <textarea
        v-if="isMultiline"
        v-autosize
        :value="modelValue"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[
          'w-full px-4 py-3 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all leading-relaxed resize-none',
          error ? 'border-red-400/70' : 'border-[#c9c9c9]/20',
        ]"
        @input="handleInput"
      ></textarea>
      <input
        v-else
        :value="modelValue"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[
          'w-full px-4 py-2.5 bg-black/20 border rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all',
          error ? 'border-red-400/70' : 'border-[#c9c9c9]/20',
          showClear && hasContent ? 'pr-10' : '',
        ]"
        @input="handleInput"
        @keydown.enter.prevent
      />
      <button
        v-if="showClear && hasContent && type === 'text'"
        tabindex="-1"
        class="absolute right-3 top-3 text-[#888] hover:text-red-300 transition-colors"
        title="清空"
        @click="handleClear"
      >
        <AppIcon name="close" class-name="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-xs text-red-300">{{ error }}</p>
  </div>
</template>
