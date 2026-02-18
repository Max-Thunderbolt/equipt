<template>
  <div class="page">
    <h1 class="page__title">Projects</h1>
    <p class="page__text">Your projects will appear here.</p>
    <router-link to="/" class="page__link">Back to home</router-link>
  </div>
</template>

<script setup>
definePage({
  meta: {
    requiresAuth: true,
  },
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--color-background);
}

.page__title {
  font-family: var(--font-sans), sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 1rem;
}

.page__text {
  font-family: var(--font-sans), sans-serif;
  color: var(--color-text-secondary);
  margin: 0 0 1.5rem;
}

.page__link {
  font-family: var(--font-sans), sans-serif;
  color: var(--equipt-orange);
  text-decoration: none;
  font-weight: 500;
}

.page__link:hover {
  text-decoration: underline;
}
</style>
