<template>
  <div v-if="isPinboardOpen" class="pinboard-modal">
    <div class="pinboard-content">
      <!-- Pinboard Header -->
      <div class="pinboard-header">
        <button @click="closePinboard">Close</button>
        <h2>Pinboard</h2>
      </div>
      <!-- Pinboard Body -->
      <div class="pinboard-body">
        <!-- Render pins here -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isPinboardOpen = ref(false)

const openPinboard = () => {
  isPinboardOpen.value = true
}

const closePinboard = () => {
  isPinboardOpen.value = false
}
</script>

<style scoped>
.pinboard-modal {
  position: fixed;
  top: 60px; /* Adjust based on navbar height */
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pinboard-content {
  background: white;
  width: 90%;
  height: 90%;
  border-radius: 8px;
  overflow: hidden;
}

.pinboard-header {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background-color: #f5f5f5;
}

.pinboard-body {
  padding: 1rem;
  overflow-y: auto;
}
</style> 