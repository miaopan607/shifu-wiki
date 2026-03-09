<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { getSkipSingleLockDeleteConfirmPreference, updateSkipSingleLockDeleteConfirmPreference } from '@/lib/adminPreferences';
import { uploadStore } from '@/stores/uploadStore';

const saved = ref(false);
const error = ref('');
const draftMaxConcurrentUploads = ref(String(uploadStore.maxConcurrentUploads.value));
const draftSkipSingleLockDeleteConfirm = ref(false);
const lockSettingsSaving = ref(false);
const lockSettingsSaved = ref(false);
const lockSettingsError = ref('');

onMounted(() => {
	draftSkipSingleLockDeleteConfirm.value = getSkipSingleLockDeleteConfirmPreference();
});

watch(
	() => uploadStore.maxConcurrentUploads.value,
	(value) => {
		draftMaxConcurrentUploads.value = String(value);
	},
);

const saveSettings = () => {
	saved.value = false;
	error.value = '';

	const parsedValue = Number(draftMaxConcurrentUploads.value);
	if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 50) {
		error.value = '请输入 1 到 50 之间的整数。';
		return;
	}

	uploadStore.setMaxConcurrentUploads(parsedValue);
	draftMaxConcurrentUploads.value = String(uploadStore.maxConcurrentUploads.value);
	saved.value = true;
};

const saveLockSettings = async () => {
	lockSettingsSaved.value = false;
	lockSettingsError.value = '';
	lockSettingsSaving.value = true;

	try {
		const updatedValue = await updateSkipSingleLockDeleteConfirmPreference(draftSkipSingleLockDeleteConfirm.value);
		draftSkipSingleLockDeleteConfirm.value = updatedValue;
		lockSettingsSaved.value = true;
	} catch (saveError) {
		console.error('Failed to save lock settings:', saveError);
		lockSettingsError.value = '保存锁设置失败，请稍后重试。';
	} finally {
		lockSettingsSaving.value = false;
	}
};
</script>

<template>
	<div class="max-w-4xl mx-auto space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-semibold text-[#c9c9c9]">设置</h1>
				<p class="mt-2 text-sm text-[#888]">上传相关配置会保存在当前浏览器；用户偏好会保存在当前登录账号中。</p>
			</div>
		</div>

		<div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
			<div>
				<h2 class="text-lg font-medium text-[#c9c9c9]">上传设置</h2>
				<p class="mt-2 text-sm text-[#888]">控制后台上传时允许同时进行的上传数量。数值越大，速度可能更快，但也更容易占满带宽。</p>
			</div>

			<div class="grid gap-4 md:grid-cols-[minmax(0,20rem)_auto] md:items-end">
				<label class="block space-y-2">
					<span class="block text-sm text-[#c9c9c9]">同时进行的上传数量</span>
					<input
						v-model="draftMaxConcurrentUploads"
						type="number"
						min="1"
						max="50"
						step="1"
						class="number-input w-full px-4 py-3 bg-black/20 border border-[#c9c9c9]/20 rounded-lg text-[#e0e0e0] focus:outline-none focus:border-red-300/50 transition-all"
						@keydown.enter.prevent="saveSettings"
					/>
				</label>

				<button class="px-5 py-3 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors" @click="saveSettings">保存设置</button>
			</div>

			<p class="text-sm text-[#888]">当前生效值：{{ uploadStore.maxConcurrentUploads }}，允许范围：1 ~ 50。</p>
			<p v-if="saved" class="text-sm text-green-300">设置已保存并立即生效。</p>
			<p v-if="error" class="text-sm text-red-300">{{ error }}</p>
		</div>

		<div class="bg-[rgb(60,0,0)] border border-[#c9c9c9]/20 rounded-xl p-6 space-y-5">
			<div>
				<h2 class="text-lg font-medium text-[#c9c9c9]">锁设置</h2>
				<p class="mt-2 text-sm text-[#888]">控制移除单个编辑锁时是否显示确认提示。这个偏好会保存在当前登录用户中。</p>
			</div>

			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<label class="flex items-center gap-3 cursor-pointer select-none">
					<button
						type="button"
						role="switch"
						:aria-checked="draftSkipSingleLockDeleteConfirm"
						@click="draftSkipSingleLockDeleteConfirm = !draftSkipSingleLockDeleteConfirm"
						:class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors', draftSkipSingleLockDeleteConfirm ? 'bg-red-700' : 'bg-[#888]/30']"
					>
						<span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition-transform', draftSkipSingleLockDeleteConfirm ? 'translate-x-6' : 'translate-x-1']" />
					</button>
					<span class="text-[#c9c9c9]">移除单个锁时跳过确认提示</span>
				</label>

				<button
					class="px-5 py-3 bg-red-300 text-[rgb(77,0,0)] font-semibold rounded-lg hover:bg-[#fca5a5] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
					@click="saveLockSettings"
					:disabled="lockSettingsSaving"
				>
					{{ lockSettingsSaving ? '保存中...' : '保存锁设置' }}
				</button>
			</div>

			<p class="text-sm text-[#888]">当前状态：{{ draftSkipSingleLockDeleteConfirm ? '已开启，单个移除将不再提示' : '已关闭，单个移除仍会先确认' }}。</p>
			<p v-if="lockSettingsSaved" class="text-sm text-green-300">锁设置已保存。</p>
			<p v-if="lockSettingsError" class="text-sm text-red-300">{{ lockSettingsError }}</p>
		</div>
	</div>
</template>

<style scoped>
.number-input {
	appearance: textfield;
	-moz-appearance: textfield;
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
	-webkit-appearance: none;
	margin: 0;
}
</style>
