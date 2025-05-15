<template>
  <div class="pin-toolbar">
    <div class="toolbar-group">
      <button class="toolbar-button" @click="handleCreatePin">
        <span class="icon">📌</span>
        <span class="label">New Pin</span>
      </button>
      <button class="toolbar-button" @click="handleCreateLink" :disabled="!canCreateLink">
        <span class="icon">🔗</span>
        <span class="label">Link Pins</span>
      </button>
    </div>
    <div class="toolbar-group">
      <button class="toolbar-button" @click="handleZoomIn">
        <span class="icon">🔍+</span>
        <span class="label">Zoom In</span>
      </button>
      <button class="toolbar-button" @click="handleZoomOut">
        <span class="icon">🔍-</span>
        <span class="label">Zoom Out</span>
      </button>
      <button class="toolbar-button" @click="handleResetZoom">
        <span class="icon">🔍</span>
        <span class="label">Reset Zoom</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePinboardStore } from '../../stores/pinboard'

const pinboardStore = usePinboardStore()
const { selectedPinIds } = pinboardStore

const emit = defineEmits(['create-pin', 'create-link', 'zoom'])

const canCreateLink = computed(() => selectedPinIds.size === 2)

const handleCreatePin = () => {
  emit('create-pin', {
    title: 'New Pin',
    description: '',
    x: 100,
    y: 100,
    color: '#4CAF50'
  })
}

const handleCreateLink = () => {
  if (canCreateLink.value) {
    const [sourceId, targetId] = Array.from(selectedPinIds)
    emit('create-link', {
      source_pin_id: sourceId,
      target_pin_id: targetId
    })
  }
}

const handleZoomIn = () => {
  // This would be handled by the parent component
  emit('zoom', 'in')
}

const handleZoomOut = () => {
  emit('zoom', 'out')
}

const handleResetZoom = () => {
  emit('zoom', 'reset')
}
</script>

<style scoped>
.pin-toolbar {
  position: fixed;
  top: var(--navbar-height, 72px);
  left: 280px; /* Width of ProjectSideNav */
  right: 0;
  padding: 8px;
  background-color: #2a2a2a;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  z-index: 10;
}

.toolbar-group {
  display: flex;
  gap: 8px;
}

.toolbar-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #ffffff;
}

.toolbar-button:hover {
  background-color: #333;
  border-color: #ff6b00;
  color: #ff6b00;
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #333;
}

.toolbar-button .icon {
  font-size: 1.2em;
}

.toolbar-button .label {
  font-size: 0.9em;
}
</style>
