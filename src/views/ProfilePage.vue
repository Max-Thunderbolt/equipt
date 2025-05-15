<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'
import FilesGrid from '../components/files/FilesGrid.vue'
import { useFileStorage } from '../composables/useFileStorage'
import { supabase } from '../supabase/config'

const { user } = useAuth()
const { loading, error, fetchProfile, updateProfile, projects, fetchUserProjects } = useProfile()
const { updateMissingFileUrls } = useFileStorage()

const profile = ref(null)
const isEditing = ref(false)
const saving = ref(false)
const editForm = ref({
  display_name: '',
  email: '',
  avatar_url: '',
  bio: ''
})

// Carousel state
const itemsPerPage = 3
const currentPage = ref(0)

// Computed properties for projects
const hasProjects = computed(() => projects.value?.length > 0)

const displayedProjects = computed(() => {
  const start = currentPage.value * itemsPerPage
  return projects.value?.slice(start, start + itemsPerPage) || []
})

// Carousel navigation methods
const nextPage = () => {
  if (currentPage.value < Math.ceil(projects.value?.length / itemsPerPage) - 1) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

// Profile editing methods
const startEditing = () => {
  editForm.value = {
    display_name: profile.value?.display_name || '',
    email: profile.value?.email || '',
    avatar_url: profile.value?.avatar_url || '',
    bio: profile.value?.bio || ''
  }
  isEditing.value = true
}

const cancelEditing = () => {
  editForm.value = {
    display_name: profile.value?.display_name || '',
    email: profile.value?.email || '',
    avatar_url: profile.value?.avatar_url || '',
    bio: profile.value?.bio || ''
  }
  isEditing.value = false
}

const saveProfile = async () => {
  if (!user.value) return
  
  saving.value = true
  try {
    const updatedData = {
      ...editForm.value,
      bio: editForm.value.bio || ''
    }
    
    const updatedProfile = await updateProfile(user.value.id, updatedData)
    
    if (updatedProfile) {
      profile.value = updatedProfile
      isEditing.value = false
    }
  } catch (err) {
    console.error('Failed to update profile:', err)
  } finally {
    saving.value = false
  }
}

// Date formatting helper
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Add file related state and methods
const files = ref([])
const loadingFiles = ref(false)
const fileError = ref(null)

// Add new state for file management
const fileViewMode = ref('grid')
const fileSortOrder = ref('newest')
const fileSearchQuery = ref('')

// Add computed property for filtered files
const filteredFiles = computed(() => {
  let filtered = [...files.value]
  
  // Apply search filter
  if (fileSearchQuery.value.trim()) {
    const query = fileSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(file => 
      file.name.toLowerCase().includes(query)
    )
  }
  
  // Apply sorting
  if (fileSortOrder.value === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else if (fileSortOrder.value === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  } else if (fileSortOrder.value === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name))
  } else if (fileSortOrder.value === 'size') {
    filtered.sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0))
  }
  
  return filtered
})

// Update the fetchUserFiles function
const fetchUserFiles = async () => {
  if (!user.value) return
  
  loadingFiles.value = true
  fileError.value = null
  
  try {
    // First, get all projects the user has access to
    const { data: userProjects, error: projectsError } = await supabase
      .from('project_collaborators')
      .select(`
        project_id,
        projects (
          id,
          name,
          owner_id,
          is_public
        )
      `)
      .eq('user_id', user.value.id)
    
    if (projectsError) throw projectsError
    
    // Get project IDs the user has access to
    const projectIds = userProjects.map(p => p.project_id)
    
    // Add projects owned by the user
    const { data: ownedProjects, error: ownedError } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.value.id)
    
    if (ownedError) throw ownedError
    
    const ownedProjectIds = ownedProjects.map(p => p.id)
    const allProjectIds = [...new Set([...projectIds, ...ownedProjectIds])]
    
    // Fetch files from all accessible projects
    const { data, error } = await supabase
      .from('project_files')
      .select(`
        *,
        project:projects(id, name, owner_id, is_public)
      `)
      .in('project_id', allProjectIds)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    files.value = data || []
    
    // Ensure all files have URLs
    const filesToUpdate = files.value.filter(file => !file.url && file.file_path)
    if (filesToUpdate.length > 0) {
      await updateMissingFileUrls(filesToUpdate)
      
      // Refresh files
      const { data: updatedData } = await supabase
        .from('project_files')
        .select(`
          *,
          project:projects(id, name, owner_id, is_public)
        `)
        .in('project_id', allProjectIds)
        .order('created_at', { ascending: false })
      
      if (updatedData) {
        files.value = updatedData
      }
    }
  } catch (err) {
    console.error('Error fetching user files:', err)
    fileError.value = 'Failed to load files'
  } finally {
    loadingFiles.value = false
  }
}

// Add computed property for file source
const getFileSource = (file) => {
  if (!file.project) return 'Unknown'
  if (file.project.owner_id === user.value?.id) return 'Owned'
  return 'Shared'
}

// Add file management methods
const handleFileDeleted = async (file) => {
  try {
    const success = await deleteFile(file.file_path, file.id)
    
    if (success) {
      files.value = files.value.filter(f => f.id !== file.id)
    } else {
      fileError.value = 'Failed to delete file'
    }
  } catch (err) {
    console.error('Error deleting file:', err)
    fileError.value = 'Failed to delete file'
  }
}

const handleFileDownload = async (file) => {
  try {
    if (!file || !file.file_path) {
      fileError.value = 'Invalid file information'
      return
    }
    
    await downloadFile(file.file_path)
  } catch (err) {
    console.error('Error downloading file:', err)
    fileError.value = 'Failed to download the file'
  }
}

// Update onMounted to fetch files
onMounted(async () => {
  if (user.value) {
    profile.value = await fetchProfile(user.value.id)
    await fetchUserProjects()
    await fetchUserFiles()
  }
})
</script>

<template>
  <div class="profile-page">
    <div v-if="loading" class="loading">
      Loading profile...
    </div>
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    <div v-else class="profile-container">
      <!-- Profile Section -->
      <div class="profile-section">
        <div class="profile-header">
          <div class="avatar-container">
            <img v-if="profile?.avatar_url" :src="profile.avatar_url" alt="Profile" class="avatar" />
            <div v-else class="avatar placeholder">{{ profile?.display_name?.[0] || '?' }}</div>
            <div v-if="isEditing" class="avatar-upload">
              <input 
                type="url" 
                v-model="editForm.avatar_url" 
                placeholder="Enter avatar URL"
                class="avatar-url-input"
              />
            </div>
          </div>
          <div class="profile-info">
            <template v-if="!isEditing">
              <h2>{{ profile?.display_name }}</h2>
              <p class="email">{{ profile?.email }}</p>
              <button @click="startEditing" class="edit-button">Edit Profile</button>
            </template>
            <template v-else>
              <div class="edit-form">
                <input 
                  v-model="editForm.display_name" 
                  type="text" 
                  placeholder="Display Name"
                  class="edit-input"
                />
                <input 
                  v-model="editForm.email" 
                  type="email" 
                  placeholder="Email"
                  class="edit-input"
                  disabled
                />
                <div class="form-actions">
                  <button @click="cancelEditing" class="cancel-button">Cancel</button>
                  <button @click="saveProfile" class="save-button" :disabled="saving">
                    {{ saving ? 'Saving...' : 'Save Changes' }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Bio Section -->
        <div class="bio-section">
          <div v-if="!isEditing" class="bio-display">
            <p v-if="profile?.bio" class="bio-text">{{ profile.bio }}</p>
            <p v-else class="bio-placeholder">No bio yet</p>
          </div>
          <form v-else class="bio-form" @submit.prevent="saveProfile">
            <textarea
              v-model="editForm.bio"
              placeholder="Write something about yourself..."
              class="bio-input"
              maxlength="500"
            ></textarea>
            <div class="bio-actions">
              <span class="char-count">{{ 500 - (editForm.bio?.length || 0) }} characters remaining</span>
            </div>
          </form>
        </div>
      </div>

      <!-- Projects Section -->
      <div v-if="hasProjects" class="projects-section">
        <h3>Projects</h3>
        <div class="carousel-container">
          <button 
            @click="prevPage" 
            class="carousel-button prev" 
            :disabled="currentPage === 0"
          >←</button>
          <div class="projects-grid">
            <div 
              v-for="project in displayedProjects" 
              :key="project.id" 
              class="project-card"
              @click="$router.push(`/projects/${project.id}`)"
            >
              <h4>{{ project.name }}</h4>
              <p class="project-description">{{ project.description }}</p>
              <div class="project-meta">
                <span v-if="project.collaborators?.length > 0" :class="['role-badge', project.role]">{{ project.role }}</span>
                <span class="date">{{ formatDate(project.created_at) }}</span>
              </div>
            </div>
          </div>
          <button 
            @click="nextPage" 
            class="carousel-button next" 
            :disabled="currentPage >= Math.ceil(projects.value?.length / itemsPerPage) - 1"
          >→</button>
        </div>
      </div>

      <!-- Files Section -->
      <div class="files-section">
        <div class="section-header">
          <h2>My Files</h2>
          <div class="file-controls">
            <div class="search-bar">
              <input 
                type="text" 
                v-model="fileSearchQuery" 
                placeholder="Search files..."
                class="search-input"
              />
            </div>
            <div class="view-controls">
              <button 
                :class="['view-btn', { active: fileViewMode === 'grid' }]" 
                @click="fileViewMode = 'grid'"
                title="Grid View"
              >
                ◫
              </button>
              <button 
                :class="['view-btn', { active: fileViewMode === 'list' }]" 
                @click="fileViewMode = 'list'"
                title="List View"
              >
                ≡
              </button>
            </div>
            <div class="sort-controls">
              <label for="file-sort-select">Sort by:</label>
              <select id="file-sort-select" v-model="fileSortOrder" class="sort-select">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
            </div>
          </div>
        </div>
        
        <FilesGrid
          :files="filteredFiles"
          :loading="loadingFiles"
          :view-mode="fileViewMode"
          :allow-delete="true"
          :empty-message="'No files uploaded yet'"
          @delete="handleFileDeleted"
          @download="handleFileDownload"
        >
          <template #file-meta="{ file }">
            <span class="file-source" :class="getFileSource(file).toLowerCase()">
              {{ getFileSource(file) }}
            </span>
            <span class="project-name" v-if="file.project">
              from {{ file.project.name }}
            </span>
          </template>
        </FilesGrid>
        
        <div v-if="fileError" class="error-message">
          {{ fileError }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-primary);
  background: var(--background);
}

.profile-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-section {
  background: var(--secondary-dark);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
}

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e5e7eb;
}

.avatar.placeholder {
  background: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: 600;
  border: 3px solid #e5e7eb;
}

.avatar-url-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
}

.profile-info {
  flex: 1;
}

.profile-info h2 {
  margin: 0;
  color: #111827;
  font-size: 2rem;
  font-weight: 600;
}

.email {
  color: #6b7280;
  margin: 0.5rem 0 1rem;
  font-size: 1.1rem;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.edit-input {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 1rem;
  width: 100%;
}

.edit-input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.bio-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.bio-text {
  color: #374151;
  line-height: 1.6;
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.bio-placeholder {
  color: #9ca3af;
  font-style: italic;
  margin: 0 0 1rem;
}

.bio-input {
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-family: inherit;
  resize: vertical;
  font-size: 1rem;
}

.bio-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.char-count {
  color: #6b7280;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.edit-button {
  background: #4f46e5;
  color: white;
  border: none;
}

.edit-button:hover {
  background: #4338ca;
}

.cancel-button {
  background: white;
  border: 1px solid #e5e7eb;
  color: #4b5563;
}

.cancel-button:hover {
  background: #f3f4f6;
}

.save-button {
  background: #4f46e5;
  color: white;
  border: none;
}

.save-button:hover:not(:disabled) {
  background: #4338ca;
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.projects-section {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  background: var(--secondary-dark);
  border-radius: 12px;
  padding: 2rem;
}

.project-category h3 {
  color: var(--text-primary);
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.carousel-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--background);
  padding: 1.5rem;
  border-radius: 12px;
  min-height: 300px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(3, 300px);
  gap: 1.5rem;
  flex: 1;
  overflow-x: auto;
  padding: 0.5rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.projects-grid::-webkit-scrollbar {
  display: none;
}

.project-card {
  background: var(--secondary-dark);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  height: 250px;
  width: 300px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  border-color: var(--primary);
}

.project-card h4 {
  margin: 0 0 0.75rem;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-description {
  color: var(--text-secondary);
  margin: 0 0 auto;
  font-size: 0.875rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  gap: 0.5rem;
}

.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
  background: var(--primary);
  color: var(--white);
}

.role-badge.admin {
  background: var(--success);
}

.role-badge.editor {
  background: var(--info);
}

.role-badge.viewer {
  background: var(--text-muted);
}

.date {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.carousel-button {
  background: var(--secondary-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.carousel-button:hover:not(:disabled) {
  background: var(--background);
  border-color: var(--primary);
  color: var(--primary);
}

.carousel-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  color: #6b7280;
  padding: 2rem;
  font-size: 1.1rem;
}

.error {
  color: #dc2626;
  text-align: center;
  padding: 2rem;
  background: #fee2e2;
  border-radius: 8px;
  font-size: 1.1rem;
}

.files-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--surface-color);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.file-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-bar {
  position: relative;
}

.search-input {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 200px;
  font-size: 0.9rem;
}

.view-controls {
  display: flex;
  gap: 0.5rem;
}

.view-btn {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: transparent;
  font-size: 0.9rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--error-color);
  color: white;
  border-radius: 4px;
  font-size: 0.9rem;
}

.file-source {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.file-source.owned {
  background: var(--color-success);
  color: white;
}

.file-source.shared {
  background: var(--color-info);
  color: white;
}

.project-name {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin-left: 8px;
}
</style> 