<script setup lang="ts">
  import { RouterView } from 'vue-router';
</script>

<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<style>
  /* Global styles are already in global.css */
  .app-container {
    height: 100%;
  }
</style>
