<template>
  <svg class="pin-link" :style="svgStyle">
    <path
      :d="pathData"
      class="pin-link-path"
      :class="{ 'pin-link-path--selected': isSelected }"
      @click="handleClick"
    />
    <circle
      v-if="isSelected"
      class="pin-link-handle"
      :cx="midpoint.x"
      :cy="midpoint.y"
      r="6"
      @mousedown="handleHandleMouseDown"
    />
  </svg>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  link: {
    type: Object,
    required: true
  },
  pins: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['delete'])

const sourcePin = computed(() => props.pins.find(p => p.id === props.link.source_pin_id))
const targetPin = computed(() => props.pins.find(p => p.id === props.link.target_pin_id))

const isSelected = ref(false)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const midpoint = computed(() => {
  if (!sourcePin.value || !targetPin.value) return { x: 0, y: 0 }
  
  return {
    x: (sourcePin.value.x + targetPin.value.x) / 2,
    y: (sourcePin.value.y + targetPin.value.y) / 2
  }
})

const pathData = computed(() => {
  if (!sourcePin.value || !targetPin.value) return ''
  
  const start = {
    x: sourcePin.value.x + 100, // Half of pin width
    y: sourcePin.value.y + 50   // Half of pin height
  }
  
  const end = {
    x: targetPin.value.x + 100,
    y: targetPin.value.y + 50
  }
  
  // Create a curved path
  const controlPoint1 = {
    x: start.x + (end.x - start.x) * 0.5,
    y: start.y
  }
  
  const controlPoint2 = {
    x: start.x + (end.x - start.x) * 0.5,
    y: end.y
  }
  
  return `M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${end.x} ${end.y}`
})

const svgStyle = computed(() => {
  if (!sourcePin.value || !targetPin.value) return {}
  
  const minX = Math.min(sourcePin.value.x, targetPin.value.x)
  const minY = Math.min(sourcePin.value.y, targetPin.value.y)
  const maxX = Math.max(sourcePin.value.x + 200, targetPin.value.x + 200)
  const maxY = Math.max(sourcePin.value.y + 100, targetPin.value.y + 100)
  
  return {
    position: 'absolute',
    left: `${minX}px`,
    top: `${minY}px`,
    width: `${maxX - minX}px`,
    height: `${maxY - minY}px`,
    pointerEvents: 'all'
  }
})

const handleClick = (e) => {
  if (e.ctrlKey || e.metaKey) {
    emit('delete', props.link.id)
  } else {
    isSelected.value = !isSelected.value
  }
}

const handleHandleMouseDown = (e) => {
  isDragging.value = true
  dragStart.value = {
    x: e.clientX,
    y: e.clientY
  }
  
  document.addEventListener('mousemove', handleHandleMouseMove)
  document.addEventListener('mouseup', handleHandleMouseUp)
}

const handleHandleMouseMove = (e) => {
  if (isDragging.value) {
    const dx = e.clientX - dragStart.value.x
    const dy = e.clientY - dragStart.value.y
    
    // Update the link's control points
    // This would require updating the link in the store
    // For now, we'll just update the visual position
    dragStart.value = {
      x: e.clientX,
      y: e.clientY
    }
  }
}

const handleHandleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleHandleMouseMove)
  document.removeEventListener('mouseup', handleHandleMouseUp)
}
</script>

<style scoped>
.pin-link {
  position: absolute;
  pointer-events: none;
}

.pin-link-path {
  fill: none;
  stroke: #666;
  stroke-width: 2;
  pointer-events: all;
  cursor: pointer;
  transition: stroke 0.2s ease;
}

.pin-link-path:hover {
  stroke: #2196F3;
}

.pin-link-path--selected {
  stroke: #2196F3;
  stroke-width: 3;
}

.pin-link-handle {
  fill: #2196F3;
  cursor: move;
}
</style>
