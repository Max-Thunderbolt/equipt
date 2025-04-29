<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProjects } from '../composables/useProjects'
import { useUserSearch } from '../composables/useUserSearch'
import { useFileStorage } from '../composables/useFileStorage'
import { supabase } from '../supabase/config'
import FilesGrid from '../components/ui/FilesGrid.vue'
import ProjectSideNav from '../components/project/ProjectSideNav.vue'
import Pinboard from '../components/project/Pinboard.vue'
import ProjectTodos from '../components/ui/ProjectTodos.vue'
import '../styles/projects.css'
import { useNavBar } from '../composables/useNavBar'

const TABLES = {
  PROJECTS: 'projects',
  PROFILES: 'profiles',
  PROJECT_COLLABORATORS: 'project_collaborators',
  PROJECT_FILES: 'project_files',
  PROJECT_UPDATES: 'project_updates',
  PROJECT_TODOS: 'project_todos'
}

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { hasProjectAccess } = useProjects()
const { searchResults, loading: userSearchLoading, error: userSearchError, searchUsers } = useUserSearch()
const { uploadFile, downloadFile, getFileUrl, updateMissingFileUrls, error: fileError, uploading: fileUploading, progress: fileUploadProgress, deleteFile } = useFileStorage()
const { navBarHeight } = useNavBar()

// Add formatFileSize function
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const projectId = ref('')
const project = ref(null)
const loading = ref(true)
const error = ref(null)
const activeSection = ref('tasks')

// Update modal state
const isUpdateModalOpen = ref(false)
const updateData = ref({
  description: '',
  files: []
})
const submitting = ref(false)
const updateError = ref(null)

// Edit project modal state
const isEditModalOpen = ref(false)
const editProjectData = ref({
  name: '',
  description: '',
  is_public: false
})
const editSubmitting = ref(false)
const editError = ref(null)

// Delete project modal state
const isDeleteModalOpen = ref(false)
const deleteSubmitting = ref(false)
const deleteError = ref(null)

// Add file handling state
const selectedFiles = ref([])

const openUpdateModal = () => {
  updateData.value = {
    description: '',
    files: []
  }
  selectedFiles.value = []
  fileUploadProgress.value = 0
  updateError.value = null
  isUpdateModalOpen.value = true
}

const closeUpdateModal = () => {
  isUpdateModalOpen.value = false
}

const handleFileChange = (event) => {
  selectedFiles.value = Array.from(event.target.files)
}

const submitUpdate = async () => {
  if (submitting.value) return

  submitting.value = true
  updateError.value = null
  fileUploadProgress.value = 0

  try {
    // Create update record if description is provided
    let updateId = null
    if (updateData.value.description.trim()) {
      const updatePayload = {
        project_id: projectId.value,
        description: updateData.value.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.value?.id
      }

      const { data: update, error: updateError } = await supabase
        .from(TABLES.PROJECT_UPDATES)
        .insert(updatePayload)
        .select('*')
        .single()

      if (updateError) throw updateError
      updateId = update.id
    }

    // Upload files if any
    if (selectedFiles.value.length > 0) {
      const totalFiles = selectedFiles.value.length
      let uploadedFiles = 0

      for (const file of selectedFiles.value) {
        try {
          // Upload each file
          const fileRecord = await uploadFile(file, projectId.value, updateId)

          if (!fileRecord) {
            console.error(`Failed to upload file: ${file.name}`)
            updateError.value = `Failed to upload file: ${file.name}`
            // Continue with other files
          }

          uploadedFiles++
          fileUploadProgress.value = Math.round((uploadedFiles / totalFiles) * 100)
        } catch (fileErr) {
          console.error(`Error uploading file ${file.name}:`, fileErr)
          updateError.value = `Error uploading file ${file.name}: ${fileErr.message}`
          // Continue with other files
        }
      }
    }

    // Refresh project data
    await fetchProject()

    // Reset and close modal
    closeUpdateModal()
  } catch (err) {
    console.error('Error submitting update:', err)
    updateError.value = `Failed to submit update: ${err.message || 'Unknown error'}`
  } finally {
    submitting.value = false
  }
}

const fetchProject = async () => {
  if (!projectId.value) return

  loading.value = true
  error.value = null

  try {
    // First get the project, files and todos
    const { data: projectData, error: projectError } = await supabase
      .from(TABLES.PROJECTS)
      .select(`
        *,
        ${TABLES.PROJECT_FILES}(*),
        ${TABLES.PROJECT_TODOS}(*)
      `)
      .eq('id', projectId.value)
      .single()

    if (projectError) throw projectError

    // Get the owner information
    const { data: ownerData, error: ownerError } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', projectData.owner_id)
      .single()

    if (ownerError) console.error('Error fetching owner:', ownerError)

    // Get collaborators
    const { data: collaborators, error: collabError } = await supabase
      .from(TABLES.PROJECT_COLLABORATORS)
      .select(`
        role,
        user_id,
        created_at,
        updated_at
      `)
      .eq('project_id', projectId.value)

    if (collabError) throw new Error('Failed to fetch collaborators')

    // Get user profiles for collaborators
    let userProfiles = []
    if (collaborators && collaborators.length > 0) {
      const userIds = collaborators.map(c => c.user_id)
      const { data: profiles, error: profilesError } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .in('id', userIds)

      if (profilesError) {
        throw new Error('Failed to fetch collaborator profiles')
      } else {
        userProfiles = profiles || []
      }
    }

    // Get project updates
    const { data: updates, error: updatesError } = await supabase
      .from(TABLES.PROJECT_UPDATES)
      .select('*')
      .eq('project_id', projectId.value)
      .order('created_at', { ascending: false })

    if (updatesError) {
      console.error('Error fetching project updates:', updatesError)
    } else if (updates && updates.length > 0) {
      // Get user profiles for each update
      const userIds = [...new Set(updates.map(update => update.user_id))]

      const { data: userProfiles, error: profilesError } = await supabase
        .from(TABLES.PROFILES)
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError)
      } else {
        // Combine updates with user profiles
        updates.forEach(update => {
          update.user = userProfiles.find(profile => profile.id === update.user_id) || null
        })
      }

      projectData.updates = updates
    } else {
      projectData.updates = []
    }

    // Add todos to the project data
    project.value = {
      ...projectData,
      owner: ownerData || null,
      collaborators: (collaborators || []).map(collab => ({
        ...collab,
        user: userProfiles.find(p => p.id === collab.user_id) || null
      })),
      files: projectData.project_files || [],
      updates: projectData.updates || [],
      todos: projectData.project_todos || []
    }

    // Check if user has access to this project
    if (user.value) {
      const hasAccess = project.value.owner_id === user.value.id ||
        project.value.collaborators.some(c => c.user_id === user.value.id)
      if (!hasAccess && !project.value.is_public) {
        error.value = "You don't have access to this project"
        router.push('/projects')
        return
      }
    } else if (!project.value.is_public) {
      router.push('/projects')
      return
    }

    // Update file URLs
    const ensureFileUrls = async () => {
      if (!project.value || !project.value.files || project.value.files.length === 0) return

      // First update in-memory file objects
      project.value.files = project.value.files.map(file => {
        if (!file.url && file.file_path) {
          file.url = getFileUrl(file.file_path)
        }
        return file
      })

      // Then update database records
      const filesToUpdate = project.value.files.filter(file => !file.url && file.file_path)
      if (filesToUpdate.length > 0) {
        await updateMissingFileUrls(filesToUpdate)
      }
    }

    await ensureFileUrls()
  } catch (err) {
    console.error('Error fetching project details:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Format dates
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Check if the current user is the owner
const isOwner = computed(() => {
  return user.value && project.value && project.value.owner_id === user.value.id
})

// Check if the current user is a collaborator
const userRole = computed(() => {
  if (!user.value || !project.value || !project.value.collaborators) return null

  const collaboration = project.value.collaborators.find(
    c => c.user && c.user.id === user.value.id
  )

  return collaboration ? collaboration.role : null
})

// Function to handle file downloads
const handleFileDownload = async (file) => {
  try {
    if (!file || !file.file_path) {
      error.value = 'Invalid file information'
      return
    }

    await downloadFile(file.file_path)
  } catch (err) {
    console.error('Error downloading file:', err)
    error.value = 'Failed to download the file'
  }
}

// Function to handle file deletion 
const handleFileDeleted = async (file) => {
  try {
    const success = await deleteFile(file.file_path, file.id)

    if (success) {
      // Update the local project files list when a file is deleted
      project.value.files = project.value.files.filter(f => f.id !== file.id)
    } else {
      error.value = 'Failed to delete file. Please try again.'
    }
  } catch (err) {
    console.error('Error deleting file:', err)
    error.value = 'An error occurred while deleting the file.'
  }
}

const handleSectionChange = async (section) => {
  activeSection.value = section
  
  // Fetch updates from the database when switching to the updates section
  if (section === 'updates') {
    try {
      // Get project updates
      const { data: updates, error: updatesError } = await supabase
        .from(TABLES.PROJECT_UPDATES)
        .select('*')
        .eq('project_id', projectId.value)
        .order('created_at', { ascending: false })

      if (updatesError) {
        console.error('Error fetching project updates:', updatesError)
      } else if (updates && updates.length > 0) {
        // Get user profiles for each update
        const userIds = [...new Set(updates.map(update => update.user_id))]

        const { data: userProfiles, error: profilesError } = await supabase
          .from(TABLES.PROFILES)
          .select('id, display_name, avatar_url')
          .in('id', userIds)

        if (profilesError) {
          console.error('Error fetching user profiles:', profilesError)
        } else {
          // Combine updates with user profiles
          updates.forEach(update => {
            update.user = userProfiles.find(profile => profile.id === update.user_id) || null
          })
        }

        // Update the project updates in the reactive state
        project.value.updates = updates
      } else {
        project.value.updates = []
      }
    } catch (err) {
      console.error('Error refreshing project updates:', err)
    }
  }
}

// Edit project functions
const openEditModal = () => {
  if (!project.value) return

  editProjectData.value = {
    name: project.value.name,
    description: project.value.description || '',
    is_public: project.value.is_public || false
  }
  editError.value = null
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  editProjectData.value = {
    name: '',
    description: '',
    is_public: false
  }
}

// Open delete confirmation modal
const openDeleteConfirm = () => {
  isDeleteModalOpen.value = true
  deleteError.value = null
}

// Close delete confirmation modal
const closeDeleteModal = () => {
  isDeleteModalOpen.value = false
}

// Delete project
const deleteProject = async () => {
  if (deleteSubmitting.value) return
  
  deleteSubmitting.value = true
  deleteError.value = null
  
  try {
    // Delete project files from storage
    if (project.value.files && project.value.files.length > 0) {
      for (const file of project.value.files) {
        if (file.file_path) {
          try {
            await deleteFile(file.file_path, file.id)
          } catch (fileErr) {
            console.error(`Error deleting file ${file.name}:`, fileErr)
            // Continue with other files
          }
        }
      }
    }
    
    // Delete project record
    const { error: deleteError } = await supabase
      .from(TABLES.PROJECTS)
      .delete()
      .eq('id', projectId.value)
    
    if (deleteError) throw deleteError
    
    // Redirect to projects page
    router.push('/projects')
  } catch (err) {
    console.error('Error deleting project:', err)
    deleteError.value = `Failed to delete project: ${err.message || 'Unknown error'}`
  } finally {
    deleteSubmitting.value = false
  }
}

const submitEdit = async () => {
  if (editSubmitting.value) return

  editSubmitting.value = true
  editError.value = null

  try {
    // Validate input
    if (!editProjectData.value.name.trim()) {
      editError.value = 'Project name is required'
      editSubmitting.value = false
      return
    }

    // Update project record
    const { error: updateError } = await supabase
      .from(TABLES.PROJECTS)
      .update({
        name: editProjectData.value.name.trim(),
        description: editProjectData.value.description.trim(),
        is_public: editProjectData.value.is_public,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId.value)

    if (updateError) throw updateError

    // Create project update for the edit
    const updatePayload = {
      project_id: projectId.value,
      description: `Updated project details: ${editProjectData.value.name}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user.value?.id
    }

    const { error: updateRecordError } = await supabase
      .from(TABLES.PROJECT_UPDATES)
      .insert(updatePayload)

    if (updateRecordError) console.error('Error creating update record:', updateRecordError)

    // Refresh project data
    await fetchProject()

    // Reset and close modal
    closeEditModal()
  } catch (err) {
    console.error('Error updating project:', err)
    editError.value = `Failed to update project: ${err.message || 'Unknown error'}`
  } finally {
    editSubmitting.value = false
  }
}

// Add this function to handle role updates
const handleRoleUpdated = async (data) => {
  try {
    // Update the local collaborator data
    const collaboratorIndex = project.value.collaborators.findIndex(
      c => c.user_id === data.userId
    )

    if (collaboratorIndex !== -1) {
      project.value.collaborators[collaboratorIndex].role = data.newRole
    }

    // Create project update for role change
    const collaborator = project.value.collaborators.find(c => c.user_id === data.userId)
    if (collaborator) {
      const updatePayload = {
        project_id: projectId.value,
        description: `Changed ${collaborator.user?.display_name || 'Unknown User'}'s role to ${data.newRole}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.value?.id
      }

      const { error: updateError } = await supabase
        .from(TABLES.PROJECT_UPDATES)
        .insert(updatePayload)

      if (updateError) console.error('Error creating update record:', updateError)
    }
  } catch (err) {
    console.error('Error handling role update:', err)
  }
}

const isMobile = ref(false)
const isMobileNavOpen = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const handleNavToggle = () => {
  isMobileNavOpen.value = !isMobileNavOpen.value
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  projectId.value = route.params.id
  if (projectId.value) {
    fetchProject()
  } else {
    router.push('/projects')
  }
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="project-details">
    <!-- Loading State -->
    <div v-if="loading" class="loading-message">
      Loading project details...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-message">
      Error loading project: {{ error }}
    </div>

    <!-- Pinboard View -->
    <div v-else-if="activeSection === 'pinboard'" class="pinboard-view">
      <ProjectSideNav
        :project-name="project.name"
        :owner="project.owner"
        :collaborators="project.collaborators"
        :active-section="activeSection"
        :project-id="project.id"
        :project-description="project.description"
        @section-change="handleSectionChange"
        @delete-project="openDeleteConfirm"
        @role-updated="handleRoleUpdated"
        :is-mobile="isMobile"
        :is-mobile-nav-open="isMobileNavOpen"
        @toggle-nav="handleNavToggle"
        :nav-bar-height="navBarHeight"
      />
      <div class="pinboard-container" :class="{ 'full-width-mobile': isMobile && !isMobileNavOpen }" :style="{ paddingTop: navBarHeight + 'px' }">
        <Pinboard :project-id="project.id" />
      </div>
    </div>

    <!-- Main Content View -->
    <div v-else class="project-layout">
      <!-- Side Navigation -->
      <ProjectSideNav
        :project-name="project.name"
        :owner="project.owner"
        :collaborators="project.collaborators"
        :active-section="activeSection"
        :project-id="project.id"
        :project-description="project.description"
        @section-change="handleSectionChange"
        @delete-project="openDeleteConfirm"
        @role-updated="handleRoleUpdated"
        :is-mobile="isMobile"
        :is-mobile-nav-open="isMobileNavOpen"
        @toggle-nav="handleNavToggle"
        :nav-bar-height="navBarHeight"
      />

      <div class="project-content" :class="{ 'full-width-mobile': isMobile && !isMobileNavOpen }" :style="{ paddingTop: navBarHeight + 'px' }">
        <!-- Main Content Area -->
        <main class="project-main" v-if="activeSection !== 'pinboard'">
          <!-- Project Header -->
          <div class="project-header">
            <h1 class="project-title">{{ project.name }}</h1>
            <div class="project-actions">
              <button v-if="isOwner" class="btn btn-primary" @click="openEditModal">
                Edit
              </button>
            </div>
          </div>

          <!-- Dynamic Content Section -->
          <div class="dynamic-content">
            <!-- Files Section -->
            <div v-if="activeSection === 'files'" class="content-section">
              <div class="section-header">
                <h2>Files</h2>
                <button @click="openUpdateModal" class="btn btn-primary">
                  + Files
                </button>
              </div>
              <FilesGrid :files="project.files || []" :loading="loading" :allow-delete="isOwner"
                empty-message="No files uploaded yet." @delete="handleFileDeleted" @download="handleFileDownload" />
            </div>

            <!-- Updates Section -->
            <div v-if="activeSection === 'updates'" class="content-section">
              <div class="section-header">
                <h2>Updates</h2>
                <button @click="openUpdateModal" class="btn btn-primary">
                  + Update
                </button>
              </div>
              <div v-if="!project.updates || project.updates.length === 0" class="empty-state">
                No updates yet.
              </div>
              <div v-else class="updates-list">
                <div v-for="update in project.updates" :key="update.id" class="update-item">
                  <div class="update-avatar">
                    <img v-if="update.user?.avatar_url" :src="update.user.avatar_url"
                      :alt="update.user.display_name || 'User Avatar'" />
                    <span v-else class="avatar-placeholder">
                      {{ update.user?.display_name?.[0] || '?' }}
                    </span>
                  </div>
                  <div class="update-content">
                    <div class="update-header">
                      <span class="update-author">{{ update.user?.display_name || 'Unknown User' }}</span>
                      <span class="update-date">{{ formatDate(update.created_at) }}</span>
                    </div>
                    <p class="update-text">{{ update.description }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Tasks Section -->
            <div v-if="activeSection === 'tasks'" class="content-section">
              <div class="section-header">
                <h2>Tasks</h2>
              </div>
              <ProjectTodos :project-id="project.id" :can-edit="isOwner || userRole === 'admin'" />
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- Update Modal -->
    <div v-if="isUpdateModalOpen" class="modal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Add Progress</h2>
          <button class="close-button" @click="closeUpdateModal">×</button>
        </div>
        <form @submit.prevent="submitUpdate" class="update-form">
          <div class="form-group">
            <label for="update-description">Description (Optional)</label>
            <textarea id="update-description" v-model="updateData.description"
              placeholder="Describe the files you're uploading..." rows="4"></textarea>
          </div>
          <div class="form-group">
            <label>Upload Files</label>
            <div class="file-upload-container">
              <input type="file" @change="handleFileChange" multiple class="file-input" :disabled="submitting">
              <div class="file-upload-box">
                <span class="upload-icon">📎</span>
                <span>Drop files here or click to upload</span>
              </div>
            </div>
            <div v-if="selectedFiles.length" class="selected-files">
              <div v-for="file in selectedFiles" :key="file.name" class="selected-file">
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
              </div>
            </div>
            <div v-if="submitting && selectedFiles.length" class="upload-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${fileUploadProgress}%` }"></div>
              </div>
              <span class="progress-text">{{ fileUploadProgress }}% uploaded</span>
            </div>
          </div>
          <div v-if="updateError" class="error-message">
            {{ updateError }}
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeUpdateModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting || !selectedFiles.length">
              {{ submitting ? 'Uploading...' : 'Upload Files' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Project Modal -->
    <div v-if="isEditModalOpen" class="modal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Edit Project</h2>
          <button class="close-button" @click="closeEditModal">×</button>
        </div>
        <form @submit.prevent="submitEdit" class="edit-form">
          <div class="form-group">
            <label for="project-name">Project Name</label>
            <input id="project-name" v-model="editProjectData.name" type="text" required
              placeholder="Enter project name">
          </div>
          <div class="form-group">
            <label for="project-description">Description</label>
            <textarea id="project-description" v-model="editProjectData.description" rows="4"
              placeholder="Describe your project..."></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="editProjectData.is_public">
              <span>Make this project public</span>
            </label>
            <p class="help-text">Public projects are visible to everyone, even non-members.</p>
          </div>
          <div v-if="editError" class="error-message">
            {{ editError }}
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeEditModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="editSubmitting">
              {{ editSubmitting ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="isDeleteModalOpen" class="modal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Delete Project</h2>
          <button class="close-button" @click="closeDeleteModal">×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete this project? This action cannot be undone.</p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeDeleteModal">Cancel</button>
          <button type="button" class="btn btn-danger" @click="deleteProject" :disabled="deleteSubmitting">
            {{ deleteSubmitting ? 'Deleting...' : 'Delete Project' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Main container */
.project-details {
  width: 100%;
  min-height: 100vh;
  background: var(--color-background);
}

/* Project Layout */
.project-layout,
.pinboard-view {
  display: flex;
  min-height: 100vh;
  width: 100%;
  position: relative;
}

.pinboard-view {
  position: fixed;
  top: var(--navbar-height, 72px);
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.pinboard-container {
  position: absolute;
  left: 280px;
  right: 0;
  top: 0;
  bottom: 0;
  overflow: hidden;
  background: var(--color-black);
}

/* Main Content Area */
.project-main {
  flex: 1;
  padding: 32px;
  margin-left: 280px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Project Header */
.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.project-title {
  font-size: 32px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.project-actions {
  display: flex;
  gap: 16px;
}

/* Project Info Section */
.project-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 32px;
}

.info-card {
  width: 100%;
  background: var(--gradient-winter);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.description-card,
.todos-card {
  min-width: unset;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.project-description {
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
}

/* Dynamic Content Section */
.dynamic-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.content-section {
  background: var(--gradient-winter);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  margin: 0 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

/* Updates List */
.updates-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.update-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--color-black-90);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.update-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.update-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.update-content {
  flex: 1;
  min-width: 0;
}

.update-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.update-author {
  font-weight: 500;
  color: var(--color-text);
}

.update-date {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.update-text {
  color: var(--color-text);
  line-height: 1.5;
  margin: 0;
}

/* Empty States */
.empty-state {
  text-align: center;
  padding: 48px;
  background: var(--color-black-90);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
}

/* Loading & Error States */
.loading-message,
.error-message {
  text-align: center;
  padding: 48px;
  color: var(--color-text-secondary);
}

.error-message {
  color: var(--color-danger);
}

/* Modal Styles */
.modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: black;
  padding: 32px;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  color: var(--color-heading);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text);
  font-weight: 500;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-black-90);
  color: var(--color-text);
  resize: vertical;
}

.file-upload-container {
  position: relative;
  margin-bottom: 16px;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.file-upload-box {
  padding: 32px;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  text-align: center;
  color: var(--color-text-secondary);
}

.upload-icon {
  font-size: 24px;
  margin-bottom: 8px;
  display: block;
}

.selected-files {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-file {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-black-90);
  border-radius: 6px;
}

.file-name {
  font-weight: 500;
  color: var(--color-text);
}

.file-size {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.upload-progress {
  margin-top: 16px;
}

.progress-bar {
  height: 4px;
  background: var(--color-black-80);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
}

.progress-text {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 32px;
}

/* Edit Form Styles */
.edit-form input[type="text"] {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-black-90);
  color: var(--color-text);
}

.edit-form input[type="text"]:focus {
  outline: none;
  border-color: var(--color-primary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.help-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
  margin-left: 24px;
}

/* Delete button styles */
.btn-danger {
  background-color: var(--color-danger, #dc3545);
  color: white;
  border: none;
}

.btn-danger:hover {
  background-color: var(--color-danger-dark, #c82333);
}

.btn-danger:disabled {
  background-color: var(--color-danger-light, #e4606d);
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 768px) {
  .project-layout,
  .pinboard-view {
    flex-direction: column;
  }
  .project-main {
    margin-left: 0;
    padding: 8px;
  }
  .project-content.full-width-mobile,
  .pinboard-container.full-width-mobile {
    margin-left: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    padding: 0 !important;
  }
}
</style>