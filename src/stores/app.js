// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    projectNavOpen: false,
  }),
  actions: {
    toggleProjectNav() {
      this.projectNavOpen = !this.projectNavOpen
    },
    closeProjectNav() {
      this.projectNavOpen = false
    },
  },
})
