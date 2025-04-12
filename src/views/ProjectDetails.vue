<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProjects } from '../composables/useProjects'
import { useUserSearch } from '../composables/useUserSearch'
import { useFileStorage } from '../composables/useFileStorage'
import { supabase } from '../supabase/config'
import FilesGrid from '../components/ui/FilesGrid.vue'
import ProjectSideNav from '../components/project/ProjectSideNav.vue'
import Pinboard from '../components/project/Pinboard.vue'
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
const activeSection = ref('files')

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

// Add todo state
const isAddTodoModalOpen = ref(false)
const todoData = ref({
  title: '',
  description: '',
  status: 'pending'
})
const todoError = ref(null)

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

const handleSectionChange = (section) => {
  activeSection.value = section
}

const openAddTodoModal = () => {
  todoData.value = {
    title: '',
    description: '',
    status: 'pending'
  }
  todoError.value = null
  isAddTodoModalOpen.value = true
}

const closeAddTodoModal = () => {
  isAddTodoModalOpen.value = false
}

const submitTodo = async () => {
  if (submitting.value) return
  
  submitting.value = true
  todoError.value = null
  
  try {
    // Validate input
    if (!todoData.value.title.trim()) {
      todoError.value = 'Please provide a title for the task'
      submitting.value = false
      return
    }
    
    // Create todo record
    const todoPayload = {
      project_id: projectId.value,
      title: todoData.value.title,
      description: todoData.value.description,
      status: todoData.value.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.value?.id
    }
    
    const { error: todoError } = await supabase
      .from(TABLES.PROJECT_TODOS)
      .insert(todoPayload)
    
    if (todoError) throw todoError
    
    // Refresh project data
    await fetchProject()
    
    // Reset and close modal
    closeAddTodoModal()
  } catch (err) {
    console.error('Error creating todo:', err)
    todoError.value = `Failed to create task: ${err.message || 'Unknown error'}`
  } finally {
    submitting.value = false
  }
}

const toggleTodoStatus = async (todo) => {
  try {
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
    
    const { error } = await supabase
      .from(TABLES.PROJECT_TODOS)
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', todo.id)
    
    if (error) throw error
    
    // Update local state
    if (project.value?.todos) {
      const todoIndex = project.value.todos.findIndex(t => t.id === todo.id)
      if (todoIndex !== -1) {
        project.value.todos[todoIndex].status = newStatus
      }
    }
  } catch (err) {
    console.error('Error updating todo status:', err)
    error.value = `Failed to update task status: ${err.message}`
  }
}

const deleteTodo = async (todoId) => {
  try {
    const { error } = await supabase
      .from(TABLES.PROJECT_TODOS)
      .delete()
      .eq('id', todoId)
    
    if (error) throw error
    
    // Update local state
    if (project.value?.todos) {
      project.value.todos = project.value.todos.filter(t => t.id !== todoId)
    }
  } catch (err) {
    console.error('Error deleting todo:', err)
    error.value = `Failed to delete task: ${err.message}`
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
        @section-change="handleSectionChange"
        @delete-project="openDeleteConfirm"
      />
      <div class="pinboard-container">
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
        @section-change="handleSectionChange"
        @delete-project="openDeleteConfirm"
      />

      <div class="project-content">
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

          <!-- Project Info -->
          <div class="project-info">
            <!-- Description Card -->
            <div class="info-card description-card">
              <h3>About this Project</h3>
              <p v-if="project.description" class="project-description">
                {{ project.description }}
              </p>
              <p v-else class="text-secondary">
                No description provided.
              </p>
            </div>

            <!-- Todos Card -->
            <div class="info-card todos-card">
              <div class="card-header">
                <h3>Project Tasks</h3>
                <button class="btn btn-primary btn-sm" @click="openAddTodoModal">
                  + Task
                </button>
              </div>
              <div v-if="!project.todos || project.todos.length === 0" class="empty-state">
                No tasks yet.
              </div>
              <div v-else class="todos-list">
                <div v-for="todo in project.todos" :key="todo.id" class="todo-item">
                  <div class="todo-checkbox">
                    <input 
                      type="checkbox" 
                      :checked="todo.status === 'completed'"
                      @change="toggleTodoStatus(todo)"
                    >
                  </div>
                  <div class="todo-content" :class="{ completed: todo.status === 'completed' }">
                    <div class="todo-title">{{ todo.title }}</div>
                    <div v-if="todo.description" class="todo-description">
                      {{ todo.description }}
                    </div>
                  </div>
                  <button 
                    class="todo-delete"
                    @click="deleteTodo(todo.id)"
                    title="Delete task"
                  >
                    ×
                  </button>
                </div>
              </div>
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
              <FilesGrid
                :files="project.files || []"
                :loading="loading"
                :allow-delete="isOwner"
                empty-message="No files uploaded yet."
                @delete="handleFileDeleted"
                @download="handleFileDownload"
              />
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
            <textarea
              id="update-description"
              v-model="updateData.description"
              placeholder="Describe the files you're uploading..."
              rows="4"
            ></textarea>
          </div>
          <div class="form-group">
            <label>Upload Files</label>
            <div class="file-upload-container">
              <input
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

    <!-- Add Todo Modal -->
    <div v-if="isAddTodoModalOpen" class="modal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Add Task</h2>
          <button class="close-button" @click="closeAddTodoModal">×</button>
        </div>
        <form @submit.prevent="submitTodo" class="todo-form">
          <div class="form-group">
            <label for="todo-title">Task Title</label>
            <input
              id="todo-title"
              v-model="todoData.title"
              type="text"
              required
              placeholder="What needs to be done?"
            >
          </div>
          <div class="form-group">
            <label for="todo-description">Description (Optional)</label>
            <textarea
              id="todo-description"
              v-model="todoData.description"
              rows="3"
              placeholder="Add any additional details..."
            ></textarea>
          </div>
          <div v-if="todoError" class="error-message">
            {{ todoError }}
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeAddTodoModal">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Adding...' : 'Add Task' }}
            </button>
          </div>
        </form>
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
  min-height: calc(100vh - 64px);
  width: 100%;
  position: relative;
}

.pinboard-view {
  background: var(--gradient-winter);
  position: fixed;
  top: 64px;
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
  background: var(--gradient-winter);
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

/* Todos List Styles */
.todos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--color-black);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.todo-checkbox {
  padding-top: 4px;
}

.todo-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-content.completed {
  opacity: 0.7;
}

.todo-content.completed .todo-title {
  text-decoration: line-through;
}

.todo-title {
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
}

.todo-description {
  font-size: 14px;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
}

.todo-delete {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1;
}

.todo-delete:hover {
  color: var(--color-danger);
  background: var(--color-black-80);
}

/* Todo Form Styles */
.todo-form input[type="text"] {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-black-90);
  color: var(--color-text);
}

.todo-form input[type="text"]:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* Responsive Design */
@media (max-width: 768px) {
  .project-layout {
    flex-direction: column;
  }

  .project-main {
    margin-left: 0;
    padding: 16px;
  }
}
</style> 