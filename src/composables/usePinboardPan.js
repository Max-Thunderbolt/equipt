import { ref } from 'vue'

export function usePinboardPan() {
  const isPanning = ref(false)
  const panStart = ref({ x: 0, y: 0 })
  const scrollStart = ref({ left: 0, top: 0 })
  const pinsContainerRef = ref(null)

  const startPan = (event) => {
    console.log('startPan called', {
      target: event.target,
      currentTarget: event.currentTarget,
      isDirectClick: event.target === event.currentTarget
    })

    // Only start panning if clicking directly on the container
    if (event.target !== event.currentTarget) {
      console.log('Not starting pan - clicked on child element')
      return
    }
    
    isPanning.value = true
    panStart.value = { x: event.clientX, y: event.clientY }
    
    const container = pinsContainerRef.value
    if (container) {
      scrollStart.value = { left: container.scrollLeft, top: container.scrollTop }
      container.style.cursor = 'grabbing'
      container.style.userSelect = 'none'
      console.log('Pan started', {
        startPosition: panStart.value,
        scrollStart: scrollStart.value,
        container: container
      })
    } else {
      console.warn('Container reference is null')
    }
    
    event.preventDefault()
  }

  const onPan = (event) => {
    if (!isPanning.value) {
      console.log('onPan called but not panning')
      return
    }
    
    if (!pinsContainerRef.value) {
      console.warn('Container reference is null during pan')
      return
    }
    
    const container = pinsContainerRef.value
    const dx = event.clientX - panStart.value.x
    const dy = event.clientY - panStart.value.y
    
    console.log('Panning', {
      dx,
      dy,
      newScrollLeft: scrollStart.value.left - dx,
      newScrollTop: scrollStart.value.top - dy
    })
    
    container.scrollLeft = scrollStart.value.left - dx
    container.scrollTop = scrollStart.value.top - dy
    
    event.preventDefault()
  }

  const endPan = () => {
    console.log('endPan called', { isPanning: isPanning.value })
    
    if (!isPanning.value) return
    
    isPanning.value = false
    const container = pinsContainerRef.value
    if (container) {
      container.style.cursor = 'grab'
      container.style.userSelect = ''
      console.log('Pan ended', {
        finalScrollLeft: container.scrollLeft,
        finalScrollTop: container.scrollTop
      })
    }
  }

  return {
    isPanning,
    pinsContainerRef,
    startPan,
    onPan,
    endPan
  }
} 