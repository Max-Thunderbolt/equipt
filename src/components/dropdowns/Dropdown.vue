<template>
  <div ref="dropdownRef" class="dropdown">
    <div class="dropdown-caret" />
    <div class="dropdown-menu">
      <template v-for="(item, index) in items" :key="index">
        <!-- Link: navigate on click -->
        <button
          v-if="item.type === 'link'"
          type="button"
          class="dropdown-item"
          :class="{ 'dropdown-item--highlight': item.highlight }"
          @click="onSelect(item)"
        >
          {{ item.name }}
        </button>
        <!-- Button: emit only (e.g. actions) -->
        <button
          v-else-if="item.type === 'button'"
          type="button"
          class="dropdown-item"
          :class="{ 'dropdown-item--highlight': item.highlight }"
          @click="onSelect(item)"
        >
          {{ item.name }}
        </button>
        <!-- Divider -->
        <div v-else-if="item.type === 'divider'" class="dropdown-divider" />
        <!-- Special section: invites (or other types by name) -->
        <div v-else-if="item.type === 'invites'" class="dropdown-section">
          <v-icon v-if="item.icon" :color="item.iconColor || '#7dd3fc'" size="24">{{ item.icon }}</v-icon>
          <span>{{ item.name }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  open: { type: Boolean, default: true },
  /** List of items. Each has type and name. Types: 'link' | 'button' | 'divider' | 'invites'
   * link: { type: 'link', name: string, to: string, query?: object, highlight?: boolean }
   * button: { type: 'button', name: string, highlight?: boolean }
   * divider: { type: 'divider' }
   * invites: { type: 'invites', name: string, icon?: string, iconColor?: string }
   */
  items: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'select'])
const router = useRouter()
const dropdownRef = ref(null)

function onSelect(item) {
  if (item.type === 'link' && item.to != null) {
    router.push({ path: item.to, query: item.query || {} })
  }
  emit('select', item)
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
.dropdown {
  position: absolute;
  top: calc(100% + 0.125rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}
</style>
