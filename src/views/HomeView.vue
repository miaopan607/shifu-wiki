<script setup lang="ts">
  import { RouterLink } from 'vue-router';

  const settings = {
    home_title: '黄诗扶 Wiki',
    home_subtitle: '开发预览',
    home_slogan_1: '卿卿与黄',
    home_slogan_2: '地久天长',
  };
</script>

<template>
  <main class="min-h-screen bg-[rgb(77,0,0)] flex flex-col items-center justify-center p-4">
    <div class="max-w-2xl w-full text-center space-y-8">
      <!-- 标题 -->
      <header class="space-y-2">
        <h1 class="text-5xl font-serif text-[#c9c9c9] tracking-widest drop-shadow-[0_0_15px_rgba(162,50,62,0.3)]">{{
          settings.home_title
        }}</h1>
      </header>

      <header class="space-y-2">
        <h1 class="text-2xl font-serif text-[#c9c9c9] tracking-widest drop-shadow-[0_0_15px_rgba(162,50,62,0.3)]">{{
          settings.home_subtitle
        }}</h1>
      </header>

      <!-- 装饰线 -->
      <div class="flex justify-center">
        <div class="h-0.5 w-24 bg-[#c9c9c9] shadow-[0_0_8px] shadow-[#c9c9c9]"></div>
      </div>

      <!-- 卿卿与黄，地久天长！ -->
      <section class="flex flex-col items-center py-2">
        <div class="[writing-mode:vertical-rl] text-2xl font-serif text-[#c9c9c9] h-40 leading-relaxed tracking-widest">
          <p>{{ settings.home_slogan_1 }}</p>
          <p class="mt-4 text-red-300">{{ settings.home_slogan_2 }}</p>
        </div>
      </section>

      <!-- 装饰线 -->
      <div class="flex justify-center">
        <div class="h-0.5 w-24 bg-[#c9c9c9] shadow-[0_0_8px] shadow-[#c9c9c9]"></div>
      </div>

      <!-- 导航 -->
      <nav class="flex justify-center gap-6 text-md font-light text-[#c9c9c9] text-lg">
        <RouterLink to="/songs" class="links">音乐</RouterLink>
        <RouterLink to="/activities" class="links">活动</RouterLink>
        <RouterLink to="/galleries" class="links">图集</RouterLink>
        <RouterLink to="/misc" class="links">杂记</RouterLink>
        <RouterLink to="/profile" class="links">个人介绍</RouterLink>
      </nav>

      <!-- 关于 -->
      <nav class="flex justify-center gap-6 text-md font-light text-[#c9c9c9] text-lg">
        <RouterLink to="/about" class="links">关于</RouterLink>
      </nav>
    </div>
  </main>
</template>

<style scoped>
  h1,
  p,
  div {
    font-family: var(--font-serif);
  }
</style>
