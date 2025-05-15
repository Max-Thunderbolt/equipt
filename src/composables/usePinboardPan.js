import { ref } from 'vue'

export function usePinboardPan() {
  const isPanning = ref(false)
  const panStart = ref({ x: 0, y: 0 })
  const scrollStart = ref({ left: 0, top: 0 })
  const pinsContainerRef = ref(null)

  const startPan = (event) => {
    if (event.target === event.currentTarget) {
      isPanning.value = true
      panStart.value = { x: event.clientX, y: event.clientY }
      const container = pinsContainerRef.value
      if (container) {
        scrollStart.value = { left: container.scrollLeft, top: container.scrollTop }
      }
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
      event.preventDefault()
    }
  }

  const onPan = (event) => {
    if (!isPanning.value) return
    const container = pinsContainerRef.value
    if (container) {
      const dx = event.clientX - panStart.value.x
      const dy = event.clientY - panStart.value.y
      container.scrollLeft = scrollStart.value.left - dx
      container.scrollTop = scrollStart.value.top - dy
    }
  }

  const endPan = () => {
    isPanning.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  return {
    isPanning,
    pinsContainerRef,
    startPan,
    onPan,
    endPan
  }
} 