<template>
  <v-app>
    <template v-if="!userStore.authReady">
      <v-main>
        <div class="auth-loading">
          <v-progress-circular indeterminate color="primary" size="48" />
          <p class="auth-loading-text">Loading…</p>
        </div>
      </v-main>
    </template>
    <router-view v-else />
  </v-app>
</template>

<script setup>
import { useUserStore } from '@/stores'

const userStore = useUserStore()
</script>

<style scoped>
.auth-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: var(--color-background);
}

.auth-loading-text {
  font-family: var(--font-sans), sans-serif;
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}
</style>
