<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFileStorage } from '../../composables/useFileStorage';
import { useAuth } from '../../composables/useAuth';
import { supabase } from '../../supabase/config';

const props = defineProps({
  files: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  viewMode: {
    type: String,
    default: 'grid' // 'grid' or 'list'
  },
  layout: {
    type: String,
    default: 'standard' // 'standard', 'compact', or 'list'
  },
  allowDelete: {
    type: Boolean,
    default: false
  },
  emptyMessage: {
    type: String,
    default: 'No files found'
  },
  isCollapsible: {
    type: Boolean,
    default: true
  },
  requireAuth: {
    type: Boolean,
    default: true
  }
});

const { downloadFile } = useFileStorage();
const { user } = useAuth();

const emit = defineEmits(['delete', 'preview', 'download']);

const isAuthorized = computed(() => {
  if (!props.requireAuth) return true;
  return !!user.value;
});

const handleDownload = async (file) => {
  if (!isAuthorized.value) {
    console.warn('Unauthorized download attempt');
    return;
  }
  emit('download', file);
};

const handleDelete = (file) => {
  if (!isAuthorized.value) {
    console.warn('Unauthorized delete attempt');
    return;
  }
  emit('delete', file);
};

const handlePreview = (file) => {
  if (!isAuthorized.value) {
    console.warn('Unauthorized preview attempt');
    return;
  }
  emit('preview', file);
};

// File type detection and icon mapping
const getFileType = (file) => {
  const fileName = file.name || file.filename || '';
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const typeMap = {
    // Images
    'jpg': { type: 'image', icon: '📷', color: '#3b82f6' },
    'jpeg': { type: 'image', icon: '📷', color: '#3b82f6' },
    'png': { type: 'image', icon: '📷', color: '#3b82f6' },
    'gif': { type: 'image', icon: '📷', color: '#3b82f6' },
    'svg': { type: 'image', icon: '📷', color: '#3b82f6' },
    'webp': { type: 'image', icon: '📷', color: '#3b82f6' },
    
    // Documents
    'pdf': { type: 'document', icon: '📕', color: '#ef4444' },
    'doc': { type: 'document', icon: '📘', color: '#2563eb' },
    'docx': { type: 'document', icon: '📘', color: '#2563eb' },
    'txt': { type: 'document', icon: '📝', color: '#9ca3af' },
    'rtf': { type: 'document', icon: '📝', color: '#9ca3af' },
    
    // Spreadsheets
    'xls': { type: 'spreadsheet', icon: '📊', color: '#22c55e' },
    'xlsx': { type: 'spreadsheet', icon: '📊', color: '#22c55e' },
    'csv': { type: 'spreadsheet', icon: '📊', color: '#22c55e' },
    
    // Presentations
    'ppt': { type: 'presentation', icon: '📙', color: '#f97316' },
    'pptx': { type: 'presentation', icon: '📙', color: '#f97316' },
    
    // Archives
    'zip': { type: 'archive', icon: '🗜️', color: '#8b5cf6' },
    'rar': { type: 'archive', icon: '🗜️', color: '#8b5cf6' },
    '7z': { type: 'archive', icon: '🗜️', color: '#8b5cf6' },
    'tar': { type: 'archive', icon: '🗜️', color: '#8b5cf6' },
    'gz': { type: 'archive', icon: '🗜️', color: '#8b5cf6' },
    
    // Code files
    'html': { type: 'code', icon: '💻', color: '#f59e0b' },
    'css': { type: 'code', icon: '💻', color: '#3b82f6' },
    'js': { type: 'code', icon: '💻', color: '#facc15' },
    'jsx': { type: 'code', icon: '💻', color: '#38bdf8' },
    'ts': { type: 'code', icon: '💻', color: '#3178c6' },
    'tsx': { type: 'code', icon: '💻', color: '#38bdf8' },
    'json': { type: 'code', icon: '💻', color: '#facc15' },
    'xml': { type: 'code', icon: '💻', color: '#9ca3af' },
    
    // Audio
    'mp3': { type: 'audio', icon: '🎵', color: '#ec4899' },
    'wav': { type: 'audio', icon: '🎵', color: '#ec4899' },
    'ogg': { type: 'audio', icon: '🎵', color: '#ec4899' },
    
    // Video
    'mp4': { type: 'video', icon: '🎬', color: '#e11d48' },
    'webm': { type: 'video', icon: '🎬', color: '#e11d48' },
    'mov': { type: 'video', icon: '🎬', color: '#e11d48' },
    'avi': { type: 'video', icon: '🎬', color: '#e11d48' }
  };
  
  return typeMap[extension] || { type: 'unknown', icon: '📄', color: '#9ca3af' };
};

const isImage = (file) => {
  const fileType = getFileType(file);
  return fileType.type === 'image' || 
         file.type?.startsWith('image/') || 
         file.mimetype?.startsWith('image/');
};

const formatFileSize = (file) => {
  // Use size_bytes from the database
  const bytes = file.size_bytes || 0;
  
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Ensure we don't go beyond the array bounds
  const sizeIndex = Math.min(i, sizes.length - 1);
  const size = bytes / Math.pow(k, sizeIndex);
  
  // Format to 1 decimal place for better readability
  return `${size.toFixed(1)} ${sizes[sizeIndex]}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const gridClasses = computed(() => {
  const classes = [props.layout];
  if (props.viewMode === 'grid') {
    classes.push('grid-view');
  } else {
    classes.push('list-view');
  }
  return classes.join(' ');
});

const isCollapsed = ref(false);
const previewFile = ref(null);
const isPreviewModalOpen = ref(false);
const previewUrl = ref(null);
const previewError = ref(null);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const getSignedUrl = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from('project-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) throw error;
    return data.signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return null;
  }
};

const openPreview = async (file) => {
  if (!file || !file.file_path) {
    previewError.value = 'Invalid file information';
    return;
  }

  try {
    previewError.value = null;
    previewFile.value = file;
    isPreviewModalOpen.value = true;
    
    // Get signed URL for preview
    const signedUrl = await getSignedUrl(file.file_path);
    if (signedUrl) {
      previewUrl.value = signedUrl;
    } else {
      previewError.value = 'Failed to load file preview';
    }
  } catch (err) {
    console.error('Error opening preview:', err);
    previewError.value = 'Failed to open preview';
  }
};

const closePreview = () => {
  previewFile.value = null;
  previewUrl.value = null;
  previewError.value = null;
  isPreviewModalOpen.value = false;
};

// Add method to check if file is previewable
const isPreviewable = (file) => {
  if (!file) return false;
  
  const fileType = getFileType(file);
  return fileType.type === 'image' || 
         fileType.type === 'document' || 
         fileType.type === 'video' || 
         fileType.type === 'audio';
};
</script>

<template>
  <div class="files-grid">
    <!-- Collapsible Header -->
    <div v-if="isCollapsible" class="files-header" @click="toggleCollapse">
      <div class="header-left">
        <span class="header-icon">📁</span>
        <span class="header-title">Files</span>
        <span class="file-count">({{ files.length }})</span>
      </div>
      <span class="collapse-icon">{{ isCollapsed ? '+' : '−' }}</span>
    </div>

    <!-- Files Content -->
    <div v-show="!isCollapsed" class="files-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading files...</span>
      </div>
      
      <div v-else-if="!isAuthorized" class="unauthorized-state">
        <p>You need to be logged in to view files.</p>
      </div>
      
      <div v-else-if="!files.length" class="empty-state">
        {{ emptyMessage }}
      </div>
      
      <div v-else class="files-list">
        <div 
          v-for="file in files" 
          :key="file.id" 
          class="file-item"
        >
          <div class="file-type-icon">
            {{ getFileType(file).icon }}
          </div>
          
          <div class="file-info">
            <div class="file-details">
              <span 
                class="file-name" 
                @click="openPreview(file)"
                :class="{ 'previewable': isPreviewable(file) }"
              >
                {{ file.name }}
              </span>
              <div class="file-meta">
                <span class="file-size">{{ formatFileSize(file) }}</span>
                <span v-if="file.created_at" class="file-date">
                  {{ new Date(file.created_at).toLocaleDateString() }}
                </span>
                <slot name="file-meta" :file="file"></slot>
              </div>
            </div>
          </div>
          
          <div class="file-actions">
            <button 
              class="action-btn download-btn" 
              @click="handleDownload(file)" 
              title="Download"
            >
              ⬇️
            </button>
            <button 
              v-if="allowDelete"
              class="action-btn delete-btn" 
              @click="handleDelete(file)" 
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <div v-if="isPreviewModalOpen && previewFile" class="preview-modal">
      <div class="preview-overlay" @click="closePreview"></div>
      <div class="preview-content">
        <div class="preview-header">
          <div class="preview-title">
            <span class="preview-icon">{{ getFileType(previewFile).icon }}</span>
            <h3>{{ previewFile.name }}</h3>
          </div>
          <button class="close-btn" @click="closePreview">×</button>
        </div>
        
        <div class="preview-body">
          <div v-if="previewError" class="preview-error">
            {{ previewError }}
          </div>
          
          <!-- Image Preview -->
          <img 
            v-else-if="getFileType(previewFile).type === 'image' && previewUrl" 
            :src="previewUrl" 
            :alt="previewFile.name" 
            class="preview-image"
            @error="previewError = 'Failed to load image'"
          />
          
          <!-- PDF Preview -->
          <iframe 
            v-else-if="getFileType(previewFile).type === 'document' && previewUrl && previewFile.name.toLowerCase().endsWith('.pdf')" 
            :src="previewUrl" 
            class="preview-iframe"
          ></iframe>
          
          <!-- Video Preview -->
          <video 
            v-else-if="getFileType(previewFile).type === 'video' && previewUrl" 
            :src="previewUrl" 
            controls 
            class="preview-video"
            @error="previewError = 'Failed to load video'"
          ></video>
          
          <!-- Audio Preview -->
          <audio 
            v-else-if="getFileType(previewFile).type === 'audio' && previewUrl" 
            :src="previewUrl" 
            controls 
            class="preview-audio"
            @error="previewError = 'Failed to load audio'"
          ></audio>
          
          <!-- No Preview Available -->
          <div v-else class="no-preview">
            <div class="no-preview-icon">{{ getFileType(previewFile).icon }}</div>
            <p>Preview not available for this file type</p>
            <div class="file-info">
              <p>Type: {{ getFileType(previewFile).type }}</p>
              <p>Size: {{ formatFileSize(previewFile) }}</p>
              <p v-if="previewFile.created_at">Uploaded: {{ formatDate(previewFile.created_at) }}</p>
            </div>
          </div>
        </div>
        
        <div class="preview-footer">
          <button 
            class="download-btn" 
            @click="handleDownload(previewFile)"
            v-if="previewFile.file_path"
          >
            Download File
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.files-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: transparent;
  border-radius: 8px;
  overflow: hidden;
}

.files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: black;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.files-header:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text);
}

.file-count {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.collapse-icon {
  font-size: 20px;
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.files-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: black;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.file-item:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
}

.file-type-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-black);
  border-radius: 8px;
  font-size: 20px;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.file-name:hover {
  color: var(--color-primary);
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}

.file-date {
  color: var(--color-text-secondary);
}

.file-size {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-black);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
}

.action-btn:hover {
  background: var(--color-black-80);
  transform: translateY(-1px);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--color-text-secondary);
  background: var(--gradient-winter);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-black-80);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.unauthorized-state {
  text-align: center;
  padding: 48px;
  color: var(--color-text-secondary);
  background: var(--gradient-winter);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}

.preview-content {
  position: relative;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  background: var(--color-black);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-icon {
  font-size: 24px;
}

.preview-title h3 {
  margin: 0;
  font-size: 18px;
  color: var(--color-text);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.1);
}

.preview-body {
  flex: 1;
  overflow: auto;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: 8px;
}

.preview-iframe {
  width: 100%;
  height: 60vh;
  border: none;
  border-radius: 8px;
}

.preview-video {
  max-width: 100%;
  max-height: 60vh;
  border-radius: 8px;
}

.preview-audio {
  width: 100%;
  max-width: 400px;
}

.no-preview {
  text-align: center;
  padding: 32px;
}

.no-preview-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.file-info {
  margin-top: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-align: left;
}

.file-info p {
  margin: 8px 0;
  color: var(--color-text-secondary);
}

.preview-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
}

.download-btn {
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.download-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.file-name.previewable {
  cursor: pointer;
  color: var(--color-primary);
}

.file-name.previewable:hover {
  text-decoration: underline;
}

.preview-error {
  color: var(--color-error);
  text-align: center;
  padding: 16px;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 8px;
  margin: 16px;
}
</style> 