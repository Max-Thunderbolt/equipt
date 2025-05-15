<template>
  <div class="pinboard">
    <div class="pinboard-toolbar">
      <PinToolbar @create-pin="handleCreatePin" @zoom="handleZoom" />
    </div>
    <div class="pinboard-main">
      <PinboardCanvas
        :pins="pins"
        :pin-links="pinLinks"
        :viewport="viewport"
        @pin-move="handlePinMove"
        @pin-select="handlePinSelect"
        @pin-delete="handlePinDelete"
        @viewport-change="handleViewportChange"
      />
      <Minimap
        :pins="pins"
        :pin-links="pinLinks"
        :viewport="viewport"
        @viewport-change="handleViewportChange"
      />
      <PinContextMenu
        v-if="selectedPinIds.size > 0"
        :selected-pin-ids="selectedPinIds"
        @delete="handleDeleteSelected"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { usePinboardStore } from '../../stores/pinboard'
import PinToolbar from './PinToolbar.vue'
import PinboardCanvas from './PinboardCanvas.vue'
import Minimap from './Minimap.vue'
import PinContextMenu from './PinContextMenu.vue'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const pinboardStore = usePinboardStore()
const { pins, pinLinks, viewport, selectedPinIds } = pinboardStore

// Lifecycle hooks
onMounted(async () => {
  await pinboardStore.fetchPins(props.projectId)
  console.log('Fetched pins:', pins.value)
  await pinboardStore.fetchPinLinks(props.projectId)
  await pinboardStore.subscribeToRealtime(props.projectId)
})

onUnmounted(async () => {
  await pinboardStore.unsubscribeFromRealtime()
})

// Event handlers
const handleCreatePin = async (pinData) => {
  await pinboardStore.createPin({
    ...pinData,
    project_id: props.projectId
  })
}

const handlePinMove = async (pinId, position) => {
  await pinboardStore.updatePin(pinId, {
    x: position.x,
    y: position.y
  })
}

const handlePinSelect = (pinId) => {
  pinboardStore.selectPin(pinId)
}

const handlePinDelete = async (pinId) => {
  await pinboardStore.deletePin(pinId)
}

const handleViewportChange = (newViewport) => {
  pinboardStore.setViewport(newViewport)
}

const handleDeleteSelected = async () => {
  for (const pinId of selectedPinIds) {
    await pinboardStore.deletePin(pinId)
  }
  pinboardStore.clearSelection()
}

const handleZoom = (direction) => {
  let newScale = viewport.scale
  if (direction === 'in') newScale = Math.min(viewport.scale * 1.1, 3)
  else if (direction === 'out') newScale = Math.max(viewport.scale * 0.9, 0.1)
  else if (direction === 'reset') newScale = 1
  pinboardStore.setViewport({ x: viewport.x, y: viewport.y, scale: newScale })
}
</script>

<style scoped>
.pinboard {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-color: #1a1a1a;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pinboard-toolbar {
  flex: 0 0 56px;
  height: 56px;
  z-index: 2;
}

.pinboard-main {
  flex: 1 1 0;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.pinboard-header {
  padding: 1rem;
  background-color: #2a2a2a;
  border-bottom: 1px solid #333;
}
</style>

