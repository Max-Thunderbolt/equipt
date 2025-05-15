<template>
  <div class="explore-page">
    <ExploreSideNav
      :initial-search="searchQuery"
      :initial-category="selectedCategory"
      :initial-sort="sortBy"
      @update:filters="handleFilterUpdate"
    />
    
    <div class="explore-content">
      <div class="explore-header">
        <h1>Explore Projects</h1>
      </div>
      
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading projects...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="fetchPublicProjects" class="retry-button">Try Again</button>
      </div>
      
      <div v-else-if="filteredProjects.length === 0" class="empty-state">
        <p>No projects found.</p>
      </div>
      
      <div v-else class="projects-grid">
        <ProjectCard
          v-for="project in filteredProjects"
          :key="project.id"
          :project="project"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase, TABLES } from '../supabase/config'
import ProjectCard from '../components/project/ProjectCard.vue'
import ExploreSideNav from '../components/ExploreSideNav.vue'

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
        profiles:${TABLES.PROFILES}(display_name, avatar_url)
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

const searchQuery = ref('')
const selectedCategory = ref('')
const sortBy = ref('recent')

const handleFilterUpdate = ({ search, category, sort }) => {
  searchQuery.value = search
  selectedCategory.value = category
  sortBy.value = sort
}

const filteredProjects = computed(() => {
  let result = [...projects.value]
  
  // Apply search filter
  if (searchQuery.value) {
    result = result.filter(project => 
      project.title.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  
  // Apply category filter
  if (selectedCategory.value) {
    result = result.filter(project => 
      project.category === selectedCategory.value
    )
  }
  
  // Apply sorting
  if (sortBy.value === 'popular') {
    result.sort((a, b) => b.likes - a.likes)
  } else if (sortBy.value === 'trending') {
    result.sort((a, b) => (b.views * 0.7 + b.likes * 0.3) - (a.views * 0.7 + a.likes * 0.3))
  }
  
  return result
})
</script>

<style scoped>
.explore-page {
  display: flex;
  min-height: calc(100vh - var(--navbar-height, 72px));
  margin-top: var(--navbar-height, 72px);
}

.explore-content {
  flex: 1;
  margin-left: 280px;
  padding: 2rem;
  max-width: calc(1440px - 280px);
}

.explore-header {
  margin-bottom: 2rem;
}

.explore-header h1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #2980b9;
}
</style> 