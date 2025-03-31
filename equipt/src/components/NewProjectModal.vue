<script setup>
import { ref, watch } from 'vue'
import { useUserSearch } from '../composables/useUserSearch'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'submit'])

const projectData = ref({
  name: '',
  description: '',
  version: '0.1.0',
  files: [],
  collaborators: []
})

const { searchResults, loading: searchLoading, searchUsers } = useUserSearch()
const searchQuery = ref('')
const showResults = ref(false)

// Debounce search
let searchTimeout
watch(searchQuery, (newQuery) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchUsers(newQuery)
  }, 300)
})

const addCollaborator = (user, role = 'viewer') => {
  // Don't add if already in the list
  if (projectData.value.collaborators.some(c => c.id === user.id)) {
    return
  }

  projectData.value.collaborators.push({
    id: user.id,
    display_name: user.display_name,
    email: user.email,
    avatar_url: user.avatar_url,
    role
  })

  // Clear search
  searchQuery.value = ''
  showResults.value = false
}

const removeCollaborator = (userId) => {
  projectData.value.collaborators = projectData.value.collaborators.filter(
    c => c.id !== userId
  )
}

const updateCollaboratorRole = (userId, newRole) => {
  const collaborator = projectData.value.collaborators.find(c => c.id === userId)
  if (collaborator) {
    collaborator.role = newRole
  }
}

const fileInputRef = ref(null)

const handleSubmit = () => {
  emit('submit', {
    ...projectData.value,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  })
  resetForm()
}

const handleFileChange = (event) => {
  const files = Array.from(event.target.files)
  projectData.value.files = files
}

const resetForm = () => {
  projectData.value = {
    name: '',
    description: '',
    version: '0.1.0',
    files: [],
    collaborators: []
  }
  searchQuery.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const closeModal = () => {
  resetForm()
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content card" @click.stop>
      <div class="modal-header">
        <h2>New Project</h2>
        <button class="close-button" @click="closeModal">×</button>
      </div>

      <form @submit.prevent="handleSubmit" class="project-form">
        <div class="form-group">
          <label for="project-name">Project Name</label>
          <input
            id="project-name"
            v-model="projectData.name"
            type="text"
            required
            placeholder="Enter project name"
          >
        </div>

        <div class="form-group">
          <label for="project-description">Description</label>
          <textarea
            id="project-description"
            v-model="projectData.description"
            required
            placeholder="Describe your project"
            rows="4"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="project-version">Version</label>
          <input
            id="project-version"
            v-model="projectData.version"
            type="text"
            readonly
            class="version-input"
          >
          <small class="version-hint">Version number will automatically increment with each update</small>
        </div>

        <div class="form-group">
          <label>Collaborators</label>
          <div class="collaborator-search">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search users by name or email"
              @focus="showResults = true"
            >
            <div v-if="showResults && (searchResults.length > 0 || searchLoading)" class="search-results">
              <div v-if="searchLoading" class="search-loading">
                Searching...
              </div>
              <div
                v-else
                v-for="user in searchResults"
                :key="user.id"
                class="search-result-item"
                @click="addCollaborator(user)"
              >
                <div class="user-info">
                  <div class="user-avatar">
                    <img
                      v-if="user.avatar_url"
                      :src="user.avatar_url"
                      :alt="user.display_name"
                      referrerpolicy="no-referrer"
                    >
                    <div v-else class="avatar-placeholder">
                      {{ user.display_name?.[0]?.toUpperCase() }}
                    </div>
                  </div>
                  <div class="user-details">
                    <div class="user-name">{{ user.display_name }}</div>
                    <div class="user-email">{{ user.email }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="projectData.collaborators.length > 0" class="collaborators-list">
            <div v-for="collaborator in projectData.collaborators" :key="collaborator.id" class="collaborator-item">
              <div class="user-info">
                <div class="user-avatar">
                  <img
                    v-if="collaborator.avatar_url"
                    :src="collaborator.avatar_url"
                    :alt="collaborator.display_name"
                    referrerpolicy="no-referrer"
                  >
                  <div v-else class="avatar-placeholder">
                    {{ collaborator.display_name?.[0]?.toUpperCase() }}
                  </div>
                </div>
                <div class="user-details">
                  <div class="user-name">{{ collaborator.display_name }}</div>
                  <div class="user-email">{{ collaborator.email }}</div>
                </div>
              </div>
              
              <div class="collaborator-actions">
                <select
                  v-model="collaborator.role"
                  @change="updateCollaboratorRole(collaborator.id, $event.target.value)"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="button"
                  class="remove-collaborator"
                  @click="removeCollaborator(collaborator.id)"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="project-files">Project Files</label>
          <div class="file-upload-container">
            <input
              id="project-files"
              type="file"
              ref="fileInputRef"
              @change="handleFileChange"
              multiple
              class="file-input"
            >
            <div class="file-upload-box">
              <span class="upload-icon">📎</span>
              <span>Drop files here or click to upload</span>
            </div>
          </div>
          <div v-if="projectData.files.length" class="file-list">
            <div v-for="file in projectData.files" :key="file.name" class="file-item">
              <span>{{ file.name }}</span>
              <small>{{ (file.size / 1024).toFixed(1) }} KB</small>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Project</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--secondary-dark);
  padding: 2rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.close-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
}

.close-button:hover {
  color: var(--text-primary);
}

.project-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  color: var(--text-primary);
  font-weight: 500;
}

input[type="text"],
textarea {
  background: var(--primary-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  color: var(--text-primary);
  font-size: 1rem;
}

input[type="text"]:focus,
textarea:focus {
  border-color: var(--accent-blue);
  outline: none;
}

.version-input {
  background: rgba(255, 255, 255, 0.05) !important;
  cursor: not-allowed;
}

.version-hint {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.file-upload-container {
  position: relative;
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.file-upload-box {
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-icon {
  font-size: 2rem;
}

.file-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-item {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.collaborator-search {
  position: relative;
  margin-bottom: 0.5rem;
}

.collaborator-search input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--primary-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.collaborator-search input:focus {
  border-color: var(--accent-blue);
  outline: none;
}

.collaborator-search input::placeholder {
  color: var(--text-secondary);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--primary-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  margin-top: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
}

.search-loading {
  padding: 1rem;
  text-align: center;
  color: var(--text-secondary);
}

.search-result-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.search-result-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.collaborators-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.collaborator-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--secondary-dark);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--accent-blue);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name {
  font-weight: 500;
  color: var(--text-primary);
}

.user-email {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.collaborator-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.collaborator-actions select {
  background: var(--primary-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.remove-collaborator {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.remove-collaborator:hover {
  color: rgb(239, 68, 68);
}
</style> 