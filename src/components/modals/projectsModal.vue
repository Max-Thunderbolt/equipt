<template>
  <div ref="dropdownRef" class="projects-dropdown">
    <div class="projects-dropdown-caret" />
    <div class="projects-dropdown-menu">
      <button type="button" class="projects-dropdown-item projects-dropdown-item--highlight"
        @click="selectListItem(listItems[0])">
        New Project
      </button>
      <button type="button" class="projects-dropdown-item" @click="selectListItem(listItems[1])">
        My Projects
      </button>
      <div class="projects-dropdown-divider" />
      <div class="projects-dropdown-invites">
        <v-icon color="#7dd3fc" size="24">mdi-email-outline</v-icon>
        <span>No pending invites</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  open: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])

const dropdownRef = ref(null)

const listItems = ref([
  { id: 1, name: 'Create New Project' },
  { id: 2, name: 'My Projects' },
])

function selectListItem(listItem) {
  console.log(listItem)
  emit('close')
}

function onDocumentClick(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    emit('close')
  }
}

onMounted(() => {
  setTimeout(() => {
    document.addEventListener('click', onDocumentClick, true)
  }, 0)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick, true)
})
</script>

<style scoped>
.projects-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.projects-dropdown-caret {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(255, 255, 255, 0.95);
  filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.08));
}

.projects-dropdown-menu {
  background: var(--glass-gradient);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-card);
  padding: 0.5rem 0;
  min-width: 200px;
}

.projects-dropdown-item {
  font-family: var(--font-sans), sans-serif !important;
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: #fff;
}

.projects-dropdown-item:hover,
.projects-dropdown-item--highlight:hover {
  border-radius: 9999px;
  background: linear-gradient(180deg,
      rgba(121, 121, 183, 0.35) 0%,
      rgba(242, 104, 55, 0.35) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  padding: 0.5rem 1rem;
}

.projects-dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0.25rem 0;
}

.projects-dropdown-invites {
  font-family: var(--font-sans), sans-serif !important;
  background: var(--glass-gradient);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #fff;
}
</style>