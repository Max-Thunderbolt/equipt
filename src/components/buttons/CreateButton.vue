<template>
  <button type="button" class="create-button" @click="$emit('click')">
    <v-icon v-if="icon" size="20" class="create-button__icon">{{ icon }}</v-icon>
    {{ name }}
  </button>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  }
})

defineEmits(['click'])
</script>

<style scoped>
.create-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: var(--equipt-orange);
  color: white;
  border: none;
  border-radius: 9999px;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(237, 150, 62, 0.2);
}

.create-button:hover {
  background: var(--color-equipt-orange-90);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(237, 150, 62, 0.3);
}

.create-button:active {
  transform: translateY(0);
}

.create-button__icon {
  color: inherit;
}
</style>
