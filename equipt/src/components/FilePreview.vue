<script setup>
import { computed } from 'vue';

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  },
  allowDelete: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['delete', 'download', 'preview']);

// Calculate formatted file size
const formattedSize = computed(() => {
  if (!props.file.size_bytes) return 'Unknown size';
  
  const kb = props.file.size_bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  } else {
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }
});

// Determine file type and icon
const fileDetails = computed(() => {
  if (!props.file.name) return { icon: '📄', type: 'Unknown' };
  
  const extension = props.file.name.split('.').pop()?.toLowerCase();
  
  let icon = '📄';
  let type = extension ? extension.toUpperCase() : 'Unknown';
  
  switch (extension) {
    case 'pdf':
      icon = '📕';
      type = 'PDF Document';
      break;
    case 'doc':
    case 'docx':
      icon = '📘';
      type = 'Word Document';
      break;
    case 'xls':
    case 'xlsx':
      icon = '📗';
      type = 'Excel Spreadsheet';
      break;
    case 'ppt':
    case 'pptx':
      icon = '📙';
      type = 'PowerPoint';
      break;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      icon = '🖼️';
      type = 'Image';
      break;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'webm':
      icon = '🎬';
      type = 'Video';
      break;
    case 'mp3':
    case 'wav':
    case 'ogg':
      icon = '🎵';
      type = 'Audio';
      break;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      icon = '🗜️';
      type = 'Archive';
      break;
    case 'html':
    case 'css':
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      icon = '💻';
      type = 'Code';
      break;
    case 'json':
    case 'xml':
    case 'csv':
      icon = '📊';
      type = 'Data';
      break;
  }
  
  return { icon, type };
});

// File is previewable if it's an image or PDF
const isPreviewable = computed(() => {
  if (!props.file.url) return false;
  
  const extension = props.file.name?.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(extension);
});

// Methods to emit events
const handleDelete = () => {
  if (confirm(`Are you sure you want to delete ${props.file.name}?`)) {
    emit('delete', props.file);
  }
};

const handleDownload = () => {
  emit('download', props.file);
};

const handlePreview = () => {
  if (isPreviewable.value) {
    emit('preview', props.file);
  } else {
    // If not previewable, download instead
    handleDownload();
  }
};
</script>

<template>
  <div :class="['file-preview', { 'compact': compact }]">
    <div class="file-icon" @click="handlePreview">
      <span>{{ fileDetails.icon }}</span>
    </div>
    
    <div class="file-info" @click="handlePreview">
      <div class="file-name">{{ file.name }}</div>
      <div class="file-meta">
        <span class="file-type">{{ fileDetails.type }}</span>
        <span class="file-size">{{ formattedSize }}</span>
        <span v-if="file.created_at && !compact" class="file-date">
          {{ new Date(file.created_at).toLocaleDateString() }}
        </span>
      </div>
    </div>
    
    <div class="file-actions">
      <button 
        class="action-btn preview-btn" 
        @click="handlePreview"
        :title="isPreviewable ? 'Preview' : 'Download'"
      >
        {{ isPreviewable ? '👁️' : '⬇️' }}
      </button>
      
      <button 
        v-if="!compact"
        class="action-btn download-btn" 
        @click="handleDownload" 
        title="Download"
      >
        ⬇️
      </button>
      
      <button 
        v-if="allowDelete" 
        class="action-btn delete-btn" 
        @click="handleDelete" 
        title="Delete"
      >
        🗑️
      </button>
    </div>
  </div>
</template>

<style scoped>
.file-preview {
  display: flex;
  align-items: center;
  padding: 0.8rem;
  border-radius: 8px;
  background: var(--secondary-dark);
  margin-bottom: 0.5rem;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.file-preview:hover {
  background: var(--tertiary-dark);
  border-color: var(--accent-blue);
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--primary-dark);
  border-radius: 6px;
  margin-right: 1rem;
  cursor: pointer;
  flex-shrink: 0;
}

.file-icon span {
  font-size: 1.5rem;
}

.file-info {
  flex-grow: 1;
  min-width: 0;
  cursor: pointer;
}

.file-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.file-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.file-type,
.file-size,
.file-date {
  display: inline-block;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.action-btn:hover {
  background: var(--accent-blue-translucent);
  color: var(--text-primary);
}

.delete-btn:hover {
  background: var(--danger-color-translucent);
  color: var(--danger-color);
}

/* Compact mode styles */
.file-preview.compact {
  padding: 0.5rem;
  margin-bottom: 0.3rem;
}

.file-preview.compact .file-icon {
  width: 2rem;
  height: 2rem;
  margin-right: 0.7rem;
}

.file-preview.compact .file-icon span {
  font-size: 1.2rem;
}

.file-preview.compact .file-name {
  font-size: 0.9rem;
}

.file-preview.compact .file-meta {
  font-size: 0.7rem;
}

.file-preview.compact .action-btn {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 1rem;
}
</style> 