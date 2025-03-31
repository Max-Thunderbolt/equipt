<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  project: {
    type: Object,
    required: true,
    default: () => ({
      title: '',
      description: '',
      thumbnail: '',
      author: '',
      lastUpdated: '',
      tags: []
    })
  }
})
</script>

<template>
  <div class="project-card card">
    <div class="project-thumbnail" v-if="project.thumbnail">
      <img :src="project.thumbnail" :alt="project.title">
    </div>
    
    <div class="project-content">
      <h3 class="project-title">{{ project.title }}</h3>
      <p class="project-description">{{ project.description }}</p>
      
      <div class="project-tags">
        <span 
          v-for="tag in project.tags" 
          :key="tag"
          class="tag"
        >
          {{ tag }}
        </span>
      </div>
      
      <div class="project-meta">
        <span class="author">{{ project.author }}</span>
        <span class="date">{{ project.lastUpdated }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.project-thumbnail {
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.project-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.project-title {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.project-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.project-meta {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.author {
  font-weight: 500;
}

.date {
  opacity: 0.8;
}
</style> 