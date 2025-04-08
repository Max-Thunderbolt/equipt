<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProjects } from '../composables/useProjects'
import { useUserSearch } from '../composables/useUserSearch'
import { useFileStorage } from '../composables/useFileStorage'
import { supabase } from '../supabase/config'
import FilesGrid from '../components/ui/FilesGrid.vue'
import ProjectTodos from '../components/ui/ProjectTodos.vue'
import '../styles/projects.css'

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
    
    // Insert the update
    const { data: update, error: updateError } = await supabase
      .from(TABLES.PROJECT_UPDATES)
      .insert(updatePayload)
      .select('*')
      .single()
    
    if (updateError) {
      console.error('Error creating update record:', updateError)
      throw new Error(`Failed to create update: ${updateError.message}`)
    }
    
    // Upload files if any
    if (updateData.value.files.length > 0) {
      for (const file of updateData.value.files) {
        try {
          // Upload each file
          const fileRecord = await uploadFile(file, projectId.value, update.id)
          
          if (!fileRecord) {
            console.error(`Failed to upload file: ${file.name}`)
            updateError.value = `Failed to upload file: ${file.name}`
            // Continue with other files
          }
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
      .select(`
        role,
        user_id,
        created_at,
        updated_at
      `)
      .eq('project_id', projectId.value)
    
    if (collabError) {
      console.error('Error fetching collaborators:', collabError)
      throw new Error('Failed to fetch collaborators')
    }

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

// Add openEditModal and closeEditModal functions
const openEditModal = () => {
  // Initialize edit form with current project data
  editProjectData.value = {
    name: project.value.name,
    description: project.value.description,
    is_public: project.value.is_public,
    newCollaborators: []
  }
  editError.value = null
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  editError.value = null
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

// Update the updateCollaboratorRole function to use a direct SQL query
const updateCollaboratorRole = async (collaboratorId, newRole) => {
  updatingRoleFor.value = collaboratorId
  editError.value = null
  
  try {
    console.log(`Updating role for collaborator ${collaboratorId} to ${newRole} in project ${projectId.value}`);
    
    // Update the role using a direct SQL query
    const { error: updateError } = await supabase
      .rpc('update_collaborator_role', {
        p_project_id: projectId.value,
        p_user_id: collaboratorId,
        p_new_role: newRole
      });
    
    if (updateError) {
      console.error('Error updating collaborator role:', updateError);
      throw updateError;
    }
    
    console.log('Role updated successfully in database');
    
    // Update local state immediately
    if (project.value && project.value.collaborators) {
      const collaborator = project.value.collaborators.find(c => c.user_id === collaboratorId);
      if (collaborator) {
        collaborator.role = newRole;
      }
    }
    
    // Refresh project data to ensure consistency
    await fetchProject();
  } catch (err) {
    console.error('Error updating collaborator role:', err);
    editError.value = err.message || 'Failed to update collaborator role';
  } finally {
    updatingRoleFor.value = null;
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
    console.log(`Removing collaborator ${selectedCollaboratorToRemove.value.user_id} from project ${projectId.value}`);
    
    // Use RPC to remove the collaborator
    const { error } = await supabase
      .rpc('remove_project_collaborator', {
        p_project_id: projectId.value,
        p_user_id: selectedCollaboratorToRemove.value.user_id
      });
    
    if (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
    
    console.log('Collaborator removed successfully');
    
    // Update local state immediately
    if (project.value && project.value.collaborators) {
      project.value.collaborators = project.value.collaborators.filter(
        c => c.user_id !== selectedCollaboratorToRemove.value.user_id
      );
    }
    
    // Refresh project data to ensure consistency
    await fetchProject();
    closeRemoveCollaboratorConfirm();
  } catch (err) {
    console.error('Error removing collaborator:', err);
    editError.value = err.message || 'Failed to remove collaborator';
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
    } else {
      error.value = 'Failed to delete file. Please try again.';
    }
  } catch (err) {
    console.error('Error deleting file:', err);
    error.value = 'An error occurred while deleting the file.';
  }
}

// Helper function to get CSS variable value (needed for SVG color)
// IMPORTANT: This assumes your variables are defined on :root or a parent element
// It might return an empty string if the variable isn't found immediately.
// Consider a more robust way if variables are deeply nested or loaded async.
function getCssVariableValue(variableName) {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  } 
  return '#888888'; // Fallback color
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
    <!-- Loading State -->
    <div v-if="loading" class="loading-message">
      Loading project details...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-message">
      Error loading project: {{ error }}
    </div>

    <!-- Content State (Main v-else block) -->
    <div v-else class="project-details-container">
      <!-- Check project object is valid before rendering anything inside -->
      <div v-if="project" class="project-content">
        <!-- Project Header -->
        <div class="project-header">
          <router-link :to="{ name: 'projects' }" class="back-button">
            <span>←</span>
            <span>Back to Projects</span>
          </router-link>
          <h1 class="project-title">{{ project.name || 'Untitled Project' }}</h1>
        </div>

        <!-- Project Body -->
        <div class="project-body">
          <!-- Left Column - Files -->
          <div class="project-files">
            <div class="files-card">
              <div class="card-header">
                <span class="icon">📁</span>
                <span>Files</span>
              </div>
              <!-- FilesGrid needs :files, pass empty array if project.files is null/undefined -->
              <FilesGrid
                :files="project.files || []" 
                :loading="false" 
                @delete="handleFileDeleted"
                @download="handleFileDownload"
              />
            </div>
          </div>

          <!-- Middle Column - Description, Actions, Updates -->
          <div class="project-info">
            <!-- Description Card -->
            <div class="description-card">
              <div class="card-header">
                <span class="icon">📝</span>
                <span>Description</span>
              </div>
              <p v-if="project.description">{{ project.description }}</p>
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

            <!-- Todos Section -->
            <ProjectTodos 
              :projectId="projectId" 
              :canEdit="isOwner || userRole === 'admin' || userRole === 'editor'"
            />

            <!-- Updates Card -->
            <div class="updates-card">
              <div class="card-header">
                <span class="icon">🔄</span>
                <span>Updates</span>
              </div>
              <!-- Check updates array -->
              <div v-if="!project.updates || project.updates.length === 0" class="text-secondary updates-empty">
                No updates yet.
              </div>
              <div v-else class="updates-list">
                <div v-for="update in project.updates" :key="update.id" class="update-item">
                  <div class="update-avatar">
                    <img
                      v-if="update.user?.avatar_url"
                      :src="update.user.avatar_url"
                      :alt="update.user.display_name || 'User Avatar'"
                    />
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
          </div>

          <!-- Right Column - Owner and Collaborators -->
          <div class="owner-collab-group">
            <!-- Owner Card -->
            <div class="owner-card">
              <div class="card-header">
                <span class="icon">👑</span>
                <span>Project Creator</span>
              </div>
              <!-- Check owner object -->
              <div v-if="project.owner" class="collaborator-item owner-display">
                <div class="collaborator-avatar">
                  <img v-if="project.owner.avatar_url" :src="project.owner.avatar_url" :alt="project.owner.display_name" />
                  <span v-else>{{ project.owner.display_name?.[0] || '?' }}</span>
                </div>
                <div class="collaborator-info">
                  <span class="collaborator-name">{{ project.owner.display_name }}</span>
                </div>
              </div>
              <p v-else class="text-secondary owner-missing">Owner information not available.</p>
            </div>

            <!-- Collaborators Card -->
            <div class="collaborators-card">
              <div class="card-header">
                <span class="icon">👥</span>
                <span>Collaborators</span>
                <button
                  v-if="isOwner || userRole === 'admin'"
                  @click="toggleAddCollaboratorSearch"
                  class="add-collab-button"
                  title="Add Collaborator"
                >
                  {{ showAddCollaboratorSearch ? '−' : '+' }}
                </button>
              </div>

              <!-- Add Collaborator Section -->
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
                    /> <!-- Self-closed input -->
                    <div v-if="userSearchLoading" class="search-loading">
                      <div class="spinner-small"></div>
                    </div>
                  </div>
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
                          /> <!-- Self-closed img -->
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
              </div> <!-- End Add Collaborator Section -->

              <!-- Collaborators List -->
              <div v-if="!project.collaborators || project.collaborators.length === 0" class="text-secondary collabs-empty">
                No collaborators yet.
              </div>
              <div v-else class="collaborators-list">
                <div v-for="collab in project.collaborators" :key="collab.user?.id || collab.id" class="collaborator-item manage-collab-item">
                  <!-- Info Part -->
                  <div class="collaborator-info-main">
                    <div class="collaborator-avatar">
                      <img
                        v-if="collab.user?.avatar_url"
                        :src="collab.user.avatar_url"
                        :alt="collab.user.display_name || 'User Avatar'"
                        referrerpolicy="no-referrer"
                      /> <!-- Self-closed img -->
                      <span v-else class="avatar-placeholder">
                        {{ collab.user?.display_name?.[0] || '?' }}
                      </span>
                    </div>
                    <div class="collaborator-info">
                      <span class="collaborator-name">{{ collab.user?.display_name || 'Unknown User' }}</span>
                      <!-- Show text role only if not owner/admin -->
                      <span v-if="!(isOwner || userRole === 'admin')" class="collaborator-role">{{ collab.role }}</span>
                    </div>
                  </div>
                  <!-- Controls Part (Only for Owner/Admin) -->
                  <div v-if="isOwner || userRole === 'admin'" class="collaborator-controls">
                    <!-- Show crown icon if it's the owner -->
                    <span v-if="collab.user_id === project.owner_id" class="role-badge owner">👑</span>
                    <!-- Show Dropdown and Remove button otherwise -->
                    <template v-else>
                      <select
                        :value="collab.role"
                        class="role-select"
                        @change.prevent="(e) => {
                          e.preventDefault();
                          updateCollaboratorRole(collab.user_id, e.target.value);
                        }"
                        :disabled="updatingRoleFor === collab.user_id"
                        title="Change role"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div v-if="updatingRoleFor === collab.user_id" class="spinner-small role-spinner"></div>
                      <button
                        type="button"
                        class="remove-btn icon-btn"
                        @click="openRemoveCollaboratorConfirm(collab)"
                        title="Remove collaborator"
                        :disabled="removingCollaborator && selectedCollaboratorToRemove?.user_id === collab.user_id"
                      >
                        🗑️
                      </button>
                    </template>
                  </div>
                </div> <!-- End v-for collab item -->
              </div> <!-- End collaborators-list -->
            </div> <!-- End collaborators-card -->
          </div> <!-- End owner-collab-group -->
        </div> <!-- End project-body -->
      </div> <!-- End v-if="project" -->

      <!-- Fallback if project is null after loading/error checks -->
      <div v-else class="error-message">
        Project data could not be displayed.
      </div>
    </div> <!-- End v-else (main content wrapper) -->

    <!-- Modals -->
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
            <button type="submit" class="btn btn-success" :disabled="submitting">
              {{ submitting ? 'Saving...' : 'Save Update' }}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  </div> <!-- End .project-details -->
</template>

<style scoped>
/* Main container */
.project-details {
  width: 100%;
  min-height: 100vh;
  background: var(--color-background);
  padding: 1rem;
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
  grid-template-columns: 300px 1fr 250px; /* Increased from 250px to 300px for files column */
  gap: 1.5rem;
}

/* Left Column - Files */
.project-files {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.files-card,
.project-tasks,
.updates-card,
.owner-card,
.collaborators-card,
.description-card,
.actions-card {
  background: var(--gradient-winter);
  border-radius: var(--border-radius-large);
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 12px var(--color-shadow);
  font-family: var(--font-mono);
}

/* Project info section spacing */
.project-info > * {
  margin-bottom: 2rem;
}

.project-info > *:last-child {
  margin-bottom: 0;
}

/* Add gap between project tasks and updates */
.project-tasks,
.actions-card,
.description-card {
  margin-bottom: 2rem;
}

/* Updates section specific spacing */
.updates-card {
  margin-top: 2rem;
}

/* Style file items with winter gradient */
:deep(.file-item) {
  background: var(--gradient-winter);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

:deep(.file-item:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--color-shadow);
}

.files-card .card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.2rem;
  font-size: 1.1rem;
  color: var(--color-text);
  font-weight: 600;
}

.files-card .card-header .icon {
  font-size: 1.2rem;
}

/* Middle Column - Info, Actions, Updates */
.project-info {
  display: flex;
  flex-direction: column;
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

/* Right Column - Owner and Collaborators */
.owner-collab-group {
  display: flex;
  flex-direction: column;
}

.collaborators-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Modals - Basic Styling */
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
  background: var(--gradient-winter);
  padding: 2rem;
  border-radius: var(--border-radius-large);
  box-shadow: var(--shadow-elevation-high);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--color-border);
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
}

.role-select {
  padding: 0.4rem 2rem 0.4rem 0.8rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
  background-color: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.9rem;
  min-width: 100px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.8rem center;
  background-size: 12px;
  transition: all 0.2s ease;
}

.role-select:hover {
  border-color: var(--color-primary);
  background-color: var(--color-background);
}

.role-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-soft);
}

.role-select option {
  background-color: var(--color-background);
  color: var(--color-text);
  padding: 8px;
}

.role-select:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background-color: var(--color-background-mute);
}

.role-spinner {
  margin-left: -0.5rem;
  margin-right: 0.5rem;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--color-danger);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.4rem;
  line-height: 1;
}

.remove-btn:hover {
  color: var(--color-danger-hover);
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.role-badge {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--border-radius-small);
  font-weight: 500;
}
.role-badge.owner {
  background-color: var(--color-accent-secondary-soft);
  color: var(--color-accent-secondary);
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1.1rem;
  line-height: 1;
  border-radius: var(--border-radius-small);
  transition: background-color 0.2s ease, color 0.2s ease;
  color: var(--color-text-secondary);
}

.icon-btn:hover {
  background-color: var(--color-background-mute);
}

.icon-btn.remove-btn:hover {
  color: var(--color-danger);
  background-color: var(--color-danger-soft);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: transparent;
}

.spinner-small.role-spinner {
  margin-left: 0;
}

.role-badge.owner {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  background-color: transparent;
  color: var(--color-warning);
  padding: 0.25rem 0;
  font-weight: 600;
}

/* 3. Action Button Coloring */
.action-button {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
  text-align: center;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.action-button:hover {
  transform: translateY(-1px);
}

.action-button.btn-edit {
  background-color: var(--color-primary);
  color: var(--color-button-text, white);
}
.action-button.btn-edit:hover {
  background-color: var(--color-primary-hover);
}

.action-button.btn-update {
  background-color: var(--color-success);
  color: var(--color-button-text, white);
}
.action-button.btn-update:hover {
  background-color: var(--color-success-hover);
}

/* 4. Card Rounding (Restored) */
.updates-card,
.owner-card,
.collaborators-card {
  border-radius: var(--border-radius-large); /* Removed !important */
  /* overflow: hidden; */ /* Optional: Consider adding if content overflows */
}

.updates-list .update-item,
.collaborators-list .collaborator-item,
.owner-card .collaborator-item { 
  border-radius: var(--border-radius); /* Ensure inner items keep smaller radius */
}

/* Responsive Adjustments */
@media (max-width: 1024px) {
  .project-body {
    grid-template-columns: 280px 1fr 220px;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .project-body {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .project-files,
  .project-info,
  .owner-collab-group {
    width: 100%;
  }
}

.loading-message,
.error-message {
  text-align: center;
  padding: 4rem 2rem;
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}

.error-message {
  color: var(--color-danger);
}

.updates-empty,
.owner-missing,
.collabs-empty {
   padding: 1rem 0;
   font-style: italic;
}

.owner-missing {
   /* Adjust padding if needed */
   padding-left: 0.75rem; 
}

.collabs-empty {
  /* Adjust padding if needed */
   padding: 0.75rem;
}

.owner-display {
  /* Use same class as collaborator-item for consistency or make specific */
  margin-bottom: 0; /* Remove extra margin if needed */
}

.update-avatar img,
.update-avatar .avatar-placeholder,
.collaborator-avatar img,
.collaborator-avatar span /* Target both img and span placeholder */ {
  width: 40px; /* Ensure width */
  height: 40px; /* Ensure height is equal to width */
  border-radius: 50%; /* Keep this */
  display: flex; /* Use flex for centering placeholder text */
  align-items: center;
  justify-content: center;
  background-color: var(--color-background-mute); /* Fallback background */
  color: var(--color-text); /* Placeholder text color */
  font-weight: 600;
  object-fit: cover; /* Prevent image distortion */
  overflow: hidden; /* Hide any potential overflow */
}

/* Remove redundant/potentially conflicting separate rules */
/* .update-avatar .avatar-placeholder { ... } */
/* .collaborator-avatar span { ... } */

.update-content {
  /* ... existing styles ... */
}

.updates-card {
  @apply rounded-lg shadow p-6;
}

.todos-card {
  @apply rounded-lg shadow p-6 mb-6;
}

.updates-empty {
  padding: 1rem 0;
  font-style: italic;
}

.project-tasks,
.updates-card {
  margin-bottom: 1.5rem;
}

/* Remove the added file list styles */
.files-list,
.file-item,
.file-info,
.filename-container,
.file-details,
.file-name,
.file-date,
.file-actions-container,
.file-meta,
.file-size,
.file-actions,
.action-btn,
.download-btn,
.delete-btn {
  /* Reset all added styles */
}

</style> 