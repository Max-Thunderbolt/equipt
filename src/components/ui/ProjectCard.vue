<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const navigateToProject = () => {
  router.push(`/projects/${props.project.id}`)
}
</script>

<template>
  <div class="project-card" @click="navigateToProject">
    <div class="project-image">
      <img :src="project.cover_image || '/placeholder-project.jpg'" :alt="project.title">
    </div>
    <div class="project-info">
      <h3 class="project-title">{{ project.title }}</h3>
      <div class="project-meta">
        <div class="project-author">
          <img 
            :src="project.profiles?.avatar_url || '/placeholder-avatar.jpg'" 
            :alt="project.profiles?.display_name"
            class="author-avatar"
          >
          <span>{{ project.profiles?.display_name || 'Anonymous' }}</span>
        </div>
        <div class="project-stats">
          <span class="likes">
            <i class="fas fa-heart"></i>
            {{ project.likes || 0 }}
          </span>
          <span class="views">
            <i class="fas fa-eye"></i>
            {{ project.views || 0 }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-4px);
}

.project-image {
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
  background-color: #f5f5f5;
}

.project-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-info {
  padding: 1rem;
}

.project-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-author {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #f5f5f5;
}

.project-stats {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.likes, .views {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style> 