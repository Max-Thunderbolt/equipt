<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase/config'
import { useFileStorage } from '../../composables/useFileStorage'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const { user } = useAuth()
const { uploadFile, downloadFile, deleteFile, getFileUrl } = useFileStorage()

// Pin states
const pins = ref([])
const loading = ref(true)
const error = ref(null)

// Modal states
const isAddPinModalOpen = ref(false)
const isEditPinModalOpen = ref(false)
const selectedPin = ref(null)

// New pin data
const newPinData = ref({
  type: 'note', // 'note', 'file', 'link', or 'image'
  title: '',
  content: '',
  file: null,
  link: ''
})

// Pin types
const PIN_TYPES = {
  NOTE: 'note',
  FILE: 'file',
  LINK: 'link',
  IMAGE: 'image'
}

// Database tables
const TABLES = {
  PINS: 'project_pins',
  PROFILES: 'profiles'
}

// Dragging state
const isDragging = ref(false)
const draggedPin = ref(null)
const dragOffset = ref({ x: 0, y: 0 })
const containerRef = ref(null)

// Add this to the script section after the imports
const getPublicUrl = (filePath) => {
  if (!filePath) return null
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${filePath}`
}

// Fetch pins
const fetchPins = async () => {
  try {
    loading.value = true
    error.value = null

    const { data: pinsData, error: pinsError } = await supabase
      .from(TABLES.PINS)
      .select('*')
      .eq('project_id', props.projectId)
      .order('created_at', { ascending: false })

    if (pinsError) throw pinsError

    if (pinsData && pinsData.length > 0) {
      const userIds = [...new Set(pinsData.map(pin => pin.user_id))]
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      if (profilesError) throw profilesError

      pins.value = pinsData.map(pin => {
        // Generate URL for image pins
        if (pin.type === PIN_TYPES.IMAGE && pin.file_data?.file_path) {
          pin.file_data.url = getPublicUrl(pin.file_data.file_path)
          console.log('Image pin data:', {
            type: pin.type,
            filePath: pin.file_data.file_path,
            url: pin.file_data.url
          })
        }
        return {
          ...initializePinPosition(pin),
          creator: profiles.find(profile => profile.id === pin.user_id) || null
        }
      })
    } else {
      pins.value = []
    }

    console.log('All pins:', pins.value)
  } catch (err) {
    console.error('Error fetching pins:', err)
    error.value = err.message || 'Failed to load pins'
  } finally {
    loading.value = false
  }
}

// Add pin
const addPin = async () => {
  try {
    if (!user.value?.id) {
      error.value = 'You must be logged in to add pins'
      return
    }

    if (!newPinData.value.title.trim()) {
      error.value = 'Title is required'
      return
    }

    let fileData = null
    if ((newPinData.value.type === PIN_TYPES.FILE || newPinData.value.type === PIN_TYPES.IMAGE) && newPinData.value.file) {
      try {
        fileData = await uploadFile(newPinData.value.file, props.projectId)
        if (!fileData) throw new Error('Failed to upload file')
        
        // Add URL to fileData for immediate display
        if (newPinData.value.type === PIN_TYPES.IMAGE) {
          fileData.url = getPublicUrl(fileData.file_path)
        }
        
        console.log('Uploaded file data:', fileData)
      } catch (uploadErr) {
        console.error('File upload error:', uploadErr)
        error.value = 'Failed to upload file. Please try again.'
        return
      }
    }

    const pinData = {
      project_id: props.projectId,
      user_id: user.value.id,
      type: newPinData.value.type,
      title: newPinData.value.title.trim(),
      content: newPinData.value.type === PIN_TYPES.LINK 
        ? newPinData.value.link.trim() 
        : newPinData.value.content.trim(),
      file_data: fileData,
      position_x: 0,
      position_y: 0
    }

    console.log('Creating new pin:', pinData)

    const { error: pinError } = await supabase
      .from(TABLES.PINS)
      .insert(pinData)

    if (pinError) throw pinError

    await fetchPins()
    closeAddPinModal()
  } catch (err) {
    console.error('Error adding pin:', err)
    error.value = err.message || 'Failed to add pin'
    
    // Cleanup uploaded file if pin creation fails
    if (fileData) {
      try {
        await deleteFile(fileData.file_path, fileData.id)
      } catch (cleanupErr) {
        console.error('Failed to cleanup file after pin creation error:', cleanupErr)
      }
    }
  }
}

// Delete pin
const deletePin = async (pin) => {
  try {
    if (!user.value?.id) {
      error.value = 'You must be logged in to delete pins'
      return
    }

    if ((pin.type === PIN_TYPES.FILE || pin.type === PIN_TYPES.IMAGE) && pin.file_data) {
      try {
        await deleteFile(pin.file_data.file_path, pin.file_data.id)
      } catch (fileErr) {
        console.error('Error deleting file:', fileErr)
        // Continue with pin deletion even if file deletion fails
      }
    }

    const { error: deleteError } = await supabase
      .from(TABLES.PINS)
      .delete()
      .eq('id', pin.id)
      .eq('user_id', user.value.id) // Extra safety check

    if (deleteError) throw deleteError

    pins.value = pins.value.filter(p => p.id !== pin.id)
  } catch (err) {
    console.error('Error deleting pin:', err)
    error.value = err.message || 'Failed to delete pin'
  }
}

// Edit pin
const editPin = async () => {
  try {
    if (!user.value?.id) {
      error.value = 'You must be logged in to edit pins'
      return
    }

    if (!selectedPin.value || !selectedPin.value.title.trim()) {
      error.value = 'Title is required'
      return
    }

    const { error: updateError } = await supabase
      .from(TABLES.PINS)
      .update({
        title: selectedPin.value.title.trim(),
        content: selectedPin.value.content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedPin.value.id)
      .eq('user_id', user.value.id) // Extra safety check

    if (updateError) throw updateError

    await fetchPins()
    closeEditPinModal()
  } catch (err) {
    console.error('Error updating pin:', err)
    error.value = err.message || 'Failed to update pin'
  }
}

// Update pin position
const updatePinPosition = async (pin, x, y) => {
  try {
    const { error: updateError } = await supabase
      .from(TABLES.PINS)
      .update({
        position_x: x,
        position_y: y,
        updated_at: new Date().toISOString()
      })
      .eq('id', pin.id)

    if (updateError) throw updateError
    
    // Update local state
    const pinIndex = pins.value.findIndex(p => p.id === pin.id)
    if (pinIndex !== -1) {
      pins.value[pinIndex].position_x = x
      pins.value[pinIndex].position_y = y
    }
  } catch (err) {
    console.error('Error updating pin position:', err)
    error.value = err.message || 'Failed to update pin position'
  }
}

// Drag handlers
const startDrag = (event, pin) => {
  if (!canModifyPin(pin)) return
  
  isDragging.value = true
  draggedPin.value = pin
  
  const rect = event.currentTarget.getBoundingClientRect()
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
  
  // Add event listeners
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
  
  // Prevent default behavior
  event.preventDefault()
}

const onDrag = (event) => {
  if (!isDragging.value || !draggedPin.value || !containerRef.value) return
  
  const container = containerRef.value.getBoundingClientRect()
  
  // Calculate new position relative to container
  const newX = event.clientX - container.left - dragOffset.value.x
  const newY = event.clientY - container.top - dragOffset.value.y
  
  // Apply bounds checking
  const maxX = container.width - 300 // pin width
  const maxY = container.height - 200 // approximate pin height
  
  draggedPin.value.position_x = Math.max(0, Math.min(newX, maxX))
  draggedPin.value.position_y = Math.max(0, Math.min(newY, maxY))
}

const endDrag = async () => {
  if (!isDragging.value || !draggedPin.value) return
  
  // Update position in database
  await updatePinPosition(
    draggedPin.value, 
    draggedPin.value.position_x, 
    draggedPin.value.position_y
  )
  
  // Reset drag state
  isDragging.value = false
  draggedPin.value = null
  
  // Remove event listeners
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
}

// Modal handlers
const openAddPinModal = () => {
  newPinData.value = {
    type: PIN_TYPES.NOTE,
    title: '',
    content: '',
    file: null,
    link: ''
  }
  isAddPinModalOpen.value = true
}

const closeAddPinModal = () => {
  isAddPinModalOpen.value = false
  newPinData.value = {
    type: PIN_TYPES.NOTE,
    title: '',
    content: '',
    file: null,
    link: ''
  }
}

const openEditPinModal = (pin) => {
  selectedPin.value = { ...pin }
  isEditPinModalOpen.value = true
}

const closeEditPinModal = () => {
  isEditPinModalOpen.value = false
  selectedPin.value = null
}

// File handlers
const handleFileSelect = (event) => {
  newPinData.value.file = event.target.files[0]
  
  // Auto-detect image type
  if (newPinData.value.file && newPinData.value.file.type.startsWith('image/')) {
    newPinData.value.type = PIN_TYPES.IMAGE
  }
}

const downloadPinFile = async (pin) => {
  try {
    if (!pin.file_data || !pin.file_data.file_path) {
      error.value = 'Invalid file information'
      return
    }
    
    await downloadFile(pin.file_data.file_path)
  } catch (err) {
    console.error('Error downloading file:', err)
    error.value = 'Failed to download file'
  }
}

// Check if user can edit/delete pin
const canModifyPin = (pin) => {
  return user.value?.id === pin.user_id
}

// Check if URL is an image
const isImageUrl = (url) => {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  return imageExtensions.some(ext => url.toLowerCase().includes(ext))
}

// Add function to initialize pin positions
const initializePinPosition = (pin) => {
  if (pin.position_x === undefined || pin.position_y === undefined) {
    // Get random position within container bounds
    const container = document.querySelector('.pins-container')
    if (container) {
      const maxX = container.clientWidth - 300
      const maxY = container.clientHeight - 200
      pin.position_x = Math.random() * maxX
      pin.position_y = Math.random() * maxY
    }
  }
  return pin
}

onMounted(() => {
  fetchPins()
})
</script>

<template>
  <div class="pinboard">
    <!-- Header -->
    <div class="pinboard-header">
      <h2>Project Pinboard</h2>
      <button class="btn btn-primary" @click="openAddPinModal">+ Pin</button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      Loading pins...
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      {{ error }}
    </div>

    <!-- Pins Container -->
    <div v-else ref="containerRef" class="pins-container">
      <div 
        v-for="pin in pins" 
        :key="pin.id" 
        class="pin-card" 
        :class="[pin.type, { 'is-dragging': isDragging && draggedPin?.id === pin.id }]"
        :style="{ 
          transform: `translate3d(${pin.position_x || 0}px, ${pin.position_y || 0}px, 0)`,
          cursor: canModifyPin(pin) ? 'move' : 'default'
        }"
        @mousedown="startDrag($event, pin)"
      >
        <!-- Pin Header -->
        <div class="pin-header">
          <span class="pin-icon">
            {{ pin.type === 'note' ? '📝' : pin.type === 'file' ? '📎' : pin.type === 'image' ? '🖼️' : '🔗' }}
          </span>
          <h3 class="pin-title">{{ pin.title }}</h3>
          <div v-if="canModifyPin(pin)" class="pin-actions">
            <button 
              v-if="pin.type === 'note'"
              class="action-btn" 
              @click.stop="openEditPinModal(pin)"
              title="Edit"
            >
              ✏️
            </button>
            <button 
              class="action-btn" 
              @click.stop="deletePin(pin)"
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
            <button class="download-btn" @click.stop="downloadPinFile(pin)">
              Download File
            </button>
            <span class="file-name">{{ pin.file_data?.name }}</span>
          </div>

          <!-- Image Content -->
          <div v-else-if="pin.type === 'image'" class="image-content">
            <img 
              v-if="pin.file_data?.url" 
              :src="pin.file_data.url" 
              :alt="pin.title"
              class="pin-image"
              @load="() => console.log('Image loaded:', pin.file_data.url)"
              @error="error => console.error('Image load error:', error, pin.file_data)"
            >
            <div v-else class="image-placeholder">
              <span>{{ pin.file_data ? 'Failed to load image' : 'Image not available' }}</span>
              <div v-if="pin.file_data" class="debug-info">
                Path: {{ pin.file_data.file_path }}
              </div>
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
    </div>

    <!-- Add Pin Modal -->
    <div v-if="isAddPinModalOpen" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Add Pin</h2>
          <button class="close-button" @click="closeAddPinModal">×</button>
        </div>
        <form @submit.prevent="addPin">
          <!-- Pin Type Selection -->
          <div class="form-group">
            <label>Pin Type</label>
            <div class="pin-type-selector">
              <button 
                type="button"
                :class="{ active: newPinData.type === 'note' }"
                @click="newPinData.type = 'note'"
              >
                📝 Note
              </button>
              <button 
                type="button"
                :class="{ active: newPinData.type === 'file' }"
                @click="newPinData.type = 'file'"
              >
                📎 File
              </button>
              <button 
                type="button"
                :class="{ active: newPinData.type === 'image' }"
                @click="newPinData.type = 'image'"
              >
                🖼️ Image
              </button>
              <button 
                type="button"
                :class="{ active: newPinData.type === 'link' }"
                @click="newPinData.type = 'link'"
              >
                🔗 Link
              </button>
            </div>
          </div>

          <!-- Title Field -->
          <div class="form-group">
            <label>Title</label>
            <input 
              v-model="newPinData.title"
              type="text"
              required
              placeholder="Enter pin title"
            >
          </div>

          <!-- Dynamic Content Field -->
          <div class="form-group">
            <template v-if="newPinData.type === 'note'">
              <label>Note</label>
              <textarea
                v-model="newPinData.content"
                rows="4"
                placeholder="Write your note..."
              ></textarea>
            </template>

            <template v-else-if="newPinData.type === 'file' || newPinData.type === 'image'">
              <label>{{ newPinData.type === 'image' ? 'Image' : 'File' }}</label>
              <div class="file-upload-box">
                <input
                  type="file"
                  @change="handleFileSelect"
                  :accept="newPinData.type === 'image' ? 'image/*' : undefined"
                  required
                >
              </div>
            </template>

            <template v-else>
              <label>Link</label>
              <input
                v-model="newPinData.link"
                type="url"
                required
                placeholder="Enter URL..."
              >
            </template>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeAddPinModal">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Add Pin
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Pin Modal -->
    <div v-if="isEditPinModalOpen" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Edit Pin</h2>
          <button class="close-button" @click="closeEditPinModal">×</button>
        </div>
        <form @submit.prevent="editPin">
          <div class="form-group">
            <label>Title</label>
            <input 
              v-model="selectedPin.title"
              type="text"
              required
              placeholder="Enter pin title"
            >
          </div>
          <div class="form-group">
            <label>Content</label>
            <textarea
              v-model="selectedPin.content"
              rows="4"
              placeholder="Write your note..."
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeEditPinModal">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pinboard {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  position: relative;
}

.pinboard-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: var(--color-black-90);
  height: 72px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.pinboard-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pins-container {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 24px;
  user-select: none;
}

.pin-card {
  position: absolute;
  background: var(--color-black);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
  z-index: 1;
  will-change: transform;
  touch-action: none;
}

.pin-card.is-dragging {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 10;
  opacity: 0.9;
  transition: none;
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

.pin-type-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.pin-type-selector button {
  flex: 1;
  padding: 8px;
  background: var(--color-black-90);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pin-type-selector button.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.loading-state,
.error-state {
  text-align: center;
  padding: 48px;
  color: var(--color-text-secondary);
}

.error-state {
  color: var(--color-danger);
}

.debug-info {
  font-size: 12px;
  margin-top: 8px;
  word-break: break-all;
  opacity: 0.7;
}

/* Inherit existing modal styles from ProjectDetails.vue */
</style> 