<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './supabase/config'
import Navigation from './components/layout/Navigation.vue'
import DefaultLayout from './components/layout/DefaultLayout.vue'
import Toast from './components/Toast.vue'
import { useUiStore } from './stores/ui.js'

const router = useRouter()
const isOnline = ref(navigator.onLine)
const isVisible = ref(!document.hidden)
const uiStore = useUiStore()

// Handle online/offline status
const handleOnlineStatus = () => {
  isOnline.value = navigator.onLine
  if (isOnline.value) {
    // Attempt to refresh session when coming back online
    refreshSession()
  }
}

// Handle visibility change
const handleVisibilityChange = async () => {
  isVisible.value = !document.hidden
  if (isVisible.value && isOnline.value) {
    // Remove all known overlay/modal classes
    document.body.classList.remove('modal-open', 'modal-active', 'v--modal-open', 'v--modal-overlay');
    // Remove overlays by selector if present
    document.querySelectorAll('.modal, .overlay, .v--modal-overlay').forEach(el => {
      el.parentNode && el.parentNode.removeChild(el);
    });
    // Emit a custom event to close all modals
    window.dispatchEvent(new Event('close-all-modals'));
    await refreshSession()
  }
}

// Centralized session refresh function
const refreshSession = async () => {
  try {
    // First check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Error getting session:', sessionError)
      return
    }

    if (session) {
      // Check if session is expired or about to expire
      const expiresAt = session.expires_at
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = expiresAt - now

      // If session is expired or will expire in the next 5 minutes, refresh it
      if (timeUntilExpiry < 300) {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          console.error('Error refreshing session:', refreshError)
          // If refresh fails, try to recover by getting a new session
          await recoverSession()
        }
      }
    } else {
      // No session found, try to recover
      await recoverSession()
    }
  } catch (err) {
    console.error('Error in session refresh:', err)
    await recoverSession()
  }
}

// Session recovery function
const recoverSession = async () => {
  try {
    // Try to get a new session
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error recovering session:', error)
      // If we can't recover the session, redirect to login
      router.push('/login')
    }
  } catch (err) {
    console.error('Error in session recovery:', err)
    router.push('/login')
  }
}

// Setup event listeners and initial state
onMounted(async () => {
  try {
    // Add event listeners
    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Initial session check
    await refreshSession()
    
    // Handle OAuth callback
    if (window.location.hash && window.location.hash.includes('access_token')) {
      console.log('Found access token in hash')
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')
      const provider_token = hashParams.get('provider_token')
      const provider_refresh_token = hashParams.get('provider_refresh_token')
      
      if (access_token) {
        try {
          console.log('Setting session with tokens:', { 
            access_token: access_token.substring(0, 10) + '...',
            refresh_token: refresh_token ? 'present' : 'missing',
            provider_token: provider_token ? 'present' : 'missing'
          })

          // Store provider tokens if present
          if (provider_token) {
            localStorage.setItem('provider_token', provider_token)
          }
          if (provider_refresh_token) {
            localStorage.setItem('provider_refresh_token', provider_refresh_token)
          }

          // Set the session with the tokens
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })
          
          if (error) {
            console.error('Error setting session:', error)
            throw error
          }

          console.log('Session set successfully:', session)
          
          // Clear the hash and navigate to home
          window.location.hash = ''
          router.push('/')
        } catch (err) {
          console.error('Error in OAuth callback:', err)
          console.error('Error details:', {
            name: err.name,
            message: err.message,
            stack: err.stack
          })
        }
      }
    }
  } catch (err) {
    console.error('Error in App setup:', err)
  }
})

// Cleanup
onUnmounted(() => {
  window.removeEventListener('online', handleOnlineStatus)
  window.removeEventListener('offline', handleOnlineStatus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="app">
    <Navigation v-if="uiStore.showTopNav" />
    <DefaultLayout>
      <router-view />
    </DefaultLayout>
    <Toast />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
