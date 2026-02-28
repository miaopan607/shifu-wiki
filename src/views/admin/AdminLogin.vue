<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { pb } from '@/lib/pocketbase';

const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const showPassword = ref(false);

onMounted(() => {
    document.documentElement.classList.add('admin-page');
    if (pb.authStore.isValid) {
        const redirect = route.query.redirect as string || '/admin';
        router.push(redirect);
    }
});

onUnmounted(() => {
    document.documentElement.classList.remove('admin-page');
});

const handleLogin = async () => {
    if (!username.value.trim() || !password.value) {
        error.value = '请输入用户名和密码';
        return;
    }

    loading.value = true;
    error.value = '';

    try {
        await pb.collection('users').authWithPassword(
            username.value.trim(),
            password.value
        );
        
        const redirect = route.query.redirect as string || '/admin';
        router.push(redirect);
    } catch (err: unknown) {
        console.error('Login error:', err);
        if (err && typeof err === 'object' && 'status' in err) {
            const pbErr = err as { status?: number };
            if (pbErr.status === 400) {
                error.value = '用户名或密码错误';
            } else {
                error.value = '登录失败，请稍后重试';
            }
        } else {
            error.value = '登录失败，请稍后重试';
        }
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="min-h-full bg-[rgb(77,0,0)] flex items-center justify-center p-4 font-serif">
        <div class="w-full max-w-md">
            <div class="bg-[rgb(60,0,0)] rounded-xl border border-[#c9c9c9]/20 p-8">
                <div class="text-center mb-8">
                    <h1 class="text-2xl font-semibold text-[#c9c9c9] mb-2">管理后台</h1>
                    <p class="text-[#888]">请登录以继续</p>
                </div>

                <form @submit.prevent="handleLogin" class="space-y-5">
                    <div>
                        <label for="username" class="block text-sm text-[#c9c9c9] mb-1.5">
                            用户名
                        </label>
                        <input
                            id="username"
                            v-model="username"
                            type="text"
                            autocomplete="username"
                            class="w-full px-4 py-2.5 bg-[rgb(77,0,0)] border border-[#c9c9c9]/30 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all"
                            placeholder="请输入用户名"
                            :disabled="loading"
                        />
                    </div>

                    <div>
                        <label for="password" class="block text-sm text-[#c9c9c9] mb-1.5">
                            密码
                        </label>
                        <div class="relative">
                            <input
                                id="password"
                                v-model="password"
                                :type="showPassword ? 'text' : 'password'"
                                autocomplete="current-password"
                                class="w-full px-4 py-2.5 bg-[rgb(77,0,0)] border border-[#c9c9c9]/30 rounded-lg text-[#e0e0e0] placeholder-[#888] focus:outline-none focus:border-red-300/50 transition-all pr-10"
                                placeholder="请输入密码"
                                :disabled="loading"
                            />
                            <button
                                type="button"
                                @click="showPassword = !showPassword"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#c9c9c9]"
                                tabindex="-1"
                            >
                                <svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div v-if="error" class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p class="text-sm text-red-300">{{ error }}</p>
                    </div>

                    <button
                        type="submit"
                        :disabled="loading"
                        class="w-full py-2.5 px-4 bg-transparent hover:bg-white/5 border border-red-300/50 disabled:border-[#888]/30 disabled:text-[#888] text-red-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span>{{ loading ? '登录中...' : '登录' }}</span>
                    </button>
                </form>

                <div class="mt-6 pt-6 border-t border-[#c9c9c9]/20">
                    <RouterLink to="/" class="text-sm text-[#888] hover:text-red-300 transition-colors">
                        ← 返回网站首页
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
.animate-spin {
    animation: spin 1s linear infinite;
}
</style>
