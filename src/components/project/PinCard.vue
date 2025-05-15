<script setup>
import { ref, onUnmounted } from 'vue'
import { useFileStorage } from '../../composables/useFileStorage'

const props = defineProps({
  pin: {
    type: Object,
    required: true
  },
  canModify: {
    type: Boolean,
    default: false
  },
  containerRef: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete', 'position-update'])

const { downloadFile, getFileUrl } = useFileStorage()
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const pinsContainerRef = ref(null)

const startDrag = (event) => {
  console.log('startDrag called', {
    canModify: props.canModify,
    event: {
      target: event.target,
      currentTarget: event.currentTarget
    },
    containerRef: props.containerRef
  })

  if (!props.canModify) {
    console.log('Drag not allowed - user cannot modify')
    return
  }
  
  isDragging.value = true
  const rect = event.currentTarget.getBoundingClientRect()
  dragOffset.value = {
    x: (event.clientX || event.touches[0].clientX) - rect.left,
    y: (event.clientY || event.touches[0].clientY) - rect.top
  }
  
  console.log('Drag started', {
    dragOffset: dragOffset.value,
    rect: rect
  })
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('mouseup', endDrag)
  document.addEventListener('touchend', endDrag)
  
  event.preventDefault()
  event.stopPropagation()
}

const onDrag = (event) => {
  if (!isDragging.value) {
    console.log('onDrag called but not dragging')
    return
  }
  
  if (!props.containerRef) {
    console.warn('Container not found during drag', {
      containerRef: props.containerRef
    })
    return
  }
  
  const container = props.containerRef
  const rect = container.getBoundingClientRect()
  const clientX = event.clientX || (event.touches && event.touches[0].clientX)
  const clientY = event.clientY || (event.touches && event.touches[0].clientY)
  
  const x = clientX - rect.left - dragOffset.value.x + container.scrollLeft
  const y = clientY - rect.top - dragOffset.value.y + container.scrollTop
  
  console.log('Dragging', {
    position: { x, y },
    rect: rect,
    scroll: {
      left: container.scrollLeft,
      top: container.scrollTop
    }
  })
  
  emit('position-update', props.pin, Math.max(0, x), Math.max(0, y))
  
  event.preventDefault()
  event.stopPropagation()
}

const endDrag = (event) => {
  console.log('endDrag called', { isDragging: isDragging.value })
  
  if (!isDragging.value) return
  
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('touchend', endDrag)
  
  console.log('Drag ended', {
    finalPosition: {
      x: props.pin.position_x,
      y: props.pin.position_y
    }
  })
  
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
}

// Add cleanup on component unmount
onUnmounted(() => {
  if (isDragging.value) {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('touchmove', onDrag)
    document.removeEventListener('mouseup', endDrag)
    document.removeEventListener('touchend', endDrag)
  }
})

const downloadPinFile = async () => {
  try {
    if (!props.pin.file_data?.file_path) {
      console.error('Invalid file information')
      return
    }
    await downloadFile(props.pin.file_data.file_path)
  } catch (err) {
    console.error('Error downloading file:', err)
  }
}

const handleImageError = async (event, filePath) => {
  console.error('Image load error for:', filePath)
  if (filePath) {
    try {
      const newUrl = await getFileUrl(filePath)
      if (newUrl && newUrl !== event.target.src) {
        event.target.src = newUrl
        return
      }
    } catch (error) {
      console.error('Error retrying image load:', error)
    }
  }
  
  // If we get here, either the file path was invalid or the retry failed
  event.target.style.display = 'none'
  const placeholder = document.createElement('div')
  placeholder.className = 'image-error-placeholder'
  placeholder.innerHTML = `
    <div class="error-content">
      <i class="fas fa-exclamation-triangle"></i>
      <p>Failed to load image</p>
      <small>${filePath || 'No file path'}</small>
    </div>
  `
  event.target.parentNode.appendChild(placeholder)
}

// Add a method to handle successful image loads
const handleImageLoad = (event) => {
  console.log('Image loaded successfully:', event.target.src)
  // Remove any existing error placeholder
  const placeholder = event.target.parentNode.querySelector('.image-error-placeholder')
  if (placeholder) {
    placeholder.remove()
  }
}

const isImageUrl = (url) => {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  return imageExtensions.some(ext => url.toLowerCase().includes(ext))
}
</script>

<template>
  <div 
    class="pin-card" 
    :class="[pin.type, { 'is-dragging': isDragging }]"
    :style="{ 
      transform: `translate3d(${pin.position_x || 0}px, ${pin.position_y || 0}px, 0)`,
      cursor: canModify ? 'move' : 'default',
      position: 'absolute',
      zIndex: isDragging ? 1000 : 'auto',
      touchAction: 'none'
    }"
    @mousedown="startDrag"
    @touchstart="startDrag"
  >
    <!-- Pin Header -->
    <div class="pin-header">
      <span class="pin-icon">
        {{ pin.type === 'note' ? '📝' : pin.type === 'file' ? (pin.file_data?.name && pin.file_data.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? '🖼️' : '📎') : '🔗' }}
      </span>
      <h3 class="pin-title">{{ pin.title }}</h3>
      <div v-if="canModify" class="pin-actions">
        <button 
          v-if="pin.type === 'note'"
          class="action-btn" 
          @click.stop="$emit('edit')"
          title="Edit"
        >
          ✏️
        </button>
        <button 
          class="action-btn" 
          @click.stop="$emit('delete')"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- Pin Content -->
    <div class="pin-content">
      <!-- Note Content -->
      <p v-if="pin.type === 'note'" class="note-content">
        {{ pin.content }}
      </p>

      <!-- File Content -->
      <div v-else-if="pin.type === 'file'" class="file-content">
        <!-- Image File -->
        <div v-if="pin.file_data?.name && pin.file_data.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)" class="image-content">
          <img 
            v-if="pin.file_data?.url && !pin.file_data.loadError" 
            :src="pin.file_data.url" 
            :alt="pin.title"
            class="pin-image"
            @load="handleImageLoad"
            @error="(e) => handleImageError(e, pin.file_data?.file_path)"
          >
          <div v-else class="image-placeholder">
            <span>{{ pin.file_data?.loadError ? 'Failed to load image' : 'Image not available' }}</span>
          </div>
        </div>
        <!-- Regular File -->
        <div v-else>
          <button class="download-btn" @click.stop="downloadPinFile">
            Download File
          </button>
          <span class="file-name">{{ pin.file_data?.name }}</span>
        </div>
      </div>

      <!-- Link Content -->
      <div v-else class="link-content">
        <a 
          :href="pin.content" 
          target="_blank" 
          rel="noopener noreferrer"
          class="link-url"
          @click.stop
        >
          {{ pin.content }}
        </a>
        <img 
          v-if="isImageUrl(pin.content)" 
          :src="pin.content" 
          :alt="pin.title"
          class="link-image"
          @error="error => { console.error('Link image load error:', error) }"
        >
      </div>
    </div>

    <!-- Pin Footer -->
    <div class="pin-footer">
      <div class="pin-creator">
        <img 
          v-if="pin.creator?.avatar_url"
          :src="pin.creator.avatar_url"
          :alt="pin.creator?.display_name"
          class="creator-avatar"
        >
        <span v-else class="creator-initial">
          {{ pin.creator?.display_name?.[0] || '?' }}
        </span>
        <span class="creator-name">{{ pin.creator?.display_name }}</span>
      </div>
      <span class="pin-date">{{ new Date(pin.created_at).toLocaleDateString() }}</span>
    </div>
  </div>
</template>

<style scoped>
.pin-card {
  position: absolute;
  width: 300px;
  background: var(--color-black);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.1s ease, box-shadow 0.2s ease;
  user-select: none;
  touch-action: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.pin-card.is-dragging {
  z-index: 1000;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
  pointer-events: none;
}

.pin-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.pin-icon {
  font-size: 20px;
}

.pin-title {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pin-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.action-btn:hover {
  background: var(--color-black-80);
}

.pin-content {
  color: var(--color-text);
  font-size: 14px;
}

.note-content {
  white-space: pre-wrap;
  margin: 0;
  word-break: break-word;
  overflow-wrap: break-word;
}

.file-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.download-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.download-btn:hover {
  background: var(--color-primary-hover);
}

.image-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pin-image {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 6px;
  background: var(--color-black-90);
}

.image-placeholder {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-black-90);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
}

.link-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-url {
  color: var(--color-primary);
  text-decoration: none;
  word-break: break-all;
  overflow-wrap: break-word;
  max-width: 100%;
}

.link-url:hover {
  text-decoration: underline;
}

.link-image {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 6px;
}

.pin-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 12px;
}

.pin-creator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.creator-initial {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-black-80);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  font-weight: 500;
}

.creator-name {
  color: var(--color-text);
}

.pin-date {
  color: var(--color-text-secondary);
}

.file-name {
  color: var(--color-text);
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.image-error-placeholder {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-black-90);
  border: 1px dashed var(--color-border);
  border-radius: 4px;
}

.error-content {
  text-align: center;
  color: var(--color-text-secondary);
}

.error-content i {
  font-size: 24px;
  margin-bottom: 8px;
}

.error-content p {
  margin: 0;
  font-weight: 500;
}

.error-content small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  word-break: break-all;
}
</style> 