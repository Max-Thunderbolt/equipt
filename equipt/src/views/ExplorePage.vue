<script setup>
import { ref, onMounted } from 'vue'
import { supabase, TABLES } from '../supabase/config'

const projects = ref([])
const loading = ref(false)
const error = ref(null)

const fetchPublicProjects = async () => {
  loading.value = true
  error.value = null
  
  try {
    const { data, error: fetchError } = await supabase
      .from(TABLES.PROJECTS)
      .select(`
        *,
        profiles:${TABLES.PROFILES}(display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (fetchError) throw fetchError
    projects.value = data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPublicProjects()
})
</script>

<template>
  <div class="explore-page container">
    <h1>Explore Projects</h1>
    
    <div v-if="loading" class="loading">Loading projects...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="projects.length === 0" class="empty-state">
      <p>No projects found.</p>
    </div>
    <div v-else class="projects-grid">
      <div v-for="project in projects" :key="project.id" class="project-card card">
        <h3>{{ project.title }}</h3>
        <p>{{ project.description }}</p>
        <div class="project-meta">
          <span>By {{ project.profiles?.display_name }}</span>
          <span>{{ new Date(project.created_at).toLocaleDateString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.explore-page {
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 2rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.project-card {
  padding: 1.5rem;
  transition: transform 0.2s ease;
}

.project-card:hover {
  transform: translateY(-4px);
}

.project-card h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.project-card p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
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