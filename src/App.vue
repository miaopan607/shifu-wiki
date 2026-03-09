<script setup lang="ts">
  import { RouterView, useRoute } from 'vue-router';
  import GlobalSearch from '@/components/GlobalSearch.vue';

  const route = useRoute();
</script>

<template>
  <div class="app-container">
    <router-view v-slot="{ Component }">
      <component :is="Component" :key="route.fullPath" />
    </router-view>
    <GlobalSearch v-if="!route.path.startsWith('/admin')" />
  </div>
</template>

<style>
  /* Global styles are already in global.css */
  .app-container {
    height: 100%;
  }
</style>
