<script setup lang="ts">
  import { RouterLink } from 'vue-router';
  import AppIcon from '@/components/AppIcon.vue';

  const settings = {
    about_description:
      '黄诗扶 Wiki 是一个由粉丝维护的非官方资料站，致力于整理和分享黄诗扶的音乐作品、活动记录等相关信息。',
    about_github: 'https://github.com/miaopan607/shifu-wiki',
    about_contact: 'miaopan607@foxmail.com',
    about_disclaimer: '本站为粉丝自建非官方网站，所有资料仅供参考。如有侵权或错误，请联系项目维护者。',
  };
</script>

<template>
  <main class="min-h-screen bg-[rgb(77,0,0)] p-8 md:p-20 font-serif text-[#e0e0e0]">
    <div class="max-w-2xl mx-auto">
      <header class="mb-16">
        <RouterLink to="/" class="text-lg text-red-300 hover:text-[#c9c9c9] transition-colors">← 返回首页</RouterLink>
      </header>

      <div class="space-y-12">
        <!-- 页面标题 -->
        <section>
          <h1 class="text-4xl text-[#c9c9c9] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(201,201,201,0.3)] mb-6">
            关于
          </h1>
          <p class="text-[#888] leading-relaxed tracking-wider">
            {{ settings.about_description }}
          </p>
        </section>

        <!-- 装饰线 -->
        <div class="h-px w-full bg-[#c9c9c9]/20"></div>

        <!-- GitHub 仓库 -->
        <section>
          <h2 class="text-2xl text-[#c9c9c9] tracking-widest mb-6">开源仓库</h2>
          <a
            :href="settings.about_github"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-3 text-red-300 hover:text-[#c9c9c9] transition-colors group"
          >
            <AppIcon name="github" class-name="w-6 h-6" />
            <span class="text-lg border-b border-transparent group-hover:border-[#c9c9c9] transition-all"
              >GitHub - shifu-wiki</span
            >
          </a>
        </section>

        <!-- 装饰线 -->
        <div class="h-px w-full bg-[#c9c9c9]/20"></div>

        <!-- 鸣谢名单 -->
        <section>
          <h2 class="text-2xl text-[#c9c9c9] tracking-widest mb-6">鸣谢</h2>
          <p class="text-[#888] mb-6 leading-relaxed"> 感谢以下人员对项目的贡献与支持： </p>
          <ul class="space-y-3 text-[#c9c9c9]">
            <li class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-red-300 rounded-full"></span>
              <span>甲</span>
            </li>
            <li class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-red-300 rounded-full"></span>
              <span>乙</span>
            </li>
            <li class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-red-300 rounded-full"></span>
              <span>丙</span>
            </li>
          </ul>
        </section>

        <!-- 装饰线 -->
        <div class="h-px w-full bg-[#c9c9c9]/20"></div>

        <!-- 联系方式 -->
        <section>
          <h2 class="text-2xl text-[#c9c9c9] tracking-widest mb-6">联系方式</h2>
          <p class="text-[#888] leading-relaxed">
            如有任何问题或建议，欢迎邮件联系：
            <a
              :href="'mailto:' + settings.about_contact"
              class="text-red-300 hover:text-[#c9c9c9] transition-colors border-b border-transparent hover:border-[#c9c9c9]"
              >{{ settings.about_contact }}</a
            >
          </p>
        </section>

        <!-- 装饰线 -->
        <div class="h-px w-full bg-[#c9c9c9]/20"></div>

        <!-- 免责声明 -->
        <section>
          <p class="text-[#666] text-sm leading-relaxed">
            {{ settings.about_disclaimer }}
          </p>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
  h1,
  h2,
  p,
  li,
  span {
    font-family: var(--font-serif);
  }
</style>
