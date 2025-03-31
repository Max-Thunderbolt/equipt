<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useProfile } from '../../composables/useProfile'
import { useProjects } from '../../composables/useProjects'
import NewProjectModal from '../modals/NewProjectModal.vue'
import AuthModal from '../modals/AuthModal.vue'
import { supabase } from '../../supabase/config'

const { user, session } = useAuth()
const { profile, fetchProfile } = useProfile()
const { createProject, loading: projectLoading, error: projectError } = useProjects()

// Watch for user changes to fetch profile
watch(() => user.value?.id, async (newUserId) => {
  if (newUserId) {
    await fetchProfile()
  }
}, { immediate: true })

// Initialize auth state
onMounted(async () => {
  const { data: { session: currentSession } } = await supabase.auth.getSession()
  if (currentSession?.user) {
    await fetchProfile()
  }
}) 

const navigationItems = ref([
  { name: 'Projects', path: '/projects' },
  { name: 'Explore', path: '/explore' },
  { name: 'Showcase', path: '/showcase' }
])

// Add computed property to determine navigation items based on auth state
const displayNavItems = computed(() => {
  // Basic navigation items for everyone
  const items = [...navigationItems.value]
  
  // Add Files link only for authenticated users
  if (user.value) {
    items.splice(1, 0, { name: 'Files', path: '/files' })
  }
  
  return items
})

const isNewProjectModalOpen = ref(false)
const isAuthModalOpen = ref(false)

const displayName = computed(() => {
  if (!user.value) return ''
  return profile.value?.display_name || 
         user.value.user_metadata?.full_name || 
         user.value.user_metadata?.name ||
         user.value.email?.split('@')[0] || 
         'User'
})

const avatarUrl = computed(() => {
  if (!user.value) return null
  return profile.value?.avatar_url || 
         user.value.user_metadata?.avatar_url || 
         user.value.user_metadata?.picture ||
         null
})

const handleNewProject = async (projectData) => {
  if (!user.value) {
    isAuthModalOpen.value = true
    return
  }
  
  try {
    console.log('Creating project with data:', projectData)
    const result = await createProject(projectData, user.value.id)
    console.log('Project creation result:', result)
    isNewProjectModalOpen.value = false
    // Optionally, redirect to the new project or refresh the projects list
  } catch (err) {
    console.error('Failed to create project:', err)
  }
}

const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear any stored tokens
    localStorage.removeItem('provider_token')
    localStorage.removeItem('provider_refresh_token')
    
    // Reload the page to ensure clean state
    window.location.reload()
  } catch (error) {
    console.error('Logout error:', error)
  }
}
</script>

<template>
  <nav class="nav-container">
    <div class="container flex items-center justify-between">
      <div class="nav-brand">
        <router-link to="/" class="brand-link">
          <h1 class="brand-text">equipt.</h1>
        </router-link>
      </div>
      
      <div class="nav-items">
        <router-link 
          v-for="item in displayNavItems" 
          :key="item.path"
          :to="item.path"
          class="nav-item"
        >
          {{ item.name }}
        </router-link>
      </div>

      <div class="nav-actions">
        <template v-if="user">
          <button 
            class="btn btn-primary new-project-btn"
            @click="isNewProjectModalOpen = true"
          >
            <span class="icon">+</span>
            New Project
          </button>
          
          <div class="user-menu">
            <router-link to="/profile" class="user-profile">
              <div v-if="avatarUrl" class="avatar">
                <img :src="avatarUrl" :alt="displayName" referrerpolicy="no-referrer">
              </div>
              <div v-else class="avatar-placeholder">
                {{ displayName[0]?.toUpperCase() }}
              </div>
              <span class="user-name">{{ displayName }}</span>
            </router-link>
            <button 
              class="btn btn-secondary"
              @click="handleLogout"
            >
              Sign Out
            </button>
          </div>
        </template>
        
        <template v-else>
          <button 
            class="btn btn-primary"
            @click="isAuthModalOpen = true"
          >
            Sign In
          </button>
        </template>
      </div>
    </div>
  </nav>

  <NewProjectModal 
    :is-open="isNewProjectModalOpen"
    @close="isNewProjectModalOpen = false"
    @submit="handleNewProject"
  />

  <AuthModal
    :is-open="isAuthModalOpen"
    @close="isAuthModalOpen = false"
  />
</template>

<style scoped>
.nav-container {
  background-color: var(--primary-dark);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand-link {
  text-decoration: none;
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.nav-items {
  display: flex;
  gap: 2rem;
}

.nav-item {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.nav-item:hover,
.nav-item.router-link-active {
  color: var(--text-primary);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-profile {
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.user-profile:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--secondary-dark);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-blue);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.user-name {
  color: var(--text-primary);
  font-weight: 500;
}

.new-project-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.new-project-btn .icon {
  font-size: 1.25rem;
  line-height: 1;
}
</style>