<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFileStorage } from '../../composables/useFileStorage';

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
  }
});

const { downloadFile } = useFileStorage();

const emit = defineEmits(['delete', 'preview', 'download']);

const handleDownload = async (file) => {
  emit('download', file);
};

const handleDelete = (file) => {
  emit('delete', file);
};

const handlePreview = (file) => {
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

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
</script>

<template>
  <div class="files-grid-container">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading files...</p>
    </div>
    
    <div v-else-if="files.length === 0" class="empty-state">
      <p>{{ emptyMessage }}</p>
    </div>
    
    <div v-else :class="['files-grid', gridClasses]">
      <!-- Standard/Grid View -->
      <div v-for="file in files" :key="file.id" class="file-item">
        <div class="file-info">
          <div class="filename-container">
            <div class="file-details">
              <h3 class="file-name" :title="file.name || file.filename">{{ file.name || file.filename }}</h3>
              <span class="file-date">{{ formatDate(file.created_at) }}</span>
            </div>
          </div>
        </div>
        
        <div class="file-actions-container">
          <div class="file-meta">
            <span class="file-size">{{ formatFileSize(file.size || file.size_bytes) }}</span>
          </div>
          <div class="file-actions">
            <button class="action-btn download-btn" @click.stop="handleDownload(file)" title="Download">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button v-if="allowDelete" class="action-btn delete-btn" @click.stop="handleDelete(file)" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.files-grid-container {
  width: 100%;
  padding: 0.5rem 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--accent-blue);
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.files-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.grid-view {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.list-view {
  grid-template-columns: 1fr;
}

/* Standard / Grid Layout */
.file-item {
  background-color: var(--color-black-90);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  padding: 0.75rem;
  gap: 1rem;
  height: auto;
  min-height: 60px;
}

.file-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  background-color: var(--color-black-80);
}

.file-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: var(--color-black-80);
  border-radius: 6px;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0; /* Ensures text truncation works */
}

.file-details {
  display: flex;
  flex-direction: column;
  min-width: 0; /* Ensures text truncation works */
  gap: 0.2rem;
  position: relative; /* Added for absolute positioning context */
}

.file-name {
  font-size: 0.95rem;
  font-weight: 500;
  margin: 0;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  cursor: pointer;
}

.file-name::after {
  content: attr(title);
  display: none;
  position: fixed;
  background: var(--color-black-90);
  color: var(--color-text);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  z-index: 1000;
  transform: translateY(-100%);
  margin-top: -8px;
  border: 1px solid var(--color-border);
  backdrop-filter: blur(8px);
}

.file-name:hover::after {
  display: block;
}

.file-date {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 0.2rem;
}

.filename-container {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.file-actions-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: auto;
}

.file-meta {
  display: flex;
  align-items: center;
}

.file-size {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  background: var(--color-black-80);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  white-space: nowrap;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background-color: var(--color-black-80);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.action-btn:hover {
  background-color: var(--color-black-70);
  color: var(--color-text);
}

.download-btn:hover {
  color: var(--accent-blue);
}

.delete-btn:hover {
  color: var(--color-danger);
}

/* Compact Layout Modifications */
.compact .file-item {
  flex-direction: row;
  align-items: center;
  height: auto;
  min-height: 50px;
  padding: 0.5rem;
}

.compact .file-preview {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.compact .file-type-icon {
  position: relative;
  padding: 0;
}

.compact .file-type-icon .icon {
  font-size: 1.25rem;
  margin: 0;
}

.compact .file-type-icon .extension {
  display: none;
}

.compact .file-info {
  flex: 1;
  padding: 0;
}

.compact .file-name {
  margin: 0;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.compact .file-meta {
  margin-top: 0.25rem;
  border: none;
  padding: 0;
}

.compact .file-actions {
  background: none;
  border: none;
  padding: 0;
}

/* List Layout Modifications */
.list .file-item {
  flex-direction: row;
  align-items: center;
  padding: 0.75rem;
  height: auto;
  min-height: 60px;
}

.list .file-preview {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  margin-right: 1rem;
  flex-shrink: 0;
}

.list .file-info {
  flex: 1;
  padding: 0;
}

.list .file-meta {
  margin-top: 0.35rem;
}

.list .file-actions {
  background: none;
  border: none;
  padding: 0;
}

@media (max-width: 640px) {
  .grid-view {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
  
  .file-preview {
    height: 120px;
  }
  
  .file-type-icon .icon {
    font-size: 2.5rem;
  }
}

.visible-name {
  display: block;
  margin: 0.75rem 0.75rem 0.25rem;
  padding: 0.25rem;
  font-size: 0.95rem;
  font-weight: 500;
  text-align: center;
  color: var(--text-primary);
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  z-index: 5;
}

.compact .visible-name {
  display: none;
}

.list .visible-name {
  text-align: left;
  margin: 0 0 0.25rem 0;
  background: none;
  padding: 0;
}

.file-actions-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.file-meta {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.file-size {
  display: block;
}
</style> 