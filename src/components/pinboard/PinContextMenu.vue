<template>
  <div class="pin-context-menu" :style="menuStyle">
    <div class="menu-item" @click="handleDelete">
      <span class="icon">🗑️</span>
      <span class="label">Delete Selected</span>
    </div>
    <div class="menu-item" @click="handleCreateLink">
      <span class="icon">🔗</span>
      <span class="label">Link Selected</span>
    </div>
    <div class="menu-item" @click="handleClearSelection">
      <span class="icon">✖️</span>
      <span class="label">Clear Selection</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePinboardStore } from '../../stores/pinboard'

const props = defineProps({
  selectedPinIds: {
    type: Set,
    required: true
  }
})

const emit = defineEmits(['delete'])

const pinboardStore = usePinboardStore()

const menuStyle = computed(() => {
  return {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  }
})

const handleDelete = () => {
  emit('delete')
}

const handleCreateLink = () => {
  if (props.selectedPinIds.size === 2) {
    const [sourceId, targetId] = Array.from(props.selectedPinIds)
    pinboardStore.createPinLink({
      source_pin_id: sourceId,
      target_pin_id: targetId
    })
  }
}

const handleClearSelection = () => {
  pinboardStore.clearSelection()
}
</script>

<style scoped>
.pin-context-menu {
  background-color: #2a2a2a;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  padding: 8px;
  z-index: 1000;
  border: 1px solid #333;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #ffffff;
}

.menu-item:hover {
  background-color: #333;
  color: #ff6b00;
}

.menu-item .icon {
  font-size: 1.2em;
}

.menu-item .label {
  font-size: 0.9em;
}
</style>


