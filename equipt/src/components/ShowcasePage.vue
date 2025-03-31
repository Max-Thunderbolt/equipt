<script setup>
import { ref, onMounted } from 'vue'
import { supabase, TABLES } from '../supabase/config'

const featuredProjects = ref([])
const loading = ref(false)
const error = ref(null)

const fetchFeaturedProjects = async () => {
  loading.value = true
  error.value = null
  
  try {
    const { data, error: fetchError } = await supabase
      .from(TABLES.PROJECTS)
      .select(`
        *,
        profiles:${TABLES.PROFILES}(display_name),
        ${TABLES.PROJECT_FILES}(*)
      `)
      .order('created_at', { ascending: false })
      .limit(6)

    if (fetchError) throw fetchError
    featuredProjects.value = data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFeaturedProjects()
})
</script>

<template>
  <div class="showcase-page container">
    <div class="showcase-header">
      <h1>Featured Projects</h1>
      <p class="subtitle">Discover the best creative projects from our community</p>
    </div>
    
    <div v-if="loading" class="loading">Loading featured projects...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="featuredProjects.length === 0" class="empty-state">
      <p>No featured projects yet.</p>
    </div>
    <div v-else class="featured-grid">
      <div v-for="project in featuredProjects" :key="project.id" class="featured-card card">
        <div class="featured-content">
          <h3>{{ project.title }}</h3>
          <p>{{ project.description }}</p>
          <div class="project-meta">
            <span>By {{ project.profiles?.display_name }}</span>
            <span>{{ project.project_files?.length || 0 }} files</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.showcase-page {
  max-width: 1200px;
  margin: 0 auto;
}

.showcase-header {
  text-align: center;
  margin-bottom: 4rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.25rem;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.featured-card {
  padding: 2rem;
  transition: transform 0.2s ease;
  background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.05), transparent);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.featured-card:hover {
  transform: translateY(-4px);
}

.featured-content h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.featured-content p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.error-message {
  color: var(--error);
  padding: 1rem;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
}
</style> 