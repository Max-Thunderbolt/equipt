<template>
  <div class="minimap" ref="minimapRef">
    <div class="minimap-content" :style="contentStyle">
      <div
        v-for="pin in pins"
        :key="pin.id"
        class="minimap-pin"
        :style="{
          left: `${pin.x * scale}px`,
          top: `${pin.y * scale}px`,
          backgroundColor: pin.color || '#4CAF50'
        }"
      />
      <svg class="minimap-links">
        <path
          v-for="link in pinLinks"
          :key="link.id"
          :d="getLinkPath(link)"
          class="minimap-link"
        />
      </svg>
    </div>
    <div
      class="minimap-viewport"
      :style="viewportStyle"
      @mousedown="handleViewportDragStart"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

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

const emit = defineEmits(['viewport-change'])

const minimapRef = ref(null)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const scale = computed(() => 0.1) // 10% of actual size

const contentStyle = computed(() => {
  const maxX = Math.max(...props.pins.map(p => p.x + 200), 0)
  const maxY = Math.max(...props.pins.map(p => p.y + 100), 0)
  
  return {
    width: `${maxX * scale.value}px`,
    height: `${maxY * scale.value}px`
  }
})

const viewportStyle = computed(() => {
  const minimap = minimapRef.value
  if (!minimap) return {}
  
  const rect = minimap.getBoundingClientRect()
  const width = rect.width * props.viewport.scale
  const height = rect.height * props.viewport.scale
  
  return {
    left: `${-props.viewport.x * scale.value}px`,
    top: `${-props.viewport.y * scale.value}px`,
    width: `${width}px`,
    height: `${height}px`
  }
})

const getLinkPath = (link) => {
  const sourcePin = props.pins.find(p => p.id === link.source_pin_id)
  const targetPin = props.pins.find(p => p.id === link.target_pin_id)
  
  if (!sourcePin || !targetPin) return ''
  
  const start = {
    x: (sourcePin.x + 100) * scale.value,
    y: (sourcePin.y + 50) * scale.value
  }
  
  const end = {
    x: (targetPin.x + 100) * scale.value,
    y: (targetPin.y + 50) * scale.value
  }
  
  const controlPoint1 = {
    x: start.x + (end.x - start.x) * 0.5,
    y: start.y
  }
  
  const controlPoint2 = {
    x: start.x + (end.x - start.x) * 0.5,
    y: end.y
  }
  
  return `M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${end.x} ${end.y}`
}

const handleViewportDragStart = (e) => {
  isDragging.value = true
  dragStart.value = {
    x: e.clientX,
    y: e.clientY
  }
  
  document.addEventListener('mousemove', handleViewportDrag)
  document.addEventListener('mouseup', handleViewportDragEnd)
}

const handleViewportDrag = (e) => {
  if (isDragging.value) {
    const dx = (e.clientX - dragStart.value.x) / scale.value
    const dy = (e.clientY - dragStart.value.y) / scale.value
    
    emit('viewport-change', {
      x: props.viewport.x - dx,
      y: props.viewport.y - dy,
      scale: props.viewport.scale
    })
    
    dragStart.value = {
      x: e.clientX,
      y: e.clientY
    }
  }
}

const handleViewportDragEnd = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleViewportDrag)
  document.removeEventListener('mouseup', handleViewportDragEnd)
}
</script>

<style scoped>
.minimap {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.minimap-content {
  position: absolute;
  top: 0;
  left: 0;
}

.minimap-pin {
  position: absolute;
  width: 20px;
  height: 10px;
  border-radius: 2px;
  opacity: 0.8;
}

.minimap-links {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.minimap-link {
  fill: none;
  stroke: #666;
  stroke-width: 1;
  opacity: 0.5;
}

.minimap-viewport {
  position: absolute;
  border: 2px solid #2196F3;
  cursor: move;
}
</style>
