<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './supabase/config'
import Navigation from './components/layout/Navigation.vue'
import Toast from './components/ui/Toast.vue'

const router = useRouter()

onMounted(async () => {
  try {
    // First check if we already have a session
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    
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
</script>

<template>
  <div class="app">
    <Navigation />
    <main class="main-content">
      <router-view />
    </main>
    <Toast />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 2rem 0;
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
