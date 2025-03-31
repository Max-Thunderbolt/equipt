import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase/config'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomePage.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfilePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('../views/ProjectsPage.vue')
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetails',
    component: () => import('../views/ProjectDetails.vue')
  },
  {
    path: '/files',
    name: 'Files',
    component: () => import('../views/FilesPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/explore',
    name: 'Explore',
    component: () => import('../views/ExplorePage.vue')
  },
  {
    path: '/showcase',
    name: 'Showcase',
    component: () => import('../views/ShowcasePage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Handle authentication
router.beforeEach(async (to, from, next) => {
  try {
    // Check if we have an access token in the URL
    if (window.location.hash && window.location.hash.includes('access_token')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')
      const expires_in = hashParams.get('expires_in')
      const provider_token = hashParams.get('provider_token')
      const provider_refresh_token = hashParams.get('provider_refresh_token')
      
      if (access_token) {
        // Set the session in Supabase
        const { data: { session }, error } = await supabase.auth.setSession({
          access_token,
          refresh_token
        })
        
        if (!error && session) {
          // Store additional tokens if needed
          if (provider_token) {
            localStorage.setItem('provider_token', provider_token)
          }
          if (provider_refresh_token) {
            localStorage.setItem('provider_refresh_token', provider_refresh_token)
          }

          // Clear the hash and reload to ensure clean state
          window.location.hash = ''
          window.location.reload()
          return
        }
      }
    }

    // Check if the route requires authentication
    const { data: { session } } = await supabase.auth.getSession()
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

    if (requiresAuth && !session) {
      next('/')
    } else {
      next()
    }
  } catch (error) {
    console.error('Auth error:', error)
    next('/')
  }
})

export default router 