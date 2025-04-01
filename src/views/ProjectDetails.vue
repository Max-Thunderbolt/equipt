<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useUserSearch } from '../composables/useUserSearch'
import { useFileStorage } from '../composables/useFileStorage'
import { supabase } from '../supabase/config'
import FilesGrid from '../components/ui/FilesGrid.vue'
import CollaboratorManagement from '../components/CollaboratorManagement.vue'
import NewProjectModal from '../components/modals/NewProjectModal.vue'
import { collaboratorService } from '../services/collaboratorService'
import { useProjectStore } from '../stores/projectStore'

const TABLES = {
  PROJECTS: 'projects',
  PROFILES: 'profiles', 
  PROJECT_COLLABORATORS: 'project_collaborators',
  PROJECT_FILES: 'project_files',
  PROJECT_UPDATES: 'project_updates'
}

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { currentProject, loading, error, getProject, updateProject, clearCache } = useProjectStore()
const { searchResults, loading: userSearchLoading, error: userSearchError, searchUsers } = useUserSearch()
const { uploadFile, downloadFile, getFileUrl, updateMissingFileUrls, error: fileError, uploading: fileUploading, progress: uploadProgress, deleteFile } = useFileStorage()

const projectId = ref(route.params.id)
const project = computed(() => currentProject.value)
const projectFiles = ref([])
const projectUpdates = ref([])
const loadingFiles = ref(true)
const loadingUpdates = ref(true)

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
  is_public: false,
  version: '',
  files: [],
  newCollaborators: []
})
const editSubmitting = ref(false)
const editError = ref(null)
const searchQuery = ref('')
const showSearchResults = ref(false)
const editSuccess = ref(null)

// Delete confirmation dialog state
const isDeleteConfirmOpen = ref(false)
const deleteSubmitting = ref(false)
const deleteError = ref(null)

// Add these variables to manage the collaborator removal confirmation
const isRemoveCollabConfirmOpen = ref(false)
const selectedCollaboratorToRemove = ref(null)

// Add these variables to track loading states
const removingCollaborator = ref(false)

// Define ensureFileUrls before it's used
const ensureFileUrls = async () => {
  if (!project.value || !project.value.files || project.value.files.length === 0) return
  
  console.log('Checking file URLs for', project.value.files.length, 'files')
  
  // First update in-memory file objects for immediate use
  project.value.files = project.value.files.map(file => {
    if (!file.url && file.file_path) {
      file.url = getFileUrl(file.file_path)
      console.log(`Generated temporary URL for ${file.name}:`, file.url)
    }
    return file
  })
  
  // Then update the database records for files missing URLs
  const filesToUpdate = project.value.files.filter(file => !file.url && file.file_path)
  if (filesToUpdate.length > 0) {
    console.log('Updating URLs for', filesToUpdate.length, 'files in the database')
    await updateMissingFileUrls(filesToUpdate)
  }
}

const openUpdateModal = () => {
  updateData.value = {
    description: '',
    files: []
  }
  updateError.value = null
  isUpdateModalOpen.value = true
}

const closeUpdateModal = () => {
  isUpdateModalOpen.value = false
}

const handleFileChange = (event) => {
  updateData.value.files = Array.from(event.target.files)
}

const submitUpdate = async () => {
  if (submitting.value) return
  
  submitting.value = true
  updateError.value = null
  
  try {
    // Validate input
    if (!updateData.value.description.trim()) {
      updateError.value = 'Please provide a description of your update'
      submitting.value = false
      return
    }
    
    // Create update record
    const updatePayload = {
      project_id: projectId.value,
      description: updateData.value.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user.value?.id
    }
    
    // Insert the update - using TABLES constant here
    console.log('Submitting update:', updatePayload)
    const { data: update, error: updateError } = await supabase
      .from(TABLES.PROJECT_UPDATES)
      .insert(updatePayload)
      .select('*')
      .single()
    
    if (updateError) throw updateError
    
    // Upload files if any
    if (updateData.value.files.length > 0) {
      for (const file of updateData.value.files) {
        uploadProgress.value = 0
        
        // Upload each file
        await uploadFile(file, projectId.value, update.id)
      }
    }
    
    // Clear the cache for this project to force a refresh
    clearCache(projectId.value)
    
    // Refresh project data
    await fetchProject()
    
    // Reset and close modal
    closeUpdateModal()
  } catch (err) {
    console.error('Error submitting update:', err)
    updateError.value = 'Failed to submit update. Please try again.'
  } finally {
    submitting.value = false
  }
}

const fetchProject = async () => {
  if (!projectId.value) {
    error.value = 'No project ID provided'
    return
  }

  try {
    await getProject(projectId.value)
    await ensureFileUrls()
  } catch (err) {
    console.error('Error fetching project:', err)
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
  if (!user.value || !project.value) return null
  
  // If user is owner, return 'owner'
  if (project.value.owner_id === user.value.id) {
    return 'owner'
  }
  
  // Look for user in collaborators list
  const collaboration = project.value.collaborators?.find(
    c => c.user_id === user.value.id
  )
  
  return collaboration ? collaboration.role : null
})

// Watch function for search input
watch(searchQuery, async (newQuery) => {
  if (newQuery.length >= 2) {
    await searchUsers(newQuery)
    showSearchResults.value = true
  } else {
    showSearchResults.value = false
  }
})

// Function to add a collaborator
const addCollaborator = (selectedUser) => {
  // Check if the user is already a collaborator in the project
  const isExistingCollaborator = project.value.collaborators.some(c => c.user && c.user.id === selectedUser.id)
  
  // Check if the user is already added as a new collaborator
  const isAlreadyAdded = editProjectData.value.newCollaborators.some(c => c.id === selectedUser.id)
  
  if (isExistingCollaborator) {
    editError.value = `${selectedUser.display_name} is already a collaborator`
    return
  }
  
  if (isAlreadyAdded) {
    editError.value = `${selectedUser.display_name} has already been added`
    return
  }
  
  // Add the new collaborator with default role 'viewer'
  editProjectData.value.newCollaborators.push({
    id: selectedUser.id,
    display_name: selectedUser.display_name,
    email: selectedUser.email,
    avatar_url: selectedUser.avatar_url,
    role: 'viewer'
  })
  
  // Clear search
  searchQuery.value = ''
  showSearchResults.value = false
  editError.value = null
}

// Function to remove a new collaborator
const removeNewCollaborator = (index) => {
  editProjectData.value.newCollaborators.splice(index, 1)
}

// Open edit modal function with updated initialization
const openEditModal = () => {
  editProjectData.value = {
    name: project.value.name || '',
    description: project.value.description || '',
    is_public: project.value.is_public || false,
    version: project.value.version || '0.1.0',
    files: [],
    newCollaborators: []
  }
  searchQuery.value = ''
  showSearchResults.value = false
  editError.value = null
  isEditModalOpen.value = true
}

// Close edit modal function
const closeEditModal = () => {
  isEditModalOpen.value = false
}

// Open delete confirmation function
const openDeleteConfirm = () => {
  isDeleteConfirmOpen.value = true
  deleteError.value = null
}

// Close delete confirmation function
const closeDeleteConfirm = () => {
  isDeleteConfirmOpen.value = false
}

// Delete project function
const deleteProject = async () => {
  deleteSubmitting.value = true
  deleteError.value = null
  
  try {
    // 1. Delete project collaborators
    const { error: collabDeleteError } = await supabase
      .from(TABLES.PROJECT_COLLABORATORS)
      .delete()
      .eq('project_id', projectId.value)
    
    if (collabDeleteError) {
      console.error('Error deleting collaborators:', collabDeleteError)
    }
    
    // 2. Delete project updates
    const { error: updatesDeleteError } = await supabase
      .from(TABLES.PROJECT_UPDATES)
      .delete()
      .eq('project_id', projectId.value)
    
    if (updatesDeleteError) {
      console.error('Error deleting updates:', updatesDeleteError)
    }
    
    // 3. Delete project files
    const { error: filesDeleteError } = await supabase
      .from(TABLES.PROJECT_FILES)
      .delete()
      .eq('project_id', projectId.value)
    
    if (filesDeleteError) {
      console.error('Error deleting files:', filesDeleteError)
    }
    
    // 4. Delete the project
    const { error: projectDeleteError } = await supabase
      .from(TABLES.PROJECTS)
      .delete()
      .eq('id', projectId.value)
    
    if (projectDeleteError) throw projectDeleteError
    
    // Clear the cache for this project
    clearCache(projectId.value)
    
    // Navigate back to projects page
    router.push('/projects')
  } catch (err) {
    console.error('Error deleting project:', err)
    deleteError.value = err.message
  } finally {
    deleteSubmitting.value = false
  }
}

// Update the removeCollaborator function to open the confirmation dialog
const openRemoveCollaboratorConfirm = (collaborator) => {
  selectedCollaboratorToRemove.value = collaborator
  isRemoveCollabConfirmOpen.value = true
}

const closeRemoveCollaboratorConfirm = () => {
  isRemoveCollabConfirmOpen.value = false
  selectedCollaboratorToRemove.value = null
}

// Update removeCollaborator to include loading state and use the composable
const removeCollaborator = async () => {
  if (!selectedCollaboratorToRemove.value) return
  
  removingCollaborator.value = true
  try {
    console.log('Removing collaborator object:', JSON.stringify(selectedCollaboratorToRemove.value));
    
    // Use user_id directly from the collaborator object
    const userId = selectedCollaboratorToRemove.value.user_id;
    
    if (!userId) {
      console.error('No user_id found in collaborator object:', selectedCollaboratorToRemove.value);
      throw new Error('Failed to identify user ID for removal');
    }
    
    console.log('Removing user ID:', userId, 'from project:', projectId.value);
    
    // Use the collaboratorService function instead of direct Supabase call
    const success = await collaboratorService.removeCollaborator(projectId.value, userId);
    
    console.log('Remove collaborator result:', success);
    
    if (!success) {
      console.error('Failed to remove collaborator - returned false');
      throw new Error('Failed to remove collaborator');
    }
    
    // Refresh project data
    await fetchProject()
    closeRemoveCollaboratorConfirm()
  } catch (err) {
    console.error('Error removing collaborator:', err);
    console.error('Error details:', err.message);
    editError.value = 'Failed to remove collaborator: ' + err.message;
  } finally {
    removingCollaborator.value = false;
  }
}

// Function to handle file downloads
const handleFileDownload = async (file) => {
  try {
    if (!file || !file.file_path) {
      error.value = 'Invalid file information';
      return;
    }
    
    await downloadFile(file.file_path);
  } catch (err) {
    console.error('Error downloading file:', err);
    error.value = 'Failed to download the file';
  }
}

// Add a helper function to get file type icon
const getFileIcon = (fileName) => {
  if (!fileName) return '📄'
  
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'pdf':
      return '📕'
    case 'doc':
    case 'docx':
      return '📘'
    case 'xls':
    case 'xlsx':
      return '📗'
    case 'ppt':
    case 'pptx':
      return '📙'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return '🖼️'
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'webm':
      return '🎬'
    case 'mp3':
    case 'wav':
    case 'ogg':
      return '🎵'
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return '🗜️'
    case 'html':
    case 'css':
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return '💻'
    case 'json':
    case 'xml':
    case 'csv':
      return '📊'
    default:
      return '📄'
  }
}

// Function to handle file deletion
const handleFileDeleted = async (file) => {
  try {
    const success = await deleteFile(file.file_path, file.id);
    
    if (success) {
      // Update the local project files list when a file is deleted
      project.value.files = project.value.files.filter(f => f.id !== file.id);
      // Also update projectFiles array
      projectFiles.value = projectFiles.value.filter(f => f.id !== file.id);
    } else {
      error.value = 'Failed to delete file. Please try again.';
    }
  } catch (err) {
    console.error('Error deleting file:', err);
    error.value = 'An error occurred while deleting the file.';
  }
}

const handleCollaboratorRemoved = async (userId) => {
  try {
    // Only refresh project data after successful collaborator removal
    const collaborator = project.value.collaborators.find(c => c.user_id === userId)
    if (collaborator) {
      project.value.collaborators = project.value.collaborators.filter(c => c.user_id !== userId)
    }
  } catch (error) {
    console.error('Error handling collaborator removal:', error)
    editError.value = 'Failed to handle collaborator removal'
  }
}

const handleRoleUpdate = async ({ userId, newRole }) => {
  try {
    // Update the role in the local state
    const collaborator = project.value.collaborators.find(c => c.user_id === userId)
    if (collaborator) {
      collaborator.role = newRole
    }

    // Show success message
    editSuccess.value = 'Role updated successfully'
    setTimeout(() => {
      editSuccess.value = null
    }, 3000)
  } catch (err) {
    console.error('Error handling role update:', err)
    editError.value = 'Failed to update role'
  }
}

// Function to handle saving project updates from the modal
const handleProjectUpdate = async (updatedData) => {
  editSubmitting.value = true
  editError.value = null
  editSuccess.value = null

  try {
    // 1. Update basic project details
    await updateProject(projectId.value, {
      name: updatedData.name,
      description: updatedData.description,
      is_public: updatedData.is_public
    })

    // 2. Add new collaborators
    if (updatedData.newCollaborators && updatedData.newCollaborators.length > 0) {
      for (const collaborator of updatedData.newCollaborators) {
        await collaboratorService.addCollaborator(projectId.value, collaborator.id, collaborator.role)
      }
    }

    // 3. Refresh project data and show success
    await fetchProject() // Fetch updated project data including new collaborators
    editSuccess.value = 'Project updated successfully!'
    closeEditModal()

    // Clear success message after a delay
    setTimeout(() => {
      editSuccess.value = null
    }, 3000)

  } catch (err) {
    console.error('Error updating project:', err)
    editError.value = `Failed to update project: ${err.message}`
  } finally {
    editSubmitting.value = false
  }
}

// Watch for route changes to handle navigation
watch(() => route.params.id, (newId) => {
  if (newId && newId !== projectId.value) {
    projectId.value = newId
    fetchProject()
  }
})

const loadUpdates = async () => {
  loadingUpdates.value = true
  try {
    // First, get the updates
    const { data: updatesData, error: updatesError } = await supabase
      .from(TABLES.PROJECT_UPDATES)
      .select('*')
      .eq('project_id', projectId.value)
      .order('created_at', { ascending: false })

    if (updatesError) throw updatesError

    // Get user details for each update
    const updates = updatesData || []
    const userIds = [...new Set(updates.map(update => update.user_id).filter(Boolean))]
    
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from(TABLES.PROFILES)
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      if (usersError) throw usersError

      // Map users to updates
      projectUpdates.value = updates.map(update => {
        const user = usersData?.find(u => u.id === update.user_id)
        return {
          ...update,
          user
        }
      })
    } else {
      projectUpdates.value = updates
    }
  } catch (error) {
    console.error('Error loading updates:', error)
  } finally {
    loadingUpdates.value = false
  }
}

// Function to load project files separately
const loadFiles = async () => {
  loadingFiles.value = true
  try {
    const { data, error: filesError } = await supabase
      .from(TABLES.PROJECT_FILES)
      .select(`
        *,
        update:update_id (
          id,
          description,
          created_at
        )
      `)
      .eq('project_id', projectId.value)
      .order('created_at', { ascending: false })

    if (filesError) throw filesError
    projectFiles.value = data || []
    
    // Ensure files have URLs
    for (const file of projectFiles.value) {
      if (!file.url && file.file_path) {
        file.url = getFileUrl(file.file_path)
      }
    }
  } catch (error) {
    console.error('Error loading files:', error)
  } finally {
    loadingFiles.value = false
  }
}

// Function to load collaborators separately
const loadCollaborators = async () => {
  try {
    const { data, error: collabError } = await supabase
      .from(TABLES.PROJECT_COLLABORATORS)
      .select(`
        *,
        user:user_id (
          id,
          display_name,
          avatar_url,
          email
        )
      `)
      .eq('project_id', projectId.value)
      
    if (collabError) throw collabError
    
    if (project.value) {
      project.value.collaborators = data || []
    }
  } catch (error) {
    console.error('Error loading collaborators:', error)
  }
}

onMounted(async () => {
  try {
    await fetchProject()
    await Promise.all([
      loadCollaborators(),
      loadFiles(),
      loadUpdates()
    ])
  } catch (error) {
    console.error('Error loading project details:', error)
  }
})
</script>

<template>
  <div class="project-details">
    <!-- Project Header -->
    <div class="project-header">
      <router-link :to="{ name: 'projects' }" class="back-button">
        <span>←</span>
        <span>Back to Projects</span>
      </router-link>
      <h1 class="project-title">{{ project?.name }}</h1>
    </div>

    <!-- Project Body -->
    <div class="project-body">
      <!-- Left Column - Files -->
      <div class="project-files">
        <div class="card-header">
          <span class="icon">📁</span>
          <span>Files</span>
        </div>
        <div v-if="loadingFiles" class="loading-spinner">
          Loading files...
        </div>
        <FilesGrid
          v-else
          :files="projectFiles"
          :loading="loadingFiles"
          @delete="handleFileDeleted"
          @download="handleFileDownload"
        />
      </div>

      <!-- Middle Column - Description and Updates -->
      <div class="project-info">
        <!-- Description Card -->
        <div class="description-card">
          <div class="card-header">
            <span class="icon">📝</span>
            <span>Description</span>
          </div>
          <p v-if="project?.description">{{ project.description }}</p>
          <p v-else class="text-secondary">No description provided</p>
        </div>

        <!-- Actions Card -->
        <div class="actions-card">
          <div class="card-header">
            <span class="icon">⚡</span>
            <span>Actions</span>
          </div>
          <div class="actions-grid">
            <button @click="openEditModal" class="action-button">
              Edit Project
            </button>
            <button @click="openUpdateModal" class="action-button">
              Add Update
            </button>
          </div>
        </div>

        <!-- Updates Card -->
        <div class="updates-card">
          <div class="card-header">
            <span class="icon">🔄</span>
            <span>Updates</span>
          </div>
          <div v-if="loadingUpdates" class="loading-spinner">
            Loading updates...
          </div>
          <div v-else-if="projectUpdates && projectUpdates.length > 0" class="updates-list">
            <div v-for="update in projectUpdates" :key="update.id" class="update-item">
              <div class="update-avatar">
                <img 
                  v-if="update.user?.avatar_url" 
                  :src="update.user.avatar_url" 
                  :alt="update.user.display_name"
                />
                <span v-else class="avatar-placeholder">
                  {{ update.user?.display_name?.[0] || '?' }}
                </span>
              </div>
              <div class="update-content">
                <div class="update-header">
                  <span class="update-author">{{ update.user?.display_name }}</span>
                  <span class="update-date">{{ formatDate(update.created_at) }}</span>
                </div>
                <p class="update-text">{{ update.description }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-secondary">No updates yet</p>
        </div>
      </div>

      <!-- Right Column - Owner and Collaborators -->
      <div class="owner-collab-group">
        <!-- Owner Card -->
        <div class="owner-card">
          <div class="card-header">
            <span class="icon">👑</span>
            <span>Owner</span>
          </div>
          <div v-if="project?.owner" class="collaborator-item">
            <div class="collaborator-avatar">
              <img v-if="project.owner.avatar_url" :src="project.owner.avatar_url" :alt="project.owner.display_name" />
              <span v-else>{{ project.owner.display_name?.[0] }}</span>
            </div>
            <div class="collaborator-info">
              <span class="collaborator-name">{{ project.owner.display_name }}</span>
              <span class="collaborator-role">Owner</span>
            </div>
          </div>
        </div>

        <!-- Collaborators Card -->
        <div class="collaborators-card">
          <div class="card-header">
            <span class="icon">👥</span>
            <span>Collaborators</span>
          </div>
          <CollaboratorManagement
            :project-id="projectId"
            :collaborators="project?.collaborators || []"
            :is-owner="isOwner"
            @role-updated="handleRoleUpdate"
            @collaborator-removed="handleCollaboratorRemoved"
          />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <NewProjectModal
      :isOpen="isEditModalOpen"
      @close="closeEditModal"
      @submit="handleProjectUpdate"
    />

    <div v-if="isUpdateModalOpen" class="modal-overlay" @click="closeUpdateModal">
      <div class="modal-content card" @click.stop>
        <div class="modal-header">
          <h2>Add Project Update</h2>
          <button class="close-button" @click="closeUpdateModal">×</button>
        </div>

        <form @submit.prevent="submitUpdate" class="update-form">
          <div class="form-group">
            <label for="update-description">Update Description</label>
            <textarea
              id="update-description"
              v-model="updateData.description"
              required
              placeholder="Describe your update"
              rows="4"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="update-files">Attach Files</label>
            <div class="file-upload-container">
              <input
                id="update-files"
                type="file"
                @change="handleFileChange"
                multiple
                class="file-input"
              >
              <div class="file-upload-box">
                <span class="upload-icon">📎</span>
                <span>Drop files here or click to upload</span>
              </div>
            </div>
            <div v-if="updateData.files.length" class="file-list">
              <div v-for="file in updateData.files" :key="file.name" class="file-item">
                <span>{{ file.name }}</span>
                <small>{{ (file.size / 1024).toFixed(1) }} KB</small>
              </div>
            </div>
          </div>

          <div v-if="updateError" class="error-message">{{ updateError }}</div>

          <div class="form-actions">
            <button 
              type="button" 
              class="secondary-button" 
              @click="closeUpdateModal"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="primary-button" 
              :disabled="submitting"
            >
              {{ submitting ? 'Submitting...' : 'Add Update' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="isDeleteConfirmOpen" class="modal-overlay" @click="closeDeleteConfirm">
      <div class="modal-content card confirm-dialog" @click.stop>
        <div class="modal-header">
          <h2>Delete Project</h2>
          <button class="close-button" @click="closeDeleteConfirm">×</button>
        </div>

        <div class="confirm-message">
          <p>Are you sure you want to delete this project?</p>
          <p class="warning">This action cannot be undone. All project data including files and updates will be permanently deleted.</p>
        </div>

        <div v-if="deleteError" class="error-message">{{ deleteError }}</div>

        <div class="form-actions">
          <button 
            type="button" 
            class="secondary-button" 
            @click="closeDeleteConfirm"
            :disabled="deleteSubmitting"
          >
            Cancel
          </button>
          <button 
            type="button" 
            class="danger-button" 
            @click="deleteProject"
            :disabled="deleteSubmitting"
          >
            {{ deleteSubmitting ? 'Deleting...' : 'Delete Project' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--avatar-bg);
  color: var(--text-primary);
  font-weight: 600;
}
</style> 