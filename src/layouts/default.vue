<template>
  <div class="layout">
    <TopNav />
    <v-main>
      <router-view />
    </v-main>
  </div>
</template>

<script setup>
import TopNav from './TopNav.vue'
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
</style>