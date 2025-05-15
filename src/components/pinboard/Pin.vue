<template>
  <div
    class="pin"
    :class="{ 'pin--selected': isSelected }"
    :style="{
      left: `${pin.x}px`,
      top: `${pin.y}px`,
      backgroundColor: pin.color || '#4CAF50'
    }"
    @mousedown.stop="handleMouseDown"
    @click.stop="handleClick"
  >
    <div class="pin-content">
      <div class="pin-header">
        <span class="pin-title">{{ pin.title }}</span>
        <button class="pin-delete" @click.stop="handleDelete">×</button>
      </div>
      <div class="pin-body">
        <p v-if="pin.description" class="pin-description">{{ pin.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  pin: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['move', 'select', 'delete'])

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const handleMouseDown = (e) => {
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - props.pin.x,
    y: e.clientY - props.pin.y
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (e) => {
  if (isDragging.value) {
    const newPosition = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y
    }
    emit('move', props.pin.id, newPosition)
  }
}

const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

const handleClick = () => {
  emit('select', props.pin.id)
}

const handleDelete = () => {
  emit('delete', props.pin.id)
}
</script>

<style scoped>
.pin {
  position: absolute;
  width: 200px;
  min-height: 100px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  cursor: move;
  user-select: none;
  transition: all 0.2s ease;
  background-color: #2a2a2a;
  border: 1px solid #333;
}

.pin--selected {
  box-shadow: 0 0 0 2px #ff6b00;
  border-color: #ff6b00;
}

.pin-content {
  padding: 12px;
  color: #ffffff;
}

.pin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
}

.pin-title {
  font-weight: bold;
  font-size: 1.1em;
  color: #ffffff;
}

.pin-delete {
  background: none;
  border: none;
  color: #ff6b00;
  font-size: 1.5em;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.pin-delete:hover {
  opacity: 1;
}

.pin-body {
  font-size: 0.9em;
  color: #cccccc;
}

.pin-description {
  margin: 0;
  word-break: break-word;
}
</style>
