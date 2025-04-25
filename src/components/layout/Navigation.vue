<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useProfile } from '../../composables/useProfile'
import { useProjects } from '../../composables/useProjects'
import NewProjectModal from '../modals/NewProjectModal.vue'
import AuthModal from '../modals/AuthModal.vue'
import { supabase } from '../../supabase/config'
import ProjectInvites from '../project/ProjectInvites.vue'

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
  { 
    name: 'Projects', 
    path: '/projects',
    dropdown: [
      { name: 'New Project', action: () => isNewProjectModalOpen.value = true, isPrimaryAction: true },
      { name: 'My Projects', path: '/projects' },
      { name: 'Pending Invites', component: 'ProjectInvites' },
      { name: 'Files', path: '/files' }
    ]
  },
  { 
    name: 'Explore', 
    path: '/explore',
    dropdown: [] // Empty for now
  }
])

// Add computed property to determine navigation items based on auth state
const displayNavItems = computed(() => {
  // Basic navigation items for everyone
  const items = [...navigationItems.value]
  
  // Filter out the Profile item if it exists (we handle it separately)
  const filteredItems = items.filter(item => item.name !== 'Profile')
  
  return filteredItems
})

// Add dropdown state management
const activeDropdown = ref(null)

const toggleDropdown = (itemName) => {
  if (activeDropdown.value === itemName) {
    activeDropdown.value = null
  } else {
    activeDropdown.value = itemName
  }
}

const closeDropdowns = () => {
  activeDropdown.value = null
}

// Close dropdowns when clicking outside
onMounted(() => {
  document.addEventListener('click', (event) => {
    const navElement = document.querySelector('.nav-container')
    if (navElement && !navElement.contains(event.target)) {
      closeDropdowns()
    }
  })
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
          <h1 class="brand-text"><img src="../../assets/equiptBanner.png" alt="equipt logo" class="brand-logo-nav"></h1>
        </router-link>
      </div>
      
      <!-- Mobile menu button -->
      <button class="mobile-menu-btn" @click="toggleMobileMenu">
        <span class="menu-icon"></span>
      </button>
      
      <!-- Desktop navigation -->
      <div class="nav-items desktop-only">
        <div 
          v-for="item in displayNavItems" 
          :key="item.path"
          class="nav-item-container"
          @click.stop="toggleDropdown(item.name)"
        >
          <div 
            class="nav-item" 
            :class="{ 'has-dropdown': item.dropdown && item.dropdown.length }"
          >
            {{ item.name }}
            <span class="dropdown-arrow" v-if="item.dropdown && item.dropdown.length">▼</span>
          </div>
          
          <!-- Desktop dropdown menu -->
          <div 
            v-if="item.dropdown && item.dropdown.length" 
            class="dropdown-menu"
            :class="{ 'show': activeDropdown === item.name }"
          >
            <template v-for="dropdownItem in item.dropdown" :key="dropdownItem.path || dropdownItem.name">
              <router-link 
                v-if="dropdownItem.path"
                :to="dropdownItem.path"
                class="dropdown-item"
                @click="closeDropdowns"
              >
                {{ dropdownItem.name }}
              </router-link>
              <button 
                v-else-if="dropdownItem.action"
                class="dropdown-item"
                :class="{ 'dropdown-item-primary': dropdownItem.isPrimaryAction }"
                @click="dropdownItem.action"
              >
                {{ dropdownItem.name }}
              </button>
              <div 
                v-else-if="dropdownItem.component === 'ProjectInvites'"
                class="dropdown-invites"
              >
                <ProjectInvites />
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="nav-actions desktop-only">
        <template v-if="user">
          <div class="user-menu">
            <div class="user-profile" @click="toggleDropdown('profile')">
              <div v-if="avatarUrl" class="avatar">
                <img :src="avatarUrl" :alt="displayName" referrerpolicy="no-referrer">
              </div>
              <div v-else class="avatar-placeholder">
                {{ displayName[0]?.toUpperCase() }}
              </div>
              <span class="user-name">{{ displayName }}</span>
              <span class="dropdown-arrow">▼</span>
            </div>
            
            <!-- Profile dropdown -->
            <div 
              class="dropdown-menu profile-dropdown"
              :class="{ 'show': activeDropdown === 'profile' }"
            >
              <router-link to="/profile" class="dropdown-item" @click="closeDropdowns">
                My Profile
              </router-link>
              <button class="dropdown-item" @click="handleLogout">
                Sign Out
              </button>
            </div>
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
        <div 
          v-for="item in displayNavItems" 
          :key="item.path"
          class="mobile-nav-item-container"
        >
          <div class="mobile-nav-item" @click="toggleDropdown(item.name)">
            {{ item.name }}
            <span class="dropdown-arrow" v-if="item.dropdown && item.dropdown.length">▼</span>
          </div>
          
          <!-- Mobile dropdown menu -->
          <div 
            v-if="item.dropdown && item.dropdown.length" 
            class="mobile-dropdown-menu"
            :class="{ 'show': activeDropdown === item.name }"
          >
            <template v-for="dropdownItem in item.dropdown" :key="dropdownItem.path || dropdownItem.name">
              <router-link 
                v-if="dropdownItem.path"
                :to="dropdownItem.path"
                class="mobile-dropdown-item"
                @click="closeMobileMenu"
              >
                {{ dropdownItem.name }}
              </router-link>
              <button 
                v-else-if="dropdownItem.action"
                class="mobile-dropdown-item"
                :class="{ 'dropdown-item-primary': dropdownItem.isPrimaryAction }"
                @click="dropdownItem.action"
              >
                {{ dropdownItem.name }}
              </button>
            </template>
          </div>
        </div>
      </div>

      <div class="mobile-nav-actions">
        <template v-if="!user">
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
/* CSS at the beginning of the component's style section */
:root {
  --navbar-height: 72px;
}

.nav-container {
  background-color: var(--color-black);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--navbar-height);
  z-index: 1000;
}

.container {
  height: var(--navbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  max-width: 100%;
  margin: 0;
}

.nav-brand {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.brand-link {
  text-decoration: none;
}

.brand-logo-nav {
  width: 100px;
  height: 100px;
  margin: -14px 0;
}

.nav-items {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin: 0 48px;
}

.nav-item-container {
  position: relative;
}

.nav-item {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.nav-item:hover,
.nav-item.active {
  color: var(--color-text);
}

.dropdown-arrow {
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}

.nav-item.active .dropdown-arrow {
  transform: rotate(180deg);
}

.nav-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu {
  position: relative;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  cursor: pointer;
}

.user-profile:hover {
  background-color: rgba(255, 255, 255, 0.1);
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

.mobile-nav-item-container {
  position: relative;
}

.mobile-nav-item {
  color: var(--color-text);
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 500;
  padding: 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-dropdown-menu {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  padding-left: 1rem;
}

.mobile-dropdown-menu.show {
  max-height: 500px;
}

.mobile-dropdown-item {
  display: block;
  padding: 0.75rem 0;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 1rem;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: color 0.2s ease;
}

.mobile-dropdown-item.dropdown-item-primary {
  background-color: var(--color-equipt-orange);
  color: white;
  font-weight: 500;
  margin: 0 -1.5rem;
  padding: 0.75rem 1.5rem;
}

.mobile-dropdown-item.dropdown-item-primary:hover {
  background-color: var(--color-equipt-orange-90);
  color: white;
}

.mobile-dropdown-item:hover {
  color: var(--color-text);
}

.mobile-nav-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mobile-new-project-btn {
  width: 100%;
  justify-content: center;
  padding: 1rem;
}

/* Responsive styles */
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }

  .brand-logo-nav {
    width: 80px;
    height: 80px;
    margin: -4px 0;
  }

  .nav-items {
    margin: 0 24px;
  }

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
    padding: 0;
    height: var(--navbar-height);
  }

  .container {
    height: var(--navbar-height);
  }

  .nav-brand {
    padding-left: 16px;
  }

  .nav-actions {
    padding-right: 16px;
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

.dropdown-invites {
  max-height: 400px;
  overflow-y: auto;
  border-top: 1px solid var(--color-border);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.dropdown-menu {
  min-width: 240px;
}
</style>