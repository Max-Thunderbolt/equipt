import { ref } from 'vue'

const toast = ref(null)
const toastTimeout = ref(null)

export function useToast() {
  function showToast(message, type = 'info', duration = 3000) {
    if (toastTimeout.value) {
      clearTimeout(toastTimeout.value)
    }

    toast.value = {
      message,
      type,
      show: true
    }

    toastTimeout.value = setTimeout(() => {
      toast.value.show = false
    }, duration)
  }

  return {
    toast,
    showToast
  }
} 