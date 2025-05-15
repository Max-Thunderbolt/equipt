<template>
  <Transition name="toast">
    <div
      v-if="toast?.show"
      :class="[
        'toast-notification',
        typeClasses[toast.type] || typeClasses.info
      ]"
    >
      <div class="toast-content">
        <span class="toast-icon">{{ typeIcons[toast.type] || typeIcons.info }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useToast } from '../composables/useToast'

const { toast } = useToast()

const typeClasses = {
  success: 'toast-success',
  error: 'toast-error',
  info: 'toast-info',
  warning: 'toast-warning'
}

const typeIcons = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️'
}
</script>

<style scoped>
.toast-notification {
  @apply fixed bottom-4 right-4 z-50 max-w-sm rounded-lg shadow-lg;
  background: linear-gradient(to bottom, var(--secondary-dark), rgba(30, 30, 36, 1));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}

.toast-content {
  @apply flex items-center gap-3 p-4;
}

.toast-icon {
  @apply flex-shrink-0;
  font-size: 1.2rem;
}

.toast-message {
  @apply text-sm font-medium text-white;
  line-height: 1.4;
}

/* Toast types */
.toast-success {
  border-left: 4px solid #10B981;
}

.toast-error {
  border-left: 4px solid #EF4444;
}

.toast-info {
  border-left: 4px solid #3B82F6;
}

.toast-warning {
  border-left: 4px solid #F59E0B;
}

/* Animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) translateY(0);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) translateY(0);
}
</style> 