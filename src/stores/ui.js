import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const showTopNav = ref(true)
  const showSideNav = ref(true)

  function showNavs() {
    showTopNav.value = true
    showSideNav.value = true
  }

  function hideNavs() {
    showTopNav.value = false
    showSideNav.value = false
  }

  function setTopNav(visible) {
    showTopNav.value = visible
  }

  function setSideNav(visible) {
    showSideNav.value = visible
  }

  return {
    showTopNav,
    showSideNav,
    showNavs,
    hideNavs,
    setTopNav,
    setSideNav
  }
}) 