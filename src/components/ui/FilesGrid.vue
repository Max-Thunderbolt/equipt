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
  },
  isCollapsible: {
    type: Boolean,
    default: true
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

const isCollapsed = ref(false);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
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
              <span class="file-name" @click="handlePreview(file)">
                {{ file.name }}
              </span>
              <div class="file-meta">
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <span v-if="file.created_at" class="file-date">
                  {{ new Date(file.created_at).toLocaleDateString() }}
                </span>
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
  </div>
</template>

<style scoped>
.files-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--color-black-95);
  border-radius: 8px;
  overflow: hidden;
}

.files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--color-black-90);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.files-header:hover {
  background: var(--color-black-85);
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
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-black-90);
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.file-item:hover {
  background: var(--color-black-85);
}

.file-type-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-black-80);
  border-radius: 6px;
  font-size: 16px;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-name:hover {
  color: var(--color-primary);
}

.file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  padding: 8px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-black-80);
  color: var(--color-text);
}

.loading-state,
.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-message {
  margin-top: 16px;
  font-size: 14px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style> 