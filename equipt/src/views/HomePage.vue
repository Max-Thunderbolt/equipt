<script setup>
import { useAuth } from '../composables/useAuth'

const { user } = useAuth()
</script>

<template>
  <div class="home-page container">
    <div class="hero">
      <h1>Welcome to equipt.</h1>
      <p class="subtitle">Your creative project ideas, organized and shared.</p>
      
      <div v-if="!user" class="cta">
        <p>Join our community of creators and start sharing your projects today.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  padding: 4rem 0;
}

.hero {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, var(--accent-blue), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 1.5rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.cta {
  margin-top: 3rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.cta p {
  font-size: 1.25rem;
  color: var(--text-secondary);
}
</style> 