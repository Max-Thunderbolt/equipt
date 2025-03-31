<script setup>
import { ref } from 'vue'

const navigationItems = ref([
  { name: 'Projects', path: '/projects' },
  { name: 'Explore', path: '/explore' },
  { name: 'Showcase', path: '/showcase' }
])
</script>

<template>
  <nav class="nav-container">
    <div class="container flex items-center justify-between">
      <div class="nav-brand">
        <router-link to="/" class="brand-link">
          <h1 class="brand-text">equipt.</h1>
        </router-link>
      </div>
      
      <div class="nav-items">
        <router-link 
          v-for="item in navigationItems" 
          :key="item.path"
          :to="item.path"
          class="nav-item"
        >
          {{ item.name }}
        </router-link>
      </div>

      <div class="nav-actions">
        <button class="btn btn-primary">New Project</button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-container {
  background-color: var(--primary-dark);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand-link {
  text-decoration: none;
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.nav-items {
  display: flex;
  gap: 2rem;
}

.nav-item {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.nav-item:hover,
.nav-item.router-link-active {
  color: var(--text-primary);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style> 