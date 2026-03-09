<script setup lang="ts">
  import { RouterLink } from 'vue-router';
</script>

<template>
  <main class="min-h-screen bg-[rgb(77,0,0)] flex flex-col items-center justify-center p-8 font-serif text-[#c9c9c9]">
    <h1 class="text-9xl mb-4 tracking-widest opacity-20 select-none">404</h1>
    <div class="text-center z-10 relative -mt-16">
      <h2 class="text-3xl mb-8 tracking-widest">页面未找到</h2>
      <p class="mb-12 text-[#888] tracking-wider">被黄圆圆吃掉了</p>
      <RouterLink
        to="/"
        class="inline-block border border-[#c9c9c9]/30 px-8 py-3 hover:bg-[#c9c9c9] hover:text-[rgb(77,0,0)] transition-all duration-300 tracking-widest"
      >
        返回首页
      </RouterLink>
    </div>
  </main>
</template>
