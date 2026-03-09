<script setup lang="ts">
import { formatEditLockDateTime } from '@/lib/editLock';

defineProps<{
	visible: boolean;
	message: string;
	lockingUser?: string | null;
	lockedAt?: string | null;
}>();

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'force'): void;
}>();
</script>

<template>
	<Teleport to="body">
		<Transition name="fade">
			<div v-if="visible" class="fixed inset-0 z-10020 flex items-center justify-center bg-black/70 px-4" @click.self="emit('close')">
				<div class="w-full max-w-lg rounded-2xl border border-yellow-500/30 bg-[rgb(60,0,0)] shadow-2xl overflow-hidden">
					<div class="border-b border-[#c9c9c9]/10 bg-black/10 px-6 py-4">
						<h3 class="text-lg font-semibold text-[#f3d38a]">检测到编辑锁</h3>
						<p class="mt-2 text-sm text-[#c9c9c9]">当前记录仍处于编辑锁状态。你可以返回编辑，或强行提交并清除原有锁。</p>
					</div>

					<div class="space-y-4 px-6 py-5 text-sm text-[#c9c9c9]">
						<div class="rounded-xl border border-[#c9c9c9]/10 bg-black/10 p-4 leading-6">
							{{ message }}
						</div>
						<div v-if="lockingUser || lockedAt" class="rounded-xl border border-[#c9c9c9]/10 bg-black/10 p-4 space-y-2">
							<p class="flex items-center justify-between gap-4">
								<span class="text-[#888]">锁用户</span>
								<span class="text-yellow-300">{{ lockingUser || '未知用户' }}</span>
							</p>
							<p class="flex items-center justify-between gap-4">
								<span class="text-[#888]">加锁时间</span>
								<span>{{ formatEditLockDateTime(lockedAt) }}</span>
							</p>
						</div>
						<div class="rounded-xl border border-yellow-500/20 bg-yellow-500/8 p-4 text-yellow-100/90 leading-6">
							<p>如果你认为原有锁已失效，或者你知道你在做什么，可以移除原有锁后继续保存。</p>
							<p>强行提交会自动清除当前记录上已有的编辑锁，并继续本次保存。</p>
						</div>
					</div>

					<div class="flex items-center justify-end gap-3 border-t border-[#c9c9c9]/10 px-6 py-4 bg-black/10">
						<button type="button" class="rounded-lg px-4 py-2 text-sm text-[#c9c9c9] hover:bg-white/5 transition-colors" @click="emit('close')">返回编辑</button>
						<button type="button" class="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-[rgb(77,0,0)] hover:bg-yellow-300 transition-colors" @click="emit('force')">
							移除原有锁并保存
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
