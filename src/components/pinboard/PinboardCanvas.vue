<template>
  <div class="pinboard-canvas" ref="canvasRef">
    <div
      class="canvas-content"
      :style="{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        transformOrigin: '0 0'
      }"
    >
      <PinLink
        v-for="link in pinLinks"
        :key="link.id"
        :link="link"
        :pins="pins"
        @delete="handleLinkDelete"
      />
      <Pin
        v-for="pin in pins"
        :key="pin.id"
        :pin="pin"
        :is-selected="selectedPinIds.has(pin.id)"
        @move="handlePinMove"
        @select="handlePinSelect"
        @delete="handlePinDelete"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Pin from './Pin.vue'
import PinLink from './PinLink.vue'

const props = defineProps({
  pins: {
    type: Array,
    required: true
  },
  pinLinks: {
    type: Array,
    required: true
  },
  viewport: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['pin-move', 'pin-select', 'pin-delete', 'viewport-change'])

const canvasRef = ref(null)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const selectedPinIds = ref(new Set())

// Event handlers
const handlePinMove = (pinId, position) => {
  emit('pin-move', pinId, position)
}

const handlePinSelect = (pinId) => {
  emit('pin-select', pinId)
}

const handlePinDelete = (pinId) => {
  emit('pin-delete', pinId)
}

const handleLinkDelete = (linkId) => {
  emit('link-delete', linkId)
}

// Canvas interaction handlers
const handleMouseDown = (e) => {
  if (e.target === canvasRef.value) {
    isDragging.value = true
    dragStart.value = {
      x: e.clientX - props.viewport.x,
      y: e.clientY - props.viewport.y
    }
  }
}

const handleMouseMove = (e) => {
  if (isDragging.value) {
    const newViewport = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y,
      scale: props.viewport.scale
    }
    emit('viewport-change', newViewport)
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleWheel = (e) => {
  e.preventDefault()
  const rect = canvasRef.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  const scale = e.deltaY < 0 ? 1.1 : 0.9
  const newScale = Math.min(Math.max(props.viewport.scale * scale, 0.1), 3)
  
  const newViewport = {
    x: mouseX - (mouseX - props.viewport.x) * (newScale / props.viewport.scale),
    y: mouseY - (mouseY - props.viewport.y) * (newScale / props.viewport.scale),
    scale: newScale
  }
  
  emit('viewport-change', newViewport)
}

// Lifecycle hooks
onMounted(() => {
  if (!canvasRef.value) return;
  canvasRef.value.addEventListener('mousedown', handleMouseDown)
  canvasRef.value.addEventListener('mousemove', handleMouseMove)
  canvasRef.value.addEventListener('mouseup', handleMouseUp)
  canvasRef.value.addEventListener('wheel', handleWheel)
})

onUnmounted(() => {
  canvasRef.value.removeEventListener('mousedown', handleMouseDown)
  canvasRef.value.removeEventListener('mousemove', handleMouseMove)
  canvasRef.value.removeEventListener('mouseup', handleMouseUp)
  canvasRef.value.removeEventListener('wheel', handleWheel)
})
</script>

<style scoped>
.pinboard-canvas {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  cursor: grab;
}

.pinboard-canvas:active {
  cursor: grabbing;
}

.canvas-content {
  position: absolute;
  width: 100%;
  height: 100%;
  will-change: transform;
}
</style>
