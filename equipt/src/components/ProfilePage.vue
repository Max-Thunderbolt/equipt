<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'
import { useProjects } from '../composables/useProjects'
import FilesGrid from './FilesGrid.vue'
import { useFileStorage } from '../composables/useFileStorage'
import { supabase } from '../supabase/config'

const { user } = useAuth()
const { loading, error, fetchProfile, updateProfile } = useProfile()
const { fetchUserProjects } = useProjects()
const { updateMissingFileUrls } = useFileStorage()

const profile = ref(null)
const projects = ref([])
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
const soloCurrentPage = ref(0)
const collabCurrentPage = ref(0)

// Computed properties for projects
const soloProjects = computed(() => 
  projects.value.filter(p => !p.collaborators || p.collaborators.length === 0)
)

const collabProjects = computed(() => 
  projects.value.filter(p => p.collaborators && p.collaborators.length > 0)
)

const displayedSoloProjects = computed(() => {
  const start = soloCurrentPage.value * itemsPerPage
  return soloProjects.value.slice(start, start + itemsPerPage)
})

const displayedCollabProjects = computed(() => {
  const start = collabCurrentPage.value * itemsPerPage
  return collabProjects.value.slice(start, start + itemsPerPage)
})

// Carousel navigation methods
const nextSoloPage = () => {
  if (soloCurrentPage.value < Math.ceil(soloProjects.value.length / itemsPerPage) - 1) {
    soloCurrentPage.value++
  }
}

const prevSoloPage = () => {
  if (soloCurrentPage.value > 0) {
    soloCurrentPage.value--
  }
}

const nextCollabPage = () => {
  if (collabCurrentPage.value < Math.ceil(collabProjects.value.length / itemsPerPage) - 1) {
    collabCurrentPage.value++
  }
}

const prevCollabPage = () => {
  if (collabCurrentPage.value > 0) {
    collabCurrentPage.value--
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
    const updatedProfile = await updateProfile(user.value.id, editForm.value)
    
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
const userFiles = ref([])
const fetchingFiles = ref(false)
const filesError = ref(null)

// Add method to fetch user's files
const fetchUserFiles = async () => {
  if (!user.value) return
  
  fetchingFiles.value = true
  filesError.value = null
  
  try {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('uploaded_by', user.value.id)
      .order('created_at', { ascending: false })
      
    if (error) throw error
    
    userFiles.value = data || []
    
    // Ensure all files have URLs
    const filesToUpdate = userFiles.value.filter(file => !file.url && file.file_path)
    if (filesToUpdate.length > 0) {
      await updateMissingFileUrls(filesToUpdate)
      
      // Refresh files with updated URLs
      const { data: updatedData } = await supabase
        .from('project_files')
        .select('*')
        .eq('uploaded_by', user.value.id)
        .order('created_at', { ascending: false })
        
      if (updatedData) {
        userFiles.value = updatedData
      }
    }
  } catch (err) {
    console.error('Error fetching user files:', err)
    filesError.value = 'Failed to load files'
  } finally {
    fetchingFiles.value = false
  }
}

// Handle file deletion
const handleFileDeleted = (file) => {
  userFiles.value = userFiles.value.filter(f => f.id !== file.id)
}

// Update onMounted to fetch files
onMounted(async () => {
  if (user.value) {
    profile.value = await fetchProfile(user.value.id)
    const userProjects = await fetchUserProjects(user.value.id)
    if (userProjects) {
      projects.value = userProjects
    }
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
              <span class="char-count">{{ 500 - editForm.bio.length }} characters remaining</span>
            </div>
          </form>
        </div>
      </div>

      <!-- Projects Section -->
      <div class="projects-section">
        <!-- Solo Projects -->
        <div class="project-category">
          <h3>Solo Projects</h3>
          <div class="carousel-container">
            <button 
              @click="prevSoloPage" 
              class="carousel-button prev" 
              :disabled="soloCurrentPage === 0"
            >←</button>
            <div class="projects-grid">
              <div 
                v-for="project in displayedSoloProjects" 
                :key="project.id" 
                class="project-card"
                @click="$router.push(`/projects/${project.id}`)"
              >
                <h4>{{ project.name }}</h4>
                <p class="project-description">{{ project.description }}</p>
                <div class="project-meta">
                  <span class="date">{{ formatDate(project.created_at) }}</span>
                </div>
              </div>
            </div>
            <button 
              @click="nextSoloPage" 
              class="carousel-button next" 
              :disabled="soloCurrentPage >= Math.ceil(soloProjects.length / itemsPerPage) - 1"
            >→</button>
          </div>
        </div>

        <!-- Collaborative Projects -->
        <div class="project-category">
          <h3>Group Projects</h3>
          <div class="carousel-container">
            <button 
              @click="prevCollabPage" 
              class="carousel-button prev" 
              :disabled="collabCurrentPage === 0"
            >←</button>
            <div class="projects-grid">
              <div 
                v-for="project in displayedCollabProjects" 
                :key="project.id" 
                class="project-card"
                @click="$router.push(`/projects/${project.id}`)"
              >
                <h4>{{ project.name }}</h4>
                <p class="project-description">{{ project.description }}</p>
                <div class="project-meta">
                  <span :class="['role-badge', project.role]">{{ project.role }}</span>
                  <span class="date">{{ formatDate(project.created_at) }}</span>
                </div>
              </div>
            </div>
            <button 
              @click="nextCollabPage" 
              class="carousel-button next" 
              :disabled="collabCurrentPage >= Math.ceil(collabProjects.length / itemsPerPage) - 1"
            >→</button>
          </div>
        </div>
      </div>

      <!-- User Files Section -->
      <div class="files-section">
        <h3>My Files</h3>
        <div v-if="fetchingFiles" class="loading">
          Loading files...
        </div>
        <div v-else-if="filesError" class="error">
          {{ filesError }}
        </div>
        <div v-else>
          <FilesGrid 
            :files="userFiles" 
            layout="grid" 
            :allowDelete="true"
            emptyMessage="You haven't uploaded any files yet"
            @delete="handleFileDeleted"
          />
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
}

.profile-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
}

.project-category h3 {
  color: #111827;
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.carousel-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f9fafb;
  padding: 1rem;
  border-radius: 12px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  flex: 1;
}

.project-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.project-card h4 {
  margin: 0 0 0.75rem;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 600;
}

.project-description {
  color: #4b5563;
  margin: 0 0 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.project-meta {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.role-badge.admin {
  background: #fef3c7;
  color: #92400e;
}

.role-badge.editor {
  background: #e0e7ff;
  color: #4f46e5;
}

.role-badge.viewer {
  background: #f3f4f6;
  color: #4b5563;
}

.date {
  color: #6b7280;
  font-size: 0.75rem;
}

.carousel-button {
  background: white;
  border: 1px solid #e5e7eb;
  color: #4b5563;
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
  background: #f3f4f6;
  border-color: #9ca3af;
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
  background: var(--secondary-dark);
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
}

.files-section h3 {
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  color: var(--text-primary);
}
</style> 