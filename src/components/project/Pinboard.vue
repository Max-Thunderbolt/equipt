<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
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

// Infinite scroll state
const page = ref(0)
const pageSize = 20
const allLoaded = ref(false)
const loadingMore = ref(false)

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
  LINK: 'link'
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

// Add these to your existing refs
const newPinPreview = ref(null)
const isPlacingPin = ref(false)
const mousePosition = ref({ x: 0, y: 0 })
const pinsContainerRef = ref(null)

// Add these computed properties
const newPinStyle = computed(() => {
  if (!isPlacingPin.value) return {}
  return {
    position: 'absolute',
    left: `${mousePosition.value.x}px`,
    top: `${mousePosition.value.y}px`,
    opacity: '0.8',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000
  }
})

// Add this to the script section after the imports
const getPublicUrl = async (filePath) => {
  if (!filePath) return null
  try {
    const url = await getFileUrl(filePath)
    console.log('Generated URL for file:', filePath, url)
    return url
  } catch (error) {
    console.error('Error getting public URL:', error)
    return null
  }
}

// Add a new function to handle image loading errors
const handleImageError = async (event, filePath) => {
  console.error('Image load error for:', filePath)
  if (filePath) {
    try {
      // Try to get a fresh URL
      const newUrl = await getFileUrl(filePath)
      if (newUrl && newUrl !== event.target.src) {
        console.log('Retrying with new URL:', newUrl)
        event.target.src = newUrl
        return
      }
    } catch (error) {
      console.error('Error retrying image load:', error)
    }
  }
  // If we get here, either there was no filePath or the retry failed
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

// Fetch pins (paginated)
const fetchPins = async (isInitial = false) => {
  try {
    if (isInitial) {
      page.value = 0
      allLoaded.value = false
      pins.value = []
    }
    if (allLoaded.value) return
    loading.value = isInitial
    loadingMore.value = !isInitial
    error.value = null

    const from = page.value * pageSize
    const to = from + pageSize - 1

    const { data: pinsData, error: pinsError } = await supabase
      .from(TABLES.PINS)
      .select('*')
      .eq('project_id', props.projectId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (pinsError) throw pinsError

    if (pinsData && pinsData.length > 0) {
      const userIds = [...new Set(pinsData.map(pin => pin.user_id))]
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      if (profilesError) throw profilesError

      const newPins = pinsData.map(pin => {
        if (pin.type === PIN_TYPES.FILE && pin.file_data?.file_path && 
            pin.file_data?.name && pin.file_data.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          pin.file_data.url = getPublicUrl(pin.file_data.file_path)
        }
        return {
          ...initializePinPosition(pin),
          creator: profiles.find(profile => profile.id === pin.user_id) || null
        }
      })
      if (isInitial) {
        pins.value = newPins
      } else {
        pins.value = [...pins.value, ...newPins]
      }
      if (pinsData.length < pageSize) {
        allLoaded.value = true
      } else {
        page.value++
      }
    } else {
      if (isInitial) pins.value = []
      allLoaded.value = true
    }
  } catch (err) {
    console.error('Error fetching pins:', err)
    error.value = err.message || 'Failed to load pins'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// Infinite scroll handler
const handleScroll = () => {
  const container = pinsContainerRef.value
  if (!container || loadingMore.value || allLoaded.value) return
  const scrollThreshold = 200 // px from bottom
  if (container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold) {
    fetchPins(false)
  }
}

// Add to your existing refs
const pendingPinPosition = ref(null)

// Modify the handlePinPlacement method
const handlePinPlacement = async (event) => {
  if (!isPlacingPin.value || !pinsContainerRef.value) return

  const rect = pinsContainerRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Store the position and show the modal
  pendingPinPosition.value = { x, y }
  isPlacingPin.value = false
  isAddPinModalOpen.value = true
}

// Modify the addPin method
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
    if (newPinData.value.type === PIN_TYPES.FILE && newPinData.value.file) {
      try {
        fileData = await uploadFile(newPinData.value.file, props.projectId)
        if (!fileData) throw new Error('Failed to upload file')
        
        if (newPinData.value.file.type.startsWith('image/')) {
          fileData.url = await getPublicUrl(fileData.file_path)
        }
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
      position_x: pendingPinPosition.value?.x || 0,
      position_y: pendingPinPosition.value?.y || 0
    }

    const { error: pinError } = await supabase
      .from(TABLES.PINS)
      .insert(pinData)

    if (pinError) throw pinError

    await fetchPins()
    closeAddPinModal()
    pendingPinPosition.value = null
  } catch (err) {
    console.error('Error adding pin:', err)
    error.value = err.message || 'Failed to add pin'
    
    if (fileData) {
      try {
        await deleteFile(fileData.file_path, fileData.id)
      } catch (cleanupErr) {
        console.error('Failed to cleanup file after pin creation error:', cleanupErr)
      }
    }
  }
}

// Modify closeAddPinModal to reset pending position
const closeAddPinModal = () => {
  isAddPinModalOpen.value = false
  pendingPinPosition.value = null
  newPinData.value = {
    type: PIN_TYPES.NOTE,
    title: '',
    content: '',
    file: null,
    link: ''
  }
}

// Add ESC key handler to cancel pin placement
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    if (isPlacingPin.value) {
      isPlacingPin.value = false
      pendingPinPosition.value = null
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
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
  
  event.preventDefault()
  event.stopPropagation()
}

const onDrag = (event) => {
  if (!isDragging.value || !draggedPin.value || !pinsContainerRef.value) return
  
  const container = pinsContainerRef.value.getBoundingClientRect()
  const x = event.clientX - container.left - dragOffset.value.x
  const y = event.clientY - container.top - dragOffset.value.y
  
  // Update pin position
  draggedPin.value.position_x = Math.max(0, x)
  draggedPin.value.position_y = Math.max(0, y)
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

const closeEditPinModal = () => {
  isEditPinModalOpen.value = false
  selectedPin.value = null
}

// File handlers
const handleFileSelect = (event) => {
  newPinData.value.file = event.target.files[0]
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

// Add or modify these methods
const startPinPlacement = () => {
  isPlacingPin.value = true
  // Close the add pin modal if it was open
  isAddPinModalOpen.value = false
}

const handleMouseMove = (event) => {
  if (!pinsContainerRef.value) return
  
  const rect = pinsContainerRef.value.getBoundingClientRect()
  mousePosition.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

// Panning state
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const scrollStart = ref({ left: 0, top: 0 })

const startPan = (event) => {
  if (event.target === event.currentTarget) {
    isPanning.value = true;
    panStart.value = { x: event.clientX, y: event.clientY };
    const container = pinsContainerRef.value;
    if (container) {
      scrollStart.value = { left: container.scrollLeft, top: container.scrollTop };
    }
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  }
};

const onPan = (event) => {
  if (!isPanning.value) return;
  const container = pinsContainerRef.value;
  if (container) {
    const dx = event.clientX - panStart.value.x;
    const dy = event.clientY - panStart.value.y;
    container.scrollLeft = scrollStart.value.left - dx;
    container.scrollTop = scrollStart.value.top - dy;
  }
};

const endPan = () => {
  isPanning.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

onMounted(() => {
  fetchPins(true)
  document.addEventListener('keydown', handleKeyDown)
  if (pinsContainerRef.value) {
    pinsContainerRef.value.addEventListener('scroll', handleScroll)
    // Center the view on the board initially
    pinsContainerRef.value.scrollLeft = (4000 - pinsContainerRef.value.clientWidth) / 2
    pinsContainerRef.value.scrollTop = (4000 - pinsContainerRef.value.clientHeight) / 2
  }
  window.addEventListener('mousemove', onPan)
  window.addEventListener('mouseup', endPan)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (pinsContainerRef.value) {
    pinsContainerRef.value.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('mousemove', onPan)
  window.removeEventListener('mouseup', endPan)
})
</script>

<template>
  <div class="pinboard">
    <div class="pinboard-header">
      <h2>Project Pinboard</h2>
      <button class="btn-add-pin" @click="startPinPlacement">+ Pin</button>
    </div>

    <div 
      ref="pinsContainerRef"
      class="pins-container"
      @scroll="handleScroll"
      @mousedown="startPan"
      @mousemove="handleMouseMove"
      @click="handlePinPlacement"
      style="width: 4000px; height: 4000px; min-width: 100vw; min-height: 100vh; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 40px 40px; position: relative; overflow: auto;"
    >
      <!-- Overlay for panning -->
      <div v-if="isPanning" class="pan-overlay"></div>
      <!-- Pin Preview when placing -->
      <div 
        v-if="isPlacingPin"
        class="pin-card pin-preview"
        :style="newPinStyle"
      >
        <div class="pin-header">
          <span class="pin-icon">📌</span>
          <h3 class="pin-title">New Pin</h3>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        Loading pins...
      </div>

      <!-- Error State -->
      <div v-if="error" class="error-state">
        {{ error }}
      </div>

      <!-- Pins -->
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
            {{ pin.type === 'note' ? '📝' : pin.type === 'file' ? (pin.file_data?.name && pin.file_data.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? '🖼️' : '📎') : '🔗' }}
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
            <!-- Image File -->
            <div v-if="pin.file_data?.name && pin.file_data.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)" class="image-content">
              <img 
                v-if="pin.file_data?.url && !pin.file_data.loadError" 
                :src="pin.file_data.url" 
                :alt="pin.title"
                class="pin-image"
                @load="() => console.log('Image loaded successfully:', pin.file_data.url)"
                @error="(e) => handleImageError(e, pin.file_data?.file_path)"
              >
              <div v-else class="image-placeholder">
                <span>{{ pin.file_data?.loadError ? 'Failed to load image' : 'Image not available' }}</span>
                <div v-if="pin.file_data" class="debug-info">
                  <div>Path: {{ pin.file_data.file_path }}</div>
                  <div v-if="pin.file_data.url">URL: {{ pin.file_data.url }}</div>
                </div>
              </div>
            </div>
            <!-- Regular File -->
            <div v-else>
              <button class="download-btn" @click.stop="downloadPinFile(pin)">
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

      <!-- Loading More State -->
      <div v-if="loadingMore" class="loading-state">Loading more pins...</div>
      <div v-if="allLoaded && pins.length > 0" class="loading-state">All pins loaded.</div>
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

            <template v-else-if="newPinData.type === 'file'">
              <label>File</label>
              <div class="file-upload-box">
                <input
                  type="file"
                  @change="handleFileSelect"
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
  position: fixed;
  top: var(--navbar-height, 72px);
  left: 280px;
  right: 0;
  bottom: 0;
  background: var(--color-black);
  display: flex;
  flex-direction: column;
  overflow: auto;
  width: 100vw;
  height: 100vh;
  padding-top: 8px;
}

.pinboard-header {
  flex: 0 0 auto; /* Allow natural height instead of fixed */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--color-black-90);
  border-bottom: 1px solid var(--color-border);
}

.pinboard-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-heading);
}

.btn-add-pin {
  background-color: var(--color-equipt-orange);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  min-width: 80px;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.btn-add-pin:hover {
  background-color: var(--color-equipt-orange-90);
}

.pins-container {
  position: relative;
  /* width/height and background set inline for dynamic sizing */
  overflow: auto;
}

.pin-card {
  background: var(--color-black);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pin-card.is-dragging {
  position: fixed; /* Only when dragging */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 10;
  opacity: 0.9;
  width: 300px; /* Fixed width when dragging */
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

.file-name {
  color: var(--color-text);
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

/* Inherit existing modal styles from ProjectDetails.vue */
.image-error-placeholder {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  border: 1px dashed #dee2e6;
  border-radius: 4px;
}

.error-content {
  text-align: center;
  color: #6c757d;
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

/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-black);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.pin-preview {
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border: 2px dashed var(--color-border);
  background: rgba(0, 0, 0, 0.5);
}

.pin-card {
  position: absolute;
  width: 300px;
  transition: transform 0.1s ease, box-shadow 0.2s ease;
}

.pin-card.is-dragging {
  z-index: 100;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.pan-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  cursor: grabbing;
  user-select: none;
  background: transparent;
}
</style> 