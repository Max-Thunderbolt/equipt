import { ref } from 'vue'

const isMobileMenuOpen = ref(false)

export function useNavigation() {
  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false
  }

  return {
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu
  }
} 