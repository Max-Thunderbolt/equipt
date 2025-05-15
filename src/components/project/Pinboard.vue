<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { usePinManagement } from '../../composables/usePinManagement'
import { usePinboardPan } from '../../composables/usePinboardPan'
import PinCard from './PinCard.vue'
import PinModal from './PinModal.vue'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const { user } = useAuth()
const { 
  pins,
  loading,
  error,
  fetchPins,
  addPin,
  editPin,
  deletePin,
  updatePinPosition
} = usePinManagement(props.projectId)

const {
  isPanning,
  startPan,
  onPan,
  endPan,
  pinsContainerRef
} = usePinboardPan()

// Modal states
const isAddPinModalOpen = ref(false)
const isEditPinModalOpen = ref(false)
const selectedPin = ref(null)

// New pin data
const newPinData = ref({
  type: 'note',
  title: '',
  content: '',
  file: null,
  link: ''
})

// Pin placement state
const isPlacingPin = ref(false)
const pendingPinPosition = ref(null)

const startPinPlacement = () => {
  console.log('startPinPlacement called')
  isPlacingPin.value = true
  isAddPinModalOpen.value = false
}

const handlePinPlacement = (event) => {
  console.log('handlePinPlacement called', {
    isPlacingPin: isPlacingPin.value,
    hasContainer: !!pinsContainerRef.value
  })

  if (!isPlacingPin.value || !pinsContainerRef.value) return

  const rect = pinsContainerRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left + pinsContainerRef.value.scrollLeft
  const y = event.clientY - rect.top + pinsContainerRef.value.scrollTop

  console.log('Pin placement', {
    position: { x, y },
    rect: rect,
    scroll: {
      left: pinsContainerRef.value.scrollLeft,
      top: pinsContainerRef.value.scrollTop
    }
  })

  pendingPinPosition.value = { x, y }
  isPlacingPin.value = false
  isAddPinModalOpen.value = true
}

const closeAddPinModal = () => {
  isAddPinModalOpen.value = false
  pendingPinPosition.value = null
  newPinData.value = {
    type: 'note',
    title: '',
    content: '',
    file: null,
    link: ''
  }
}

const closeEditPinModal = () => {
  isEditPinModalOpen.value = false
  selectedPin.value = null
}

const handlePinPositionUpdate = async (pin, x, y) => {
  console.log('handlePinPositionUpdate called', {
    pin,
    newPosition: { x, y }
  })

  try {
    const success = await updatePinPosition(pin, x, y)
    console.log('Pin position update result:', success)
  } catch (error) {
    console.error('Error updating pin position:', error)
  }
}

const isContainerReady = computed(() => {
  console.log('Checking container readiness:', {
    hasContainer: !!pinsContainerRef.value,
    container: pinsContainerRef.value
  })
  return !!pinsContainerRef.value
})

// Add touch support for panning
const handleTouchStart = (event) => {
  if (event.touches.length === 1) {
    startPan(event)
  }
}

const handleTouchMove = (event) => {
  if (event.touches.length === 1) {
    onPan(event)
  }
}

const handleTouchEnd = (event) => {
  endPan(event)
}

onMounted(() => {
  console.log('Pinboard mounted', {
    containerRef: pinsContainerRef.value
  })
  fetchPins(true)
  document.addEventListener('mousemove', onPan)
  document.addEventListener('mouseup', endPan)
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd)
})

onUnmounted(() => {
  console.log('Pinboard unmounting')
  document.removeEventListener('mousemove', onPan)
  document.removeEventListener('mouseup', endPan)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
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
      @mousedown="startPan"
      @touchstart="handleTouchStart"
      @click="handlePinPlacement"
    >
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        Loading pins...
      </div>

      <!-- Error State -->
      <div v-if="error" class="error-state">
        {{ error }}
      </div>

      <!-- Pins -->
      <template v-if="isContainerReady">
        <PinCard
          v-for="pin in pins"
          :key="pin.id"
          :pin="pin"
          :can-modify="user?.id === pin.user_id"
          :container-ref="pinsContainerRef"
          @edit="selectedPin = pin; isEditPinModalOpen = true"
          @delete="deletePin(pin)"
          @position-update="handlePinPositionUpdate"
        />
      </template>
    </div>

    <!-- Add Pin Modal -->
    <PinModal
      v-if="isAddPinModalOpen"
      :pin-data="newPinData"
      :position="pendingPinPosition"
      @close="closeAddPinModal"
      @submit="addPin"
    />

    <!-- Edit Pin Modal -->
    <PinModal
      v-if="isEditPinModalOpen"
      :pin-data="selectedPin"
      :is-edit="true"
      @close="closeEditPinModal"
      @submit="editPin"
    />
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
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  padding-top: 8px;
}

.pinboard-header {
  flex: 0 0 auto;
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
  flex: 1;
  overflow: auto;
  background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  min-height: 100%;
  min-width: 100%;
  touch-action: none;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: none;
}

.pins-container:active {
  cursor: grabbing;
}

/* Ensure pins container has a minimum size */
.pins-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  min-width: 2000px;
  min-height: 2000px;
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
</style> 