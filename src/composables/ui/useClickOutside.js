import { onMounted, onUnmounted } from 'vue'

/**
 * Calls onClickOutside when a click occurs outside the given element.
 * Uses capture phase and a deferred listener so the click that opened the dropdown doesn't immediately close it.
 *
 * @param {import('vue').Ref<HTMLElement | null>} elementRef - Ref to the element to detect outside clicks for
 * @param {() => void} onClickOutside - Callback when a click outside the element is detected
 */
export function useClickOutside(elementRef, onClickOutside) {
  function handleDocumentClick(event) {
    if (elementRef.value && !elementRef.value.contains(event.target)) {
      onClickOutside()
    }
  }

  onMounted(() => {
    setTimeout(() => {
      document.addEventListener('click', handleDocumentClick, true)
    }, 0)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleDocumentClick, true)
  })
}
