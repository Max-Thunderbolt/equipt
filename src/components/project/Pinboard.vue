<script setup>
import { ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const { user } = useAuth()
</script>

<template>
  <div class="pinboard">
    <div class="pinboard-header">
      <h2>Project Pinboard</h2>
      <button class="btn-add-pin">
        Add Pin
      </button>
    </div>
    <div class="pinboard-content">
      <!-- New implementation will go here -->
    </div>
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
  width: 100%;
  min-width: 0;
  position: relative;
  z-index: 1000;
}

.pinboard-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-heading);
  flex: 1;
}

.btn-add-pin {
  background-color: var(--color-equipt-orange);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  min-width: 100px;
  transition: background-color 0.2s ease;
  position: relative;
  z-index: 1001;
  margin-left: 16px;
}

.btn-add-pin:hover {
  background-color: var(--color-equipt-orange-90);
}

.pinboard-content {
  flex: 1;
  position: relative;
  overflow: auto;
  width: 100%;
  height: 100%;
}
</style> 