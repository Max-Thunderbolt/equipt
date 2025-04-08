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

<!-- Styles are now in src/styles/home.css --> 