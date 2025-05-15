<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
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
  isPlacingPin.value = true
  isAddPinModalOpen.value = false
}

const handlePinPlacement = (event) => {
  if (!isPlacingPin.value || !pinsContainerRef.value) return

  const rect = pinsContainerRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

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

onMounted(() => {
  fetchPins(true)
  window.addEventListener('mousemove', onPan)
  window.addEventListener('mouseup', endPan)
})

onUnmounted(() => {
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
      @mousedown="startPan"
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
      <PinCard
        v-for="pin in pins"
        :key="pin.id"
        :pin="pin"
        :can-modify="user?.id === pin.user_id"
        @edit="selectedPin = pin; isEditPinModalOpen = true"
        @delete="deletePin(pin)"
        @position-update="updatePinPosition"
      />
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
  overflow: auto;
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
  width: 100%;
  height: 100%;
  overflow: auto;
  background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
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