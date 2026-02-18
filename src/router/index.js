import { createRouter, createWebHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import { routes } from 'vue-router/auto-routes'
import { useUserStore } from '@/stores'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
})

// Auth guard: wait for auth to be ready, then enforce meta
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // Wait until Firebase has reported auth state
  if (!userStore.authReady) {
    await new Promise((resolve) => {
      const unwatch = userStore.$subscribe((_, state) => {
        if (state.authReady) {
          unwatch()
          resolve()
        }
      })
      // Fallback timeout if Firebase never reports auth state
      setTimeout(resolve, 10000)
    })
  }

  const requiresAuth = to.meta.requiresAuth === true
  const guestOnly = to.meta.guest === true

  if (requiresAuth && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }
  if (guestOnly && userStore.isLoggedIn) {
    next({ path: (to.query.redirect) || '/' })
    return
  }

  next()
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (localStorage.getItem('vuetify:dynamic-reload')) {
      console.error('Dynamic import error, reloading page did not fix it', err)
    } else {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
