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
const { uploadFile, downloadFile, getFileUrl, updateMissingFileUrls, error: fileError, uploading: fileUploading, progress: uploadProgress, deleteFile } = useFileStorage()

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

// State to control visibility of the add collaborator search input
const showAddCollaboratorSearch = ref(false)

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

// Function to toggle the search input visibility
const toggleAddCollaboratorSearch = () => {
  showAddCollaboratorSearch.value = !showAddCollaboratorSearch.value
  // Clear search when hiding
  if (!showAddCollaboratorSearch.value) {
    searchQuery.value = ''
    showSearchResults.value = false
  }
}

// Modify addCollaborator to hide search after adding
const addCollaborator = (selectedUser) => {
  // Check if the user is already a collaborator in the project
  const isExistingCollaborator = project.value.collaborators.some(c => c.user && c.user.id === selectedUser.id)
  
  if (isExistingCollaborator) {
    editError.value = `${selectedUser.display_name} is already a collaborator`
    return
  }
  
  // Add the new collaborator with default role 'viewer'
  addNewCollaboratorToDB(selectedUser)
  
  // Clear search and hide input
  searchQuery.value = ''
  showSearchResults.value = false
  showAddCollaboratorSearch.value = false
  editError.value = null
}

// New function to add collaborator directly to DB
const addNewCollaboratorToDB = async (selectedUser) => {
  editSubmitting.value = true
  editError.value = null

  try {
    const collaboratorRecord = {
      project_id: projectId.value,
      user_id: selectedUser.id,
      role: 'viewer', // Default role
      created_at: new Date().toISOString()
    }
    
    const { error: collabError } = await supabase
      .from(TABLES.PROJECT_COLLABORATORS)
      .insert(collaboratorRecord)
    
    if (collabError) {
      console.error('Error adding collaborator:', collabError)
      throw new Error('Failed to add collaborator')
    }
    
    // Refresh project data to show the new collaborator
    await fetchProject()
  } catch (err) {
    console.error('Error adding collaborator directly:', err)
    editError.value = err.message || 'Failed to add collaborator.'
  } finally {
    editSubmitting.value = false
  }
}

// Update submitEdit to remove collaborator adding logic
const submitEdit = async () => {
  if (!editProjectData.value.name) {
    editError.value = 'Project name is required'
    return
  }
  
  editSubmitting.value = true
  editError.value = null
  
  try {
    // Update the project details ONLY
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
    
    // Refresh project data (might not be strictly necessary if only project details changed, but good practice)
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
    } else {
      error.value = 'Failed to delete file. Please try again.';
    }
  } catch (err) {
    console.error('Error deleting file:', err);
    error.value = 'An error occurred while deleting the file.';
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
        <div v-if="loading" class="loading-spinner">
          Loading files...
        </div>
        <FilesGrid
          v-else
          :files="project.files"
          :loading="loading"
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
            <button @click="openEditModal" class="action-button btn-edit">
              ✏️ Edit Project
            </button>
            <button @click="openUpdateModal" class="action-button btn-update">
              ➕ Add Update
            </button>
              </div>
            </div>

        <!-- Updates Card -->
        <div class="updates-card">
          <div class="card-header">
            <span class="icon">🔄</span>
            <span>Updates</span>
          </div>
          <div v-if="loading" class="loading-spinner">
            Loading updates...
          </div>
          <div v-else-if="project.updates && project.updates.length > 0" class="updates-list">
            <div v-for="update in project.updates" :key="update.id" class="update-item">
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
            <!-- Add Collaborator Button (visible to owner/admin) -->
            <button 
              v-if="isOwner || userRole === 'admin'" 
              @click="toggleAddCollaboratorSearch" 
              class="add-collab-button"
              title="Add Collaborator"
            >
              {{ showAddCollaboratorSearch ? '−' : '+' }}
            </button>
          </div>

          <!-- Add Collaborator Search Section (conditionally shown) -->
          <div v-if="showAddCollaboratorSearch && (isOwner || userRole === 'admin')" class="add-collaborator-section">
            <div class="search-container">
              <label for="user-search-card">Search users to invite</label>
              <div class="search-input-wrapper">
                <input
                  id="user-search-card"
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
            
              <div v-else-if="showSearchResults && searchResults.length === 0 && !userSearchLoading" class="no-results">
                No users found
              </div>
              <div v-if="editError" class="error-message small-error">
                {{ editError }}
              </div>
               <div v-if="userSearchError" class="error-message small-error">
                Error searching users: {{ userSearchError }}
              </div>
            </div>
            </div>
            
          <!-- Existing Collaborators List -->
          <div v-if="project.collaborators && project.collaborators.length > 0" class="collaborators-list">
            <div v-for="collab in project.collaborators" :key="collab.user?.id || collab.id" class="collaborator-item manage-collab-item">
              <!-- Collaborator Info (Avatar and Name) -->
              <div class="collaborator-info-main">
                  <div class="collaborator-avatar">
                    <img 
                      v-if="collab.user?.avatar_url" 
                      :src="collab.user.avatar_url" 
                      :alt="collab.user.display_name"
                       referrerpolicy="no-referrer"
                    />
                    <span v-else class="avatar-placeholder">
                      {{ collab.user?.display_name?.[0] || '?' }}
                    </span>
            </div>
                  <div class="collaborator-info">
                    <span class="collaborator-name">{{ collab.user?.display_name || 'Unknown User' }}</span>
                     <!-- Display role as text if user is not owner/admin -->
                    <span v-if="!(isOwner || userRole === 'admin')" class="collaborator-role">{{ collab.role }}</span>
          </div>
        </div>
        
              <!-- Management Controls (visible to owner/admin) -->
              <div v-if="isOwner || userRole === 'admin'" class="collaborator-controls">
                  <select 
                    v-if="collab.user_id !== project.owner_id" 
                    :value="collab.role" 
                    class="role-select"
                    @change="updateCollaboratorRole(collab.user_id, $event.target.value)"
                    :disabled="updatingRoleFor === collab.user_id"
                    title="Change role"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span v-else class="role-badge owner">👑 Owner</span> 
                  
                  <div v-if="updatingRoleFor === collab.user_id" class="spinner-small role-spinner"></div>
                  
                  <button 
                    v-if="collab.user_id !== project.owner_id"
                    type="button" 
                    class="remove-btn icon-btn" 
                    @click="openRemoveCollaboratorConfirm(collab)"
                    title="Remove collaborator"
                    :disabled="removingCollaborator && selectedCollaboratorToRemove?.user_id === collab.user_id"
                  >
                    🗑️ <!-- Trash can icon -->
                  </button>
        </div>
              <!-- Display role as text if user IS owner/admin but it's the owner row -->
               <div v-else-if="collab.user_id === project.owner_id" class="collaborator-controls">
                 <span class="role-badge owner">👑 Owner</span>
               </div>

            </div>
          </div>
          <p v-else class="text-secondary">No collaborators yet.</p>
        </div>
      </div>
      </div>
    </div>

    <!-- Update Modal -->
  <div v-if="isUpdateModalOpen" class="modal">
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

  <!-- Edit Project Modal (Collaborator section removed) -->
  <div v-if="isEditModalOpen" class="modal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
        <h2>Edit Project Details</h2>
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
  <div v-if="isDeleteConfirmOpen" class="modal">
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
  <div v-if="isRemoveCollabConfirmOpen" class="modal">
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
</template>

<style scoped>
/* Main container */
.project-details {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Project Header */
.project-header {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  border-radius: var(--border-radius);
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  background-color: var(--color-background-mute);
}

.back-button span:first-child {
  font-size: 1.2rem;
}

.project-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

/* Project Body - Three Column Layout */
.project-body {
  display: grid;
  grid-template-columns: 250px 1fr 250px; /* Files | Info/Updates | Owner/Collab */
  gap: 1.5rem;
}

/* Common Card Styling */
.project-files > div,
.project-info > div,
.owner-collab-group > div {
  background-color: var(--color-background-soft);
  border-radius: var(--border-radius-large);
  padding: 1.5rem;
  box-shadow: var(--shadow-elevation-low);
  margin-bottom: 1.5rem; /* Add space between cards in the same column */
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.75rem;
}

.card-header .icon {
  font-size: 1.3rem;
}

/* Left Column - Files */
.project-files {
  /* Styles specific to the files column container if needed */
}
.project-files .card-header {
  /* Styles for the Files card header */
}
.project-files .loading-spinner {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}
/* Assuming FilesGrid has its own internal styling */

/* Middle Column - Info, Actions, Updates */
.project-info {
  display: flex;
  flex-direction: column;
}

.description-card p {
  color: var(--color-text);
  line-height: 1.6;
}

.text-secondary {
  color: var(--color-text-secondary);
  font-style: italic;
}

.actions-card .actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.action-button {
  padding: 0.75rem 1rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: center;
}

.action-button:hover {
  background-color: var(--color-primary-hover);
}

.updates-card .loading-spinner {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.updates-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.update-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--color-background);
  border-radius: var(--border-radius);
}

.update-avatar {
  flex-shrink: 0;
}

.update-avatar img,
.update-avatar .avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background-mute);
  color: var(--color-text);
  font-weight: 600;
}

.update-content {
  flex-grow: 1;
}

.update-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.update-author {
  font-weight: 600;
  color: var(--color-heading);
}

.update-date {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.update-text {
  color: var(--color-text);
  line-height: 1.5;
  margin: 0;
}

/* Right Column - Owner and Collaborators */
.owner-collab-group {
  display: flex;
  flex-direction: column;
}

.collaborator-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background-color: var(--color-background);
  border-radius: var(--border-radius);
  margin-bottom: 0.75rem; /* Space between collaborators */
}

.collaborator-avatar {
  flex-shrink: 0;
}

.collaborator-avatar img,
.collaborator-avatar span {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background-mute);
  color: var(--color-text);
  font-weight: 600;
}

.collaborator-info {
  display: flex;
  flex-direction: column;
}

.collaborator-name {
  font-weight: 600;
  color: var(--color-heading);
}

.collaborator-role {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-transform: capitalize;
}

.collaborators-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Modals - Basic Styling (assuming more specific modal styles exist elsewhere or in modal components) */
.modal {
  /* Basic positioning and backdrop */
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
  background-color: var(--color-background);
  padding: 2rem;
  border-radius: var(--border-radius-large);
  box-shadow: var(--shadow-elevation-high);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1rem;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--color-heading);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0.25rem;
  line-height: 1;
}

.close-button:hover {
  color: var(--color-text);
}

/* Styles for Collaborator Card Management */
.collaborators-card .card-header {
  justify-content: space-between; /* Push button to the right */
}

.add-collab-button {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.add-collab-button:hover {
  background-color: var(--color-background-mute);
  color: var(--color-text);
}

.add-collaborator-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.search-container {
  margin-bottom: 1rem;
}

.search-container label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.search-input-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background-color: var(--color-background);
  color: var(--color-text);
}
.search-input:focus {
   border-color: var(--color-primary);
   outline: none;
}

.search-loading {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.search-results {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  background-color: var(--color-background);
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.search-result-item:hover {
  background-color: var(--color-background-mute);
}

.search-result-item .user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.search-result-item .user-details {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.search-result-item .user-name {
   font-weight: 500;
}
.search-result-item .user-email {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.search-result-item .add-btn {
  font-size: 0.8rem;
  color: var(--color-primary);
  font-weight: 500;
  padding: 0.2rem 0.5rem;
  border-radius: var(--border-radius);
  background-color: var(--color-primary-soft);
}

.no-results {
  padding: 0.75rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--border-radius) var(--border-radius);
}
.small-error {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--color-danger-soft);
  border-radius: var(--border-radius);
}

/* Adjust collaborator item for management controls */
.manage-collab-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.collaborator-info-main {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-grow: 1; /* Allow info to take available space */
  margin-right: 1rem; /* Add space before controls */
}

.collaborator-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0; /* Prevent controls from shrinking */
}

.role-select {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background-color: var(--color-background-mute);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  max-width: 100px; /* Prevent select from becoming too wide */
}

.role-badge {
  font-size: 0.85rem;
  padding: 0.25rem 0.6rem;
  border-radius: var(--border-radius);
  color: var(--color-text);
  font-weight: 500;
}
.role-badge.owner {
   display: inline-flex;
   align-items: center;
   gap: 0.3em;
   background-color: transparent; /* Remove background if only icon needed */
   color: var(--color-warning); /* Use warning color for owner */
   padding: 0.25rem 0; /* Adjust padding */
   font-weight: 600;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1.1rem; /* Adjust icon size */
  line-height: 1;
  border-radius: var(--border-radius-small);
  transition: background-color 0.2s ease, color 0.2s ease;
  color: var(--color-text-secondary); /* Default subtle color */
}

.icon-btn:hover {
  background-color: var(--color-background-mute);
}

.icon-btn.remove-btn {
  /* Keep default subtle color */
}

.icon-btn.remove-btn:hover {
  color: var(--color-danger); /* Red color on hover for delete */
  background-color: var(--color-danger-soft); /* Slight red background on hover */
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: transparent;
}

/* Adjust spinner position if needed */
.spinner-small.role-spinner {
  margin-left: 0; /* Reset margin if gap handles spacing */
}

/* Adjustments for Edit Modal (since collaborator section removed) */
.edit-form {
  /* Remove styles specific to collaborators-section if any were added before */
}

/* Spinner (re-add if not present globally) */
.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Ensure user avatar styles are available if not global */
.user-avatar.small {
  width: 32px;
  height: 32px;
  font-size: 0.9rem;
}
.user-avatar img, 
.user-avatar .avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover; /* Ensure images cover the area */
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background-mute);
  color: var(--color-text);
  font-weight: 600;
}

/* Responsive Adjustments might be needed for the new controls */
@media (max-width: 768px) {
   .manage-collab-item {
      flex-direction: column; /* Stack info and controls on small screens */
      align-items: flex-start; /* Align items left */
      gap: 0.5rem;
   }
   .collaborator-controls {
     margin-left: calc(40px + 1rem); /* Align controls under name/role based on avatar size + gap */
     padding-bottom: 0.5rem; /* Add spacing below controls */
   }
   .collaborators-card .card-header {
     flex-wrap: wrap; /* Allow header items to wrap */
   }
   .add-collab-button {
     margin-left: auto; /* Keep button pushed right */
   }
}

/* --- UI Refinements --- */

/* 1. Files Card Cleanup */
.project-files .card-header {
  /* Kept existing styles, ensure consistency */
}

/* Apply styles directly to FilesGrid via a class or target its container */
.project-files ::v-deep(.files-grid) { /* If FilesGrid has a root class 'files-grid' */
  /* Example: Add padding, adjust layout if needed */
  padding-top: 0.5rem; /* Add some space below header */
}

/* Or style the FilesGrid component instance if it was given a class in the template */
.project-files FilesGrid {
  /* margin-top: 0.5rem; */ /* Alternative spacing */
}

/* Ensure FilesGrid component takes full width if needed */
.project-files {
  /* Potentially set display: flex; flex-direction: column; if needed */
}

/* 2. Collaborator Controls Neatening */
.collaborator-controls {
  gap: 0.75rem; /* Adjust gap for better spacing */
}

.role-select {
  /* Existing styles are likely okay, ensure padding is balanced */
  padding: 0.4rem 0.6rem;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1.1rem; /* Adjust icon size */
  line-height: 1;
  border-radius: var(--border-radius-small);
  transition: background-color 0.2s ease, color 0.2s ease;
  color: var(--color-text-secondary); /* Default subtle color */
}

.icon-btn:hover {
  background-color: var(--color-background-mute);
}

.icon-btn.remove-btn {
  /* Keep default subtle color */
}

.icon-btn.remove-btn:hover {
  color: var(--color-danger); /* Red color on hover for delete */
  background-color: var(--color-danger-soft); /* Slight red background on hover */
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: transparent;
}

/* Remove old .remove-btn specific styles if superseded by .icon-btn */
/* .remove-btn { ... } */

/* Adjust spinner position if needed */
.spinner-small.role-spinner {
  margin-left: 0; /* Reset margin if gap handles spacing */
}

.role-badge.owner {
   display: inline-flex;
   align-items: center;
   gap: 0.3em;
   background-color: transparent; /* Remove background if only icon needed */
   color: var(--color-warning); /* Use warning color for owner */
   padding: 0.25rem 0; /* Adjust padding */
   font-weight: 600;
}

/* 3. Action Button Coloring */
.action-button {
  /* Keep existing base styles */
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
  text-align: center;
  font-weight: 500;
  display: inline-flex; /* Align icon and text */
  align-items: center;
  justify-content: center;
  gap: 0.5rem; /* Space between icon and text */
}

.action-button:hover {
  transform: translateY(-1px);
}

.action-button.btn-edit {
  background-color: var(--color-primary); 
  color: var(--color-button-text, white); /* Use button text color variable or default */
}
.action-button.btn-edit:hover {
  background-color: var(--color-primary-hover);
}

.action-button.btn-update {
  background-color: var(--color-success); 
  color: var(--color-button-text, white); /* Use button text color variable or default */
}
.action-button.btn-update:hover {
  background-color: var(--color-success-hover);
}

/* ... rest of styles ... */
</style> 