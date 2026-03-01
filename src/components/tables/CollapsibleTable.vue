<template>
  <div class="collapsible-table" :class="{ 'is-open': isOpen }">
    <button type="button" class="table-group-header" @click="toggle">
      <div class="group-info">
        <v-icon class="group-chevron" :class="{ 'rotated': !isOpen }">mdi-chevron-down</v-icon>
        <span class="group-title" :style="{ color: color }">{{ title }}</span>
        <span class="group-count">{{ items.length }}</span>
      </div>
      <div class="group-actions">
        <slot name="actions"></slot>
      </div>
    </button>

    <div v-show="isOpen" class="table-body">
      <div v-if="headers.length" class="table-headers" :style="gridStyle">
        <div v-for="(header, index) in headers" :key="index" class="header-cell"
          :class="typeof header === 'object' ? header.class : ''">
          {{ typeof header === 'object' ? header.label : header }}
        </div>
      </div>

      <div class="table-rows">
        <div v-for="item in items" :key="item.id || item._id" class="table-row" :style="gridStyle">
          <slot name="row" :item="item">
            <!-- Default row rendering if slot not used -->
            <div v-for="(header, index) in headers" :key="index" class="cell">
              {{ typeof header === 'object' ? item[header.key] : item[header] }}
            </div>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  },
  headers: {
    type: Array,
    default: () => []
  },
  gridStyle: {
    type: Object,
    default: () => ({ gridTemplateColumns: '1fr' })
  },
  color: {
    type: String,
    default: 'inherit'
  },
  initialOpen: {
    type: Boolean,
    default: true
  }
})

const isOpen = ref(props.initialOpen)

const toggle = () => {
  isOpen.value = !isOpen.value
}
</script>

<style scoped>
.collapsible-table {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
  background: var(--glass-gradient-grey);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 16px;
  overflow: hidden;
}

.table-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.2s;
  color: var(--color-text);
  font-family: var(--font-sans);
}

.table-group-header:hover {
  background: rgba(255, 255, 255, 0.08);
}

.group-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.group-chevron {
  transition: transform 0.2s;
  color: var(--color-text-secondary);
}

.group-chevron.rotated {
  transform: rotate(-90deg);
}

.group-title {
  font-weight: 600;
  font-size: 0.9375rem;
}

.group-count {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}

.table-body {
  display: flex;
  flex-direction: column;
}

.table-headers {
  display: grid;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.02);
  border: var(--glass-border);
  padding: 1rem;
  margin: 0.5rem;
}

.table-row {
  display: grid;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
  transition: all 0.2s;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.02);
  border: var(--glass-border);
  padding: 1rem;
  margin: 0.5rem;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.header-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
