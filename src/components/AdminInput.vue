<script setup lang="ts">
import { computed, ref } from 'vue';
import { marked } from 'marked';

type InputType = 'text' | 'textarea' | 'markdown';

const props = withDefaults(
	defineProps<{
		modelValue?: string;
		label?: string;
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

const localValue = computed({
	get: () => props.modelValue,
	set: (value: string) => emit('update:modelValue', value),
});

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
				<label v-if="label" :class="labelSize === 'lg' ? 'text-lg font-medium text-[#c9c9c9]' : 'text-sm text-[#888]'">
				{{ label }}
				<span v-if="required" class="text-red-300">*</span>
			</label>
				<svg
					v-if="type === 'markdown'"
					class="w-4 h-4 text-[#888]"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
					<path d="M7 15V9l2 2 2-2v6" />
					<path d="m14 11 2-2 2 2" />
					<path d="M16 9v6" />
				</svg>
			</div>
			<div v-if="isMultiline" class="flex items-center gap-2">
				<button
					v-if="type === 'markdown'"
					@click="showPreview = !showPreview"
					class="px-3 py-1.5 text-sm text-red-300 bg-black/20 rounded-lg hover:bg-black/30 hover:text-[#fca5a5] transition-colors"
				>
					{{ showPreview ? '编辑模式' : '预览模式' }}
				</button>
				<button
					v-if="hasContent && showClear"
					@click="handleClear"
					class="p-1.5 text-[#888] bg-black/20 rounded-lg hover:bg-black/30 hover:text-red-300 transition-colors"
					title="清空"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<div v-if="type === 'markdown' && showPreview" class="w-full px-4 py-3 bg-black/10 border border-[#c9c9c9]/10 rounded-lg text-[#e0e0e0] min-h-25 prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(modelValue)"></div>

		<div v-else class="relative group">
			<textarea
				v-if="isMultiline"
				:value="modelValue"
				v-autosize
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
				@click="handleClear"
				class="absolute right-3 top-3 text-[#888] hover:text-red-300 transition-colors"
				title="清空"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<p v-if="error" class="text-xs text-red-300">{{ error }}</p>
	</div>
</template>
