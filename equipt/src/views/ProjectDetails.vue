<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProjects } from '../composables/useProjects'
import { useUserSearch } from '../composables/useUserSearch'
import { useFileStorage } from '../composables/useFileStorage'
import { supabase } from '../supabase/config'
import FilesGrid from '../components/ui/FilesGrid.vue'

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
const { hasProjectAccess } = useProjects()
const { searchResults, loading: userSearchLoading, error: userSearchError, searchUsers } = useUserSearch()
const { uploadFile, downloadFile, getFileUrl, updateMissingFileUrls, error: fileError, uploading: fileUploading, progress: uploadProgress } = useFileStorage()

const projectId = ref('')
const project = ref(null)
const loading = ref(true)
const error = ref(null)

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
  newCollaborators: []
})
const editSubmitting = ref(false)
const editError = ref(null)
const searchQuery = ref('')
const showSearchResults = ref(false)

// Delete confirmation dialog state
const isDeleteConfirmOpen = ref(false)
const deleteSubmitting = ref(false)
const deleteError = ref(null)

// Add these variables to manage the collaborator removal confirmation
const isRemoveCollabConfirmOpen = ref(false)
const selectedCollaboratorToRemove = ref(null)

// Add these variables to track loading states
const updatingRoleFor = ref(null)
const removingCollaborator = ref(false)

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
  if (!projectId.value) return
  
  loading.value = true
  error.value = null
  
  try {
    // At start of fetchProject
    console.log('Fetching project with ID:', projectId.value);

    // First get the project and its files
    const { data: projectData, error: projectError } = await supabase
      .from(TABLES.PROJECTS)
      .select(`
        *,
        ${TABLES.PROJECT_FILES}(*)
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
      .select('role, user_id')
      .eq('project_id', projectId.value)
    
    if (collabError) console.error('Error fetching collaborators:', collabError)

    // Get user profiles for collaborators
    let userProfiles = []
    if (collaborators && collaborators.length > 0) {
      const userIds = collaborators.map(c => c.user_id)
      const { data: profiles, error: profilesError } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .in('id', userIds)
      
      if (profilesError) {
        console.error('Error fetching collaborator profiles:', profilesError)
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
      const userIds = [...new Set(updates.map(update => update.user_id))];
      
      const { data: userProfiles, error: profilesError } = await supabase
        .from(TABLES.PROFILES)
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      } else {
        // Combine updates with user profiles
        updates.forEach(update => {
          update.user = userProfiles.find(profile => profile.id === update.user_id) || null;
        });
      }
      
      projectData.updates = updates;
    } else {
      projectData.updates = [];
    }

    // After fetching project data
    console.log('Project data:', projectData);

    // After fetching owner data
    console.log('Owner data:', ownerData);

    // After fetching collaborators
    console.log('Collaborators:', collaborators);
    console.log('User profiles:', userProfiles);

    // Combine all the data
    project.value = {
      ...projectData,
      owner: ownerData || null,
      collaborators: (collaborators || []).map(collab => ({
        ...collab,
        user: userProfiles.find(p => p.id === collab.user_id) || null
      })),
      files: projectData.project_files || [],
      updates: projectData.updates || []
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

    // Update the ensureFileUrls function to persist URL updates to the database
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

    // Modify the fetchProject function to await the ensureFileUrls call
    await ensureFileUrls();

    console.log('Combined project data:', project.value);
    console.log('Project files:', project.value.files);
    console.log('Project owner:', project.value.owner);
    console.log('Project collaborators:', project.value.collaborators);
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

// Function to change a new collaborator's role
const changeNewCollaboratorRole = (index, role) => {
  editProjectData.value.newCollaborators[index].role = role
}

// Open edit modal function with updated initialization
const openEditModal = () => {
  editProjectData.value = {
    name: project.value.name || '',
    description: project.value.description || '',
    is_public: project.value.is_public || false,
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

// Update submit edit function to handle collaborator invites
const submitEdit = async () => {
  if (!editProjectData.value.name) {
    editError.value = 'Project name is required'
    return
  }
  
  editSubmitting.value = true
  editError.value = null
  
  try {
    // Update the project
    const { data, error } = await supabase
      .from(TABLES.PROJECTS)
      .update({
        name: editProjectData.value.name,
        description: editProjectData.value.description,
        is_public: editProjectData.value.is_public,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId.value)
      .select()
      .single()
    
    if (error) throw error
    
    // Add new collaborators if any
    if (editProjectData.value.newCollaborators.length > 0) {
      const collaboratorRecords = editProjectData.value.newCollaborators.map(c => ({
        project_id: projectId.value,
        user_id: c.id,
        role: c.role,
        created_at: new Date().toISOString()
      }))
      
      const { error: collabError } = await supabase
        .from(TABLES.PROJECT_COLLABORATORS)
        .insert(collaboratorRecords)
      
      if (collabError) {
        console.error('Error adding collaborators:', collabError)
        throw new Error('Project updated, but failed to add collaborators')
      }
    }
    
    // Refresh project data
    await fetchProject()
    
    // Close modal
    closeEditModal()
  } catch (err) {
    console.error('Error updating project:', err)
    editError.value = err.message
  } finally {
    editSubmitting.value = false
  }
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
    
    // 5. Navigate back to projects page
    router.push('/projects')
  } catch (err) {
    console.error('Error deleting project:', err)
    deleteError.value = err.message
  } finally {
    deleteSubmitting.value = false
  }
}

// Update the updateCollaboratorRole function to include loading state
const updateCollaboratorRole = async (collaboratorId, newRole) => {
  updatingRoleFor.value = collaboratorId
  try {
    const { error } = await supabase
      .from(TABLES.PROJECT_COLLABORATORS)
      .update({ role: newRole })
      .eq('project_id', projectId.value)
      .eq('user_id', collaboratorId)
    
    if (error) throw error
    
    // Refresh project data to show updated roles
    await fetchProject()
  } catch (err) {
    console.error('Error updating collaborator role:', err)
    editError.value = 'Failed to update collaborator role'
  } finally {
    updatingRoleFor.value = null
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

// Update removeCollaborator to include loading state
const removeCollaborator = async () => {
  if (!selectedCollaboratorToRemove.value) return
  
  removingCollaborator.value = true
  try {
    const { error } = await supabase
      .from(TABLES.PROJECT_COLLABORATORS)
      .delete()
      .eq('project_id', projectId.value)
      .eq('user_id', selectedCollaboratorToRemove.value.user_id)
    
    if (error) throw error
    
    // Refresh project data
    await fetchProject()
    closeRemoveCollaboratorConfirm()
  } catch (err) {
    console.error('Error removing collaborator:', err)
    editError.value = 'Failed to remove collaborator'
  } finally {
    removingCollaborator.value = false
  }
}

// Improve the handleFileDownload function to use URLs when available
const handleFileDownload = async (file) => {
  if (!file) return
  
  try {
    // If the file has a URL, use it directly for download
    if (file.url) {
      window.open(file.url, '_blank')
      return
    }
    
    // Otherwise use the file_path to download
    if (!file.file_path) {
      console.error('File has no path or URL')
      return
    }
    
    const blob = await downloadFile(file.file_path)
    if (!blob) return
    
    // Create a temporary download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    
    // Clean up
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (err) {
    console.error('Error downloading file:', err)
    error.value = 'Failed to download file'
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

// Add this function to handle file deletion events from FilesGrid
const handleFileDeleted = (file) => {
  // Update the project.files array to remove the deleted file
  if (project.value && project.value.files) {
    project.value.files = project.value.files.filter(f => f.id !== file.id)
  }
}

onMounted(() => {
  projectId.value = route.params.id
  if (projectId.value) {
    fetchProject()
  } else {
    router.push('/projects')
  }
})
</script>

<template>
  <div class="project-details container">
    <div v-if="loading" class="loading">
      Loading project details...
    </div>
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-else-if="project" class="project-content">
      <div class="project-header">
        <div class="back-button" @click="router.go(-1)">
          &larr; Back
        </div>
        <h1>{{ project.name || project.title || 'Untitled Project' }}</h1>
        <div class="project-meta">
          <span class="date">Created {{ formatDate(project.created_at) }}</span>
          <span class="version">v{{ project.version || '1.0.0' }}</span>
        </div>
      </div>

      <div class="project-body">
        <div class="project-info">
          <div class="info-card">
            <h3>Description</h3>
            <p>{{ project.description || 'No description provided' }}</p>
          </div>

          <div class="info-card">
            <h3>Project Owner</h3>
            <div class="owner-info">
              <div class="user-avatar">
                <img 
                  v-if="project.owner?.avatar_url" 
                  :src="project.owner.avatar_url" 
                  :alt="project.owner.display_name"
                  referrerpolicy="no-referrer"
                >
                <div v-else class="avatar-placeholder">
                  {{ project.owner?.display_name?.[0]?.toUpperCase() || '?' }}
                </div>
              </div>
              <span>{{ project.owner?.display_name || 'Unknown' }}</span>
            </div>
          </div>

          <div v-if="project.collaborators && project.collaborators.length > 0" class="info-card">
            <h3>Collaborators</h3>
            <div class="collaborators-list">
              <div v-for="collab in project.collaborators" :key="collab.user?.id || collab.id" class="collaborator-item">
                <div class="user-info">
                  <div class="user-avatar">
                    <img 
                      v-if="collab.user?.avatar_url" 
                      :src="collab.user.avatar_url" 
                      :alt="collab.user.display_name"
                      referrerpolicy="no-referrer"
                    >
                    <div v-else class="avatar-placeholder">
                      {{ collab.user?.display_name?.[0]?.toUpperCase() || '?' }}
                    </div>
                  </div>
                  <span>{{ collab.user?.display_name || 'Unknown User' }}</span>
                </div>
                <span :class="['role-badge', collab.role]">{{ collab.role }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="project-files">
          <div class="info-card">
            <h3>Files</h3>
            <FilesGrid 
              :files="project.files" 
              layout="list" 
              :allowDelete="isOwner || userRole === 'admin'"
              emptyMessage="No files uploaded yet"
              @delete="handleFileDeleted"
            />
          </div>
        </div>
      </div>

      <div class="project-updates">
        <h3>Project Updates</h3>
        
        <div v-if="project.updates && project.updates.length > 0" class="updates-list">
          <div v-for="update in project.updates" :key="update.id" class="update-item">
            <div class="update-header">
              <div class="user-info">
                <div class="user-avatar">
                  <img 
                    v-if="update.user?.avatar_url" 
                    :src="update.user.avatar_url" 
                    :alt="update.user.display_name"
                    referrerpolicy="no-referrer"
                  >
                  <div v-else class="avatar-placeholder">
                    {{ update.user?.display_name?.[0]?.toUpperCase() || '?' }}
                  </div>
                </div>
                <div>
                  <div class="update-author">{{ update.user?.display_name || 'Unknown User' }}</div>
                  <div class="update-date">{{ formatDate(update.created_at) }}</div>
                </div>
              </div>
            </div>
            
            <div class="update-content">
              <p>{{ update.description }}</p>
            </div>
            
            <div v-if="project.files" class="update-files">
              <FilesGrid 
                :files="project.files.filter(f => f.update_id === update.id)" 
                layout="compact" 
                :allowDelete="isOwner || userRole === 'admin'"
                emptyMessage="No files attached to this update"
                @delete="handleFileDeleted"
              />
            </div>
          </div>
        </div>
        
        <div v-else class="empty-updates">
          <p>No updates yet. Click "Add Progress / Update Project" to add the first update.</p>
        </div>
      </div>

      <div v-if="isOwner || userRole === 'admin' || userRole === 'editor'" class="project-actions">
        <button class="btn btn-success" @click="openUpdateModal">
          <span class="icon">+</span> Add Progress / Update Project
        </button>
        <button v-if="isOwner || userRole === 'admin'" class="btn btn-primary" @click="openEditModal">
          Edit Project
        </button>
        <button v-if="isOwner || userRole === 'admin'" class="btn btn-danger" @click="openDeleteConfirm">
          Delete Project
        </button>
      </div>
    </div>

    <!-- Update Modal -->
    <div v-if="isUpdateModalOpen" class="modal-overlay" @click="closeUpdateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Add Progress / Update Project</h2>
          <button class="close-button" @click="closeUpdateModal">×</button>
        </div>
        
        <form @submit.prevent="submitUpdate" class="update-form">
          <div class="form-group">
            <label for="update-description">What changes have you made?</label>
            <textarea
              id="update-description"
              v-model="updateData.description"
              required
              placeholder="Describe the progress or updates you've made to the project..."
              rows="4"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="update-files">Upload New Files</label>
            <div class="file-upload-container">
              <input
                id="update-files"
                type="file"
                @change="handleFileChange"
                multiple
                class="file-input"
                :disabled="submitting"
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
            <div v-if="submitting && updateData.files.length" class="upload-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
              </div>
              <span class="progress-text">{{ uploadProgress }}% uploaded</span>
            </div>
          </div>
          
          <div v-if="updateError" class="error-message">
            {{ updateError }}
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeUpdateModal">Cancel</button>
            <button type="submit" class="btn btn-success" :disabled="submitting">
              {{ submitting ? 'Saving...' : 'Save Update' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Project Modal -->
    <div v-if="isEditModalOpen" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Edit Project</h2>
          <button class="close-button" @click="closeEditModal">×</button>
        </div>
        
        <form @submit.prevent="submitEdit" class="edit-form">
          <div class="form-group">
            <label for="edit-name">Project Name</label>
            <input
              id="edit-name"
              v-model="editProjectData.name"
              type="text"
              required
              placeholder="Enter project name"
            >
          </div>
          
          <div class="form-group">
            <label for="edit-description">Description</label>
            <textarea
              id="edit-description"
              v-model="editProjectData.description"
              placeholder="Describe your project"
              rows="4"
            ></textarea>
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="editProjectData.is_public"
              >
              <span>Make this project public</span>
            </label>
            <small class="checkbox-help">Public projects are visible to everyone</small>
          </div>
          
          <!-- Update the collaborator section in the Edit Project modal -->
          <div class="form-group collaborators-section">
            <h3>Invite Collaborators</h3>
            
            <!-- Existing collaborators -->
            <div v-if="project.collaborators && project.collaborators.length > 0" class="current-collaborators">
              <h4>Current Collaborators</h4>
              <div class="collaborator-list">
                <div v-for="collab in project.collaborators" :key="collab.user?.id" class="collab-item">
                  <div class="collab-user">
                    <div class="user-avatar small">
                      <img 
                        v-if="collab.user?.avatar_url" 
                        :src="collab.user.avatar_url" 
                        :alt="collab.user.display_name"
                        referrerpolicy="no-referrer"
                      >
                      <div v-else class="avatar-placeholder">
                        {{ collab.user?.display_name?.[0]?.toUpperCase() || '?' }}
                      </div>
                    </div>
                    <span class="collab-name">{{ collab.user?.display_name || 'Unknown' }}</span>
                  </div>
                  <div class="collab-actions">
                    <select 
                      v-if="collab.user_id !== project.owner_id" 
                      v-model="collab.role" 
                      class="role-select"
                      @change="updateCollaboratorRole(collab.user_id, collab.role)"
                      :disabled="updatingRoleFor === collab.user_id"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <span v-else class="role-badge owner">Owner</span>
                    <div v-if="updatingRoleFor === collab.user_id" class="spinner-small role-spinner"></div>
                    <button 
                      v-if="collab.user_id !== project.owner_id"
                      type="button" 
                      class="remove-btn" 
                      @click="openRemoveCollaboratorConfirm(collab)"
                      title="Remove collaborator"
                    >×</button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Search for users -->
            <div class="search-container">
              <label for="user-search">Search users to invite</label>
              <div class="search-input-wrapper">
                <input
                  id="user-search"
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search by name or email"
                  class="search-input"
                >
                <div v-if="userSearchLoading" class="search-loading">
                  <div class="spinner-small"></div>
                </div>
              </div>
              
              <!-- Search results -->
              <div v-if="showSearchResults && searchResults.length > 0" class="search-results">
                <div 
                  v-for="result in searchResults" 
                  :key="result.id" 
                  class="search-result-item"
                  @click="addCollaborator(result)"
                >
                  <div class="user-info">
                    <div class="user-avatar small">
                      <img 
                        v-if="result.avatar_url" 
                        :src="result.avatar_url" 
                        :alt="result.display_name"
                        referrerpolicy="no-referrer"
                      >
                      <div v-else class="avatar-placeholder">
                        {{ result.display_name?.[0]?.toUpperCase() || '?' }}
                      </div>
                    </div>
                    <div class="user-details">
                      <div class="user-name">{{ result.display_name }}</div>
                      <div class="user-email">{{ result.email }}</div>
                    </div>
                  </div>
                  <div class="add-btn">+ Add</div>
                </div>
              </div>
              
              <div v-else-if="showSearchResults && searchResults.length === 0" class="no-results">
                No users found with that name or email
              </div>
            </div>
            
            <!-- New collaborators to be added -->
            <div v-if="editProjectData.newCollaborators.length > 0" class="new-collaborators">
              <h4>Users to be added</h4>
              <div class="collaborator-list">
                <div v-for="(collab, index) in editProjectData.newCollaborators" :key="collab.id" class="collab-item">
                  <div class="collab-user">
                    <div class="user-avatar small">
                      <img 
                        v-if="collab.avatar_url" 
                        :src="collab.avatar_url" 
                        :alt="collab.display_name"
                        referrerpolicy="no-referrer"
                      >
                      <div v-else class="avatar-placeholder">
                        {{ collab.display_name?.[0]?.toUpperCase() || '?' }}
                      </div>
                    </div>
                    <span class="collab-name">{{ collab.display_name }}</span>
                  </div>
                  <div class="collab-actions">
                    <select v-model="collab.role" class="role-select">
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button 
                      type="button" 
                      class="remove-btn" 
                      @click="removeNewCollaborator(index)"
                      title="Remove"
                    >×</button>
                  </div>
                </div>
              </div>
            </div>
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

    <!-- Delete Confirmation Dialog -->
    <div v-if="isDeleteConfirmOpen" class="modal-overlay" @click="closeDeleteConfirm">
      <div class="modal-content delete-confirm" @click.stop>
        <div class="modal-header">
          <h2>Delete Project</h2>
          <button class="close-button" @click="closeDeleteConfirm">×</button>
        </div>
        
        <div class="confirm-content">
          <p class="confirm-message">
            Are you sure you want to delete this project? This action cannot be undone.
          </p>
          <p class="confirm-details">
            This will permanently delete all project files, updates, and remove all collaborators.
          </p>
          
          <div v-if="deleteError" class="error-message">
            {{ deleteError }}
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeDeleteConfirm">Cancel</button>
            <button 
              type="button" 
              class="btn btn-danger confirm-delete-btn" 
              :disabled="deleteSubmitting"
              @click="deleteProject"
            >
              {{ deleteSubmitting ? 'Deleting...' : 'Delete Project' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Remove Collaborator Confirmation Dialog -->
    <div v-if="isRemoveCollabConfirmOpen" class="modal-overlay" @click="closeRemoveCollaboratorConfirm">
      <div class="modal-content remove-collab-confirm" @click.stop>
        <div class="modal-header">
          <h2>Remove Collaborator</h2>
          <button class="close-button" @click="closeRemoveCollaboratorConfirm">×</button>
        </div>
        
        <div class="confirm-content">
          <p class="confirm-message">
            Are you sure you want to remove 
            <strong>{{ selectedCollaboratorToRemove?.user?.display_name || 'this collaborator' }}</strong> 
            from the project?
          </p>
          <p class="confirm-details">
            They will lose access to this project and will need to be invited again to regain access.
          </p>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeRemoveCollaboratorConfirm">Cancel</button>
            <button 
              type="button" 
              class="btn btn-danger" 
              @click="removeCollaborator"
              :disabled="removingCollaborator"
            >
              {{ removingCollaborator ? 'Removing...' : 'Remove Collaborator' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-details {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading, .error-message {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
}

.error-message {
  color: #ef4444;
}

.project-header {
  margin-bottom: 2rem;
}

.back-button {
  display: inline-block;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  color: var(--accent-blue);
  cursor: pointer;
  font-weight: 500;
}

.back-button:hover {
  text-decoration: underline;
}

h1 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.project-meta {
  display: flex;
  gap: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.project-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.project-updates {
  margin-bottom: 2rem;
}

.project-updates h3 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.info-card {
  background: var(--secondary-dark);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.info-card h3 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.info-card p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.owner-info, .user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--primary-dark);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: var(--white);
  background-color: var(--primary-dark);
}

.collaborators-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.collaborator-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--primary-dark);
  border-radius: 6px;
}

.role-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
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

.role-badge.editor {
  background-color: var(--info);
  color: var(--white);
}

.role-badge.viewer {
  background-color: var(--secondary-dark);
  color: var(--white);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--primary-dark);
  border-radius: 6px;
}

.file-icon {
  font-size: 1.5rem;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.file-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.empty-message {
  color: var(--text-secondary);
  font-style: italic;
}

.project-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--accent-blue);
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-success {
  background: #22c55e;
  color: white;
}

.icon {
  margin-right: 0.5rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: var(--secondary-dark);
  padding: 2rem;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
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
  font-size: 1.5rem;
  cursor: pointer;
}

.update-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group textarea {
  padding: 0.5rem;
  border: 1px solid var(--primary-dark);
  border-radius: 6px;
}

.file-upload-container {
  position: relative;
  height: 120px;
  margin-bottom: 1rem;
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
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 2px dashed var(--primary-dark);
  border-radius: 6px;
  pointer-events: none;
}

.upload-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.file-list {
  margin-top: 0.5rem;
  margin-left: 1rem;
}

.file-item {
  margin-bottom: 0.25rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-secondary {
  background: var(--primary-dark);
  color: white;
}

.updates-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.update-item {
  background: var(--secondary-dark);
  border-radius: 8px;
  padding: 1.5rem;
}

.update-header {
  margin-bottom: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.update-author {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.update-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.update-content {
  margin-bottom: 1rem;
}

.update-files {
  display: flex;
  gap: 0.75rem;
}

.file-badge {
  padding: 0.25rem 0.75rem;
  background: var(--primary-dark);
  border-radius: 6px;
}

.file-icon {
  margin-right: 0.5rem;
}

.empty-updates {
  text-align: center;
  padding: 1rem;
  color: var(--text-secondary);
  font-style: italic;
}

.checkbox-group {
  margin: 1rem 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-help {
  display: block;
  margin-top: 0.25rem;
  margin-left: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

input[type="text"],
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--primary-dark);
  border-radius: 6px;
  background: var(--primary-dark);
  color: var(--text-primary);
}

.delete-confirm {
  max-width: 500px;
}

.confirm-message {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.confirm-details {
  margin-bottom: 2rem;
  color: var(--text-secondary);
}

.confirm-delete-btn {
  font-weight: 600;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.collaborators-section {
  margin-bottom: 1rem;
}

.current-collaborators {
  margin-bottom: 1rem;
}

.collaborator-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.collab-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--primary-dark);
  border-radius: 6px;
}

.collab-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.collab-name {
  font-weight: 500;
}

.search-container {
  margin-bottom: 1rem;
}

.search-input-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--primary-dark);
  border-radius: 6px;
}

.search-loading {
  position: absolute;
  top: 100%;
  right: 0;
  transform: translateY(-100%);
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.search-results {
  margin-top: 0.5rem;
  margin-left: 1rem;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--primary-dark);
  border-radius: 6px;
  cursor: pointer;
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
  background: var(--primary-dark);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 500;
}

.user-email {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.add-btn {
  padding: 0.25rem 0.75rem;
  background: var(--accent-blue, var(--primary));
  color: white;
  border-radius: 6px;
  cursor: pointer;
}

.add-btn:hover {
  background: var(--accent-blue-dark, var(--primary-dark));
}

.new-collaborators {
  margin-top: 1rem;
}

.collaborator-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.collab-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--primary-dark);
  border-radius: 6px;
}

.collab-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.collab-name {
  font-weight: 500;
}

.collab-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
}

.role-select {
  padding: 0.25rem;
  border: 1px solid var(--primary-dark);
  border-radius: 6px;
}

.remove-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.user-avatar.small {
  width: 28px;
  height: 28px;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top: 2px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.collaborators-section h3 {
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: var(--text-primary);
}

.collaborators-section h4 {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.no-results {
  padding: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.875rem;
}

.search-result-item {
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}

.search-result-item:hover {
  background: var(--primary);
}

.role-spinner {
  position: absolute;
  right: 80px;
  margin-top: 5px;
}

.remove-collab-confirm {
  max-width: 450px;
}

.confirm-message strong {
  color: var(--primary);
  font-weight: 600;
}

.upload-progress {
  margin-top: 1rem;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background-color: var(--primary-dark);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-link {
  text-decoration: none;
  color: var(--accent-blue);
  cursor: pointer;
}

.file-download-btn {
  background: none;
  border: none;
  cursor: pointer;
}

.file-action-icon {
  font-size: 1.5rem;
}
</style> 