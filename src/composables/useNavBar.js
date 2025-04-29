import { ref, computed } from 'vue'

// Default nav bar height (px)
const DEFAULT_NAVBAR_HEIGHT = 72

// Global reactive state
const navBarHeight = ref(DEFAULT_NAVBAR_HEIGHT)
const navBarOpacity = ref(1)

export function useNavBar() {
  // Set nav bar height (px)
  function setNavBarHeight(height) {
    navBarHeight.value = height
  }
  // Set nav bar opacity (0-1)
  function setNavBarOpacity(opacity) {
    navBarOpacity.value = opacity
  }
  // Optionally, expose a computed for dynamic height based on opacity
  const dynamicNavBarHeight = computed(() => navBarOpacity.value * DEFAULT_NAVBAR_HEIGHT)

  return {
    navBarHeight,
    navBarOpacity,
    setNavBarHeight,
    setNavBarOpacity,
    dynamicNavBarHeight,
    DEFAULT_NAVBAR_HEIGHT
  }
} 