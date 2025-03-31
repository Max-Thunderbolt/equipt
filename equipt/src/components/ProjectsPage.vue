<script setup>
import { ref, onMounted } from 'vue'
import { useProfile } from '../composables/useProfile'
import { useProjects } from '../composables/useProjects'
import { useRouter } from 'vue-router'

const router = useRouter()
const { projects, loading, error, fetchUserProjects } = useProfile()
const { createProject } = useProjects()

const isCreateModalOpen = ref(false)
const newProject = ref({
  name: '',
  description: '',
  is_public: false
})
const createError = ref(null)
const isCreating = ref(false)

const openCreateModal = () => {
  newProject.value = {
    name: '',
    description: '',
    is_public: false
  }
  createError.value = null
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  isCreateModalOpen.value = false
}

const handleCreateProject = async () => {
  if (!newProject.value.name) {
    createError.value = 'Project name is required'
    return
  }
  
  try {
    isCreating.value = true
    createError.value = null
    const project = await createProject(newProject.value)
    closeCreateModal()
    router.push(`/projects/${project.id}`)
  } catch (err) {
    console.error('Error creating project:', err)
    createError.value = err.message || 'Failed to create project'
  } finally {
    isCreating.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '/');
}

const refreshProjects = async () => {
  await fetchUserProjects()
}

onMounted(async () => {
  await fetchUserProjects()
})
</script>

<template>
  <div class="projects-page container">
    <div class="page-header">
      <h1>My Projects</h1>
      <div class="header-actions">
        <button 
          class="btn btn-icon refresh-btn" 
          @click="refreshProjects" 
          :disabled="loading"
          title="Refresh projects"
        >
          <span class="refresh-icon">↻</span>
        </button>
        <button class="btn btn-primary" @click="openCreateModal">
          <span class="icon">+</span>
          Create Project
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading projects...</p>
    </div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="projects.length === 0" class="empty-state">
      <p>You haven't created any projects yet.</p>
      <button class="btn btn-primary" @click="openCreateModal">Create Your First Project</button>
    </div>
    <div v-else class="projects-grid">
      <div 
        v-for="project in projects" 
        :key="project.id" 
        class="project-card card"
        @click="$router.push(`/projects/${project.id}`)"
      >
        <div class="project-header">
          <h3>{{ project.name || 'Untitled Project' }}</h3>
          <span 
            v-if="project.role" 
            class="role-badge" 
            :class="{ 
              'owner': project.role === 'owner', 
              'admin': project.role === 'admin', 
              'member': project.role === 'member' 
            }"
          >
            {{ project.role }}
          </span>
        </div>
        <p v-if="project.description" class="project-description">{{ project.description }}</p>
        <p v-else class="project-description empty">No description provided</p>
        <div class="project-meta">
          <span class="version-tag">v{{ project.version || '0.1.0' }}</span>
          <span class="date">{{ formatDate(project.created_at) }}</span>
        </div>
      </div>
    </div>
    
    <!-- Create Project Modal -->
    <div v-if="isCreateModalOpen" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create New Project</h2>
          <button class="close-btn" @click="closeCreateModal">&times;</button>
        </div>
        <form @submit.prevent="handleCreateProject" class="create-form">
          <div class="form-group">
            <label for="project-name">Project Name *</label>
            <input 
              type="text" 
              id="project-name" 
              v-model="newProject.name"
              placeholder="Enter project name"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="project-description">Description</label>
            <textarea 
              id="project-description" 
              v-model="newProject.description"
              placeholder="Enter project description (optional)"
              rows="4"
            ></textarea>
          </div>
          
          <div class="checkbox-group">
            <div class="checkbox-label">
              <input 
                type="checkbox" 
                id="project-public" 
                v-model="newProject.is_public"
              />
              <label for="project-public">Make project public</label>
            </div>
            <div class="checkbox-help">
              Public projects can be discovered by other users
            </div>
          </div>
          
          <div v-if="createError" class="error-message">{{ createError }}</div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeCreateModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="isCreating">
              {{ isCreating ? 'Creating...' : 'Create Project' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projects-page {
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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  background: var(--card-bg, var(--secondary-dark));
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.project-card h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
}

.role-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.role-badge.owner {
  background-color: var(--primary);
  color: var(--white);
}

.role-badge.admin {
  background-color: var(--success);
  color: var(--white);
}

.role-badge.member {
  background-color: var(--info);
  color: var(--white);
}

.project-description {
  color: var(--text-secondary);
  margin-bottom: auto;
  font-size: 0.875rem;
  line-height: 1.5;
  max-height: 4.5em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.project-description.empty {
  color: var(--text-muted, #666);
  font-style: italic;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.75rem;
  padding-top: 0.75rem;
  margin-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.version-tag {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.7rem;
}

.date {
  color: var(--text-muted, #777);
}

.empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  color: var(--text-secondary);
}

.loading-spinner {
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: var(--error);
  padding: 1rem;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.btn {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.btn-primary {
  background-color: var(--primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-dark, #205db5);
}

.btn-secondary {
  background-color: var(--secondary-dark);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background-color: var(--secondary);
}

.btn .icon {
  margin-right: 6px;
  font-weight: bold;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--secondary-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: var(--secondary);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  font-size: 1rem;
  color: var(--text-secondary);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  background-color: var(--background-dark);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  margin: 0;
}

.create-form {
  padding: 1.5rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: var(--input-bg, #1a1a1a);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 1.5rem;
}

.checkbox-group {
  margin-bottom: 1.25rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
}

.checkbox-label input {
  margin-right: 0.5rem;
}

.checkbox-help {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 1.6rem;
}
</style> 