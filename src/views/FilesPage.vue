<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useFileStorage } from '../composables/useFileStorage'
import FilesGrid from '../components/ui/FilesGrid.vue'
import { supabase } from '../supabase/config'

const TABLES = {
  PROJECT_FILES: 'project_files',
  PROJECTS: 'projects'
}

const { user } = useAuth()
const { updateMissingFileUrls, deleteFile, downloadFile } = useFileStorage()

// State management
const loading = ref(true)
const error = ref(null)
const files = ref([])
const projects = ref({})  // To store project information
const activeTab = ref('all')  // 'all', 'owned', 'shared'
const searchQuery = ref('')
const sortOrder = ref('newest')  // 'newest', 'oldest', 'name', 'size'
const viewMode = ref('list') // 'grid' or 'list'
const previewFile = ref(null)
const previewModalOpen = ref(false)

// Fetch user's files
const fetchFiles = async () => {
  if (!user.value) return
  
  loading.value = true
  error.value = null
  
  try {
    // 1. Fetch files
    const { data, error: filesError } = await supabase
      .from(TABLES.PROJECT_FILES)
      .select(`
        *,
        project:${TABLES.PROJECTS}(id, name, owner_id, is_public)
      `)
      .order('created_at', { ascending: false })
    
    if (filesError) throw filesError
    
    files.value = data || []
    
    // 2. Ensure all files have URLs
    const filesToUpdate = files.value.filter(file => !file.url && file.file_path)
    if (filesToUpdate.length > 0) {
      await updateMissingFileUrls(filesToUpdate)
      
      // Refresh files
      const { data: updatedData } = await supabase
        .from(TABLES.PROJECT_FILES)
        .select(`
          *,
          project:${TABLES.PROJECTS}(id, name, owner_id, is_public)
        `)
        .order('created_at', { ascending: false })
      
      if (updatedData) {
        files.value = updatedData
      }
    }
    
    // 3. Build projects object for quick lookup
    const projectMap = {}
    files.value.forEach(file => {
      if (file.project && !projectMap[file.project.id]) {
        projectMap[file.project.id] = file.project
      }
    })
    
    projects.value = projectMap
  } catch (err) {
    console.error('Error fetching files:', err)
    error.value = 'Failed to load files'
  } finally {
    loading.value = false
  }
}

// Filter files based on active tab
const filteredFiles = computed(() => {
  if (!user.value) return []
  
  let filtered = [...files.value]
  
  // Filter by tab
  if (activeTab.value === 'owned') {
    filtered = filtered.filter(file => 
      file.project && file.project.owner_id === user.value.id
    )
  } else if (activeTab.value === 'shared') {
    filtered = filtered.filter(file => 
      file.project && file.project.owner_id !== user.value.id
    )
  }
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(file => 
      file.name.toLowerCase().includes(query) || 
      (file.project && file.project.name.toLowerCase().includes(query))
    )
  }
  
  // Apply sorting
  if (sortOrder.value === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else if (sortOrder.value === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  } else if (sortOrder.value === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortOrder.value === 'size') {
    filtered.sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0))
  }
  
  return filtered
})

// File management methods
const handleFileDeleted = async (file) => {
  try {
    const success = await deleteFile(file.file_path, file.id)
    
    if (success) {
      files.value = files.value.filter(f => f.id !== file.id)
    } else {
      error.value = 'Failed to delete file'
    }
  } catch (err) {
    console.error('Error deleting file:', err)
    error.value = 'Failed to delete file'
  }
}

const handlePreview = (file) => {
  previewFile.value = file
  previewModalOpen.value = true
}

const closePreview = () => {
  previewModalOpen.value = false
  previewFile.value = null
}

const getFileProjectName = (file) => {
  return file.project ? file.project.name : 'Unknown Project'
}

// Add a function to handle file downloads
const handleFileDownload = async (file) => {
  try {
    if (!file || !file.file_path) {
      error.value = 'Invalid file information';
      return;
    }
    
    // Use the file_path to download the file
    await downloadFile(file.file_path);
  } catch (err) {
    console.error('Error downloading file:', err);
    error.value = 'Failed to download the file';
  }
}

// Initialize
onMounted(async () => {
  if (user.value) {
    await fetchFiles()
  }
})
</script>

<template>
  <div class="files-page container">
    <div class="page-header">
      <h1>My Files</h1>
      <div class="controls">
        <div class="search-bar">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search files..."
            class="search-input"
          />
        </div>
        <div class="view-controls">
          <button 
            :class="['view-btn', { active: viewMode === 'grid' }]" 
            @click="viewMode = 'grid'"
            title="Grid View"
          >
            ◫
          </button>
          <button 
            :class="['view-btn', { active: viewMode === 'list' }]" 
            @click="viewMode = 'list'"
            title="List View"
          >
            ≡
          </button>
        </div>
        <div class="sort-controls">
          <label for="sort-select">Sort by:</label>
          <select id="sort-select" v-model="sortOrder" class="sort-select">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="tabs">
      <button 
        :class="['tab-btn', { active: activeTab === 'all' }]" 
        @click="activeTab = 'all'"
      >
        All Files
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'owned' }]" 
        @click="activeTab = 'owned'"
      >
        My Projects
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'shared' }]" 
        @click="activeTab = 'shared'"
      >
        Shared With Me
      </button>
    </div>
    
    <div class="content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading files...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        {{ error }}
      </div>
      
      <div v-else-if="filteredFiles.length === 0" class="empty-state">
        <p v-if="searchQuery">No files match your search query.</p>
        <p v-else-if="activeTab === 'all'">You don't have any files yet.</p>
        <p v-else-if="activeTab === 'owned'">You don't have any files in your projects.</p>
        <p v-else>You don't have any files in shared projects.</p>
      </div>
      
      <FilesGrid 
        :files="filteredFiles"
        :loading="loading"
        :layout="viewMode === 'grid' ? 'standard' : 'list'"
        :viewMode="viewMode"
        :allowDelete="true"
        emptyMessage="No files found"
        @delete="handleFileDeleted"
        @preview="handlePreview"
        @download="handleFileDownload"
        class="files-grid-improved"
      />
    </div>
    
    <!-- File Preview Modal -->
    <div v-if="previewModalOpen && previewFile" class="preview-modal">
      <div class="preview-overlay" @click="closePreview"></div>
      <div class="preview-content">
        <div class="preview-header">
          <h3>{{ previewFile.name }}</h3>
          <button class="close-btn" @click="closePreview">×</button>
        </div>
        <div class="preview-body">
          <img 
            v-if="previewFile.url && /\.(jpe?g|png|gif|webp)$/i.test(previewFile.name)" 
            :src="previewFile.url" 
            :alt="previewFile.name" 
            class="preview-image"
          />
          <iframe 
            v-else-if="previewFile.url && /\.pdf$/i.test(previewFile.name)" 
            :src="previewFile.url" 
            class="preview-iframe"
          ></iframe>
          <div v-else class="no-preview">
            <p>Preview not available for this file type</p>
            <p class="file-meta">
              {{ previewFile.name }} ({{ formatFileSize(previewFile.size_bytes) }})
            </p>
          </div>
        </div>
        <div class="preview-footer">
          <a 
            :href="previewFile.url" 
            download 
            class="download-btn"
            v-if="previewFile.url"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.files-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-input {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--primary-dark);
  background: var(--secondary-dark);
  color: var(--text-primary);
  width: 250px;
}

.view-controls {
  display: flex;
  gap: 0.5rem;
}

.view-btn {
  background: var(--secondary-dark);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 1.2rem;
  line-height: 1;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-btn.active {
  background: var(--accent-blue);
  color: white;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--primary-dark);
  background: var(--secondary-dark);
  color: var(--text-primary);
}

.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--primary-dark);
  padding-bottom: 0.5rem;
}

.tab-btn {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  font-weight: 500;
}

.tab-btn.active {
  background: var(--primary-dark);
  color: var(--text-primary);
}

.loading-state,
.empty-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-container {
  position: relative;
}

.file-project {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.project-link {
  color: var(--accent-blue);
  text-decoration: none;
}

.project-link:hover {
  text-decoration: underline;
}

.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
}

.preview-content {
  position: relative;
  background: var(--primary-dark);
  border-radius: 8px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.preview-header {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.preview-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.preview-body {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  max-height: calc(90vh - 120px);
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.no-preview {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.file-meta {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.preview-footer {
  padding: 1rem;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--border-color);
}

.download-btn {
  padding: 0.5rem 1rem;
  background: var(--accent-blue);
  color: white;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.download-btn:hover {
  background-color: #2c7be5;
}
</style> 