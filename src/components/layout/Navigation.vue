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

// Mobile menu state
const isMobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

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
        <router-link to="/" class="brand-link" @click="closeMobileMenu">
          <h1 class="brand-text">equipt.</h1>
        </router-link>
      </div>
      
      <!-- Mobile menu button -->
      <button class="mobile-menu-btn" @click="toggleMobileMenu">
        <span class="menu-icon"></span>
      </button>
      
      <!-- Desktop navigation -->
      <div class="nav-items desktop-only">
        <router-link 
          v-for="item in displayNavItems" 
          :key="item.path"
          :to="item.path"
          class="nav-item"
        >
          {{ item.name }}
        </router-link>
      </div>

      <div class="nav-actions desktop-only">
        <template v-if="user">
          <button 
            class="btn btn-primary new-project-btn"
            @click="isNewProjectModalOpen = true"
          >
            <span class="icon">+</span>
            <span class="btn-text">New Project</span>
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

    <!-- Mobile menu -->
    <div class="mobile-menu" :class="{ 'is-open': isMobileMenuOpen }">
      <div class="mobile-nav-items">
        <router-link 
          v-for="item in displayNavItems" 
          :key="item.path"
          :to="item.path"
          class="mobile-nav-item"
          @click="closeMobileMenu"
        >
          {{ item.name }}
        </router-link>
      </div>

      <div class="mobile-nav-actions">
        <template v-if="user">
          <button 
            class="btn btn-primary mobile-new-project-btn"
            @click="isNewProjectModalOpen = true"
          >
            <span class="icon">+</span>
            New Project
          </button>
          
          <router-link to="/profile" class="mobile-user-profile" @click="closeMobileMenu">
            <div v-if="avatarUrl" class="avatar">
              <img :src="avatarUrl" :alt="displayName" referrerpolicy="no-referrer">
            </div>
            <div v-else class="avatar-placeholder">
              {{ displayName[0]?.toUpperCase() }}
            </div>
            <span class="user-name">{{ displayName }}</span>
          </router-link>
          
          <button 
            class="btn btn-secondary mobile-sign-out"
            @click="handleLogout"
          >
            Sign Out
          </button>
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
  background-color: var(--color-black);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
}

.container {
  position: relative;
}

.brand-link {
  text-decoration: none;
  z-index: 101;
  position: relative;
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-equipt-orange);
  margin: 0;
  white-space: nowrap;
}

.nav-items {
  display: flex;
  gap: 2rem;
}

.nav-item {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  white-space: nowrap;
}

.nav-item:hover,
.nav-item.router-link-active {
  color: var(--color-text);
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
  background: var(--color-black-30);
  flex-shrink: 0;
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
  background: var(--color-equipt-orange);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.user-name {
  color: var(--color-text);
  font-weight: 500;
}

/* Mobile menu button */
.mobile-menu-btn {
  display: none;
  width: 44px;
  height: 44px;
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
  z-index: 101;
}

.menu-icon {
  position: relative;
  display: block;
  width: 24px;
  height: 2px;
  background: var(--color-text);
  margin: 0 auto;
  transition: all 0.3s ease;
}

.menu-icon::before,
.menu-icon::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 2px;
  background: var(--color-text);
  left: 0;
  transition: all 0.3s ease;
}

.menu-icon::before {
  top: -8px;
}

.menu-icon::after {
  bottom: -8px;
}

/* Mobile menu */
.mobile-menu {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-black);
  padding: 5rem 1.5rem 2rem;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 100;
  overflow-y: auto;
}

.mobile-menu.is-open {
  transform: translateX(0);
}

.mobile-menu.is-open + .mobile-menu-btn .menu-icon {
  background: transparent;
}

.mobile-menu.is-open + .mobile-menu-btn .menu-icon::before {
  transform: rotate(45deg);
  top: 0;
}

.mobile-menu.is-open + .mobile-menu-btn .menu-icon::after {
  transform: rotate(-45deg);
  bottom: 0;
}

.mobile-nav-items {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.mobile-nav-item {
  color: var(--color-text);
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 500;
  padding: 0.5rem 0;
}

.mobile-nav-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mobile-user-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-black-30);
  border-radius: 8px;
  text-decoration: none;
  margin-bottom: 1rem;
}

.mobile-new-project-btn {
  width: 100%;
  justify-content: center;
  padding: 1rem;
}

.mobile-sign-out {
  width: 100%;
  justify-content: center;
}

/* Responsive styles */
@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }

  .mobile-menu-btn {
    display: block;
  }

  .mobile-menu {
    display: block;
  }

  .nav-container {
    padding: 0.75rem 0;
  }

  .brand-text {
    font-size: 1.25rem;
  }

  .btn {
    padding: 0.75rem 1rem;
  }

  .btn .icon {
    margin-right: 0.5rem;
  }

  .new-project-btn .btn-text {
    display: none;
  }
}

@media (min-width: 769px) {
  .mobile-menu,
  .mobile-menu-btn {
    display: none;
  }
}
</style>