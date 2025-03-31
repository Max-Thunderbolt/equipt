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
  }
});

const { downloadFile } = useFileStorage();

const emit = defineEmits(['delete', 'preview']);

const handleDownload = async (file) => {
  await downloadFile(file);
};

const handleDelete = (file) => {
  emit('delete', file);
};

const handlePreview = (file) => {
  emit('preview', file);
};

const isImage = (file) => {
  return file.type?.startsWith('image/') || 
         file.mimetype?.startsWith('image/') || 
         /\.(jpe?g|png|gif|bmp|webp)$/i.test(file.name || file.filename);
};

const isPDF = (file) => {
  return file.type === 'application/pdf' || 
         file.mimetype === 'application/pdf' || 
         /\.pdf$/i.test(file.name || file.filename);
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const gridClasses = computed(() => {
  return props.viewMode === 'grid' 
    ? 'grid-view' 
    : 'list-view';
});
</script>

<template>
  <div class="files-grid-container">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading files...</p>
    </div>
    
    <div v-else-if="files.length === 0" class="empty-state">
      <p>No files found</p>
    </div>
    
    <div v-else :class="['files-grid', gridClasses]">
      <div v-for="file in files" :key="file.id" class="file-item">
        <div class="file-preview" @click="handlePreview(file)">
          <img v-if="isImage(file)" :src="file.url || file.download_url" :alt="file.name || file.filename" class="preview-image">
          <div v-else-if="isPDF(file)" class="pdf-preview">
            <span class="file-icon">PDF</span>
          </div>
          <div v-else class="generic-preview">
            <span class="file-icon">FILE</span>
          </div>
        </div>
        
        <div class="file-info">
          <h3 class="file-name">{{ file.name || file.filename }}</h3>
          <p class="file-size">{{ formatFileSize(file.size) }}</p>
        </div>
        
        <div class="file-actions">
          <button class="action-btn download-btn" @click="handleDownload(file)" title="Download">
            <span class="icon">↓</span>
          </button>
          <button class="action-btn delete-btn" @click="handleDelete(file)" title="Delete">
            <span class="icon">×</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.files-grid-container {
  width: 100%;
  padding: 1rem 0;
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
  border: 4px solid rgba(255, 255, 255, 0.3);
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
  height: 200px;
  background-color: var(--secondary);
  border-radius: 8px;
  color: var(--text-secondary);
}

.files-grid {
  display: grid;
  gap: 1.5rem;
}

.grid-view {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.list-view {
  grid-template-columns: 1fr;
}

.file-item {
  background-color: var(--secondary-dark);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.file-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.file-preview {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--secondary);
  cursor: pointer;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.pdf-preview, .generic-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-icon {
  font-size: 1rem;
  background-color: var(--accent-blue);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.file-info {
  padding: 1rem;
}

.file-name {
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.file-size {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.file-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 1rem 1rem;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.action-btn:hover {
  background-color: var(--secondary);
  color: var(--text-primary);
}

.download-btn:hover {
  color: var(--accent-blue);
}

.delete-btn:hover {
  color: var(--accent-red);
}

.list-view .file-item {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  align-items: center;
  height: 80px;
}

.list-view .file-preview {
  height: 80px;
}

.list-view .file-actions {
  padding: 0 1rem;
}
</style> 