<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useProfile } from '../../composables/useProfile'
import { useProjects } from '../../composables/useProjects'
import { useProjectInvites } from '../../composables/useProjectInvites'
import NewProjectModal from '../modals/NewProjectModal.vue'
import AuthModal from '../modals/AuthModal.vue'
import ProjectInvites from '../project/ProjectInvites.vue'
import { supabase } from '../../supabase/config'
import { useRouter } from 'vue-router'

const { user, session } = useAuth()
const { profile, fetchProfile } = useProfile()
const { createProject, loading: projectLoading, error: projectError } = useProjects()
const { 
  invites: userInvites, 
  loading: invitesLoading, 
  error: invitesError, 
  fetchUserInvites,
  acceptInvite,
  declineInvite
} = useProjectInvites()
const router = useRouter()

// Mobile menu state
const isMobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Watch for user changes to fetch profile AND invites
watch(() => user.value?.id, async (newUserId) => {
  if (newUserId) {
    console.log('User changed, fetching profile and invites for:', newUserId)
    await Promise.all([
      fetchProfile(),
      fetchUserInvites()
    ])
  } else {
    // Clear invites if user logs out
    userInvites.value = [] 
  }
}, { immediate: true })

// Initialize auth state and fetch initial data if session exists
onMounted(async () => {
  const { data: { session: currentSession } } = await supabase.auth.getSession()
  if (currentSession?.user) {
    console.log('Initial session found on mount, fetching profile and invites')
    await Promise.all([
      fetchProfile(),
      fetchUserInvites()
    ])
  } else {
    console.log('No initial session found on mount')
  }
}) 

const navigationItems = ref([
  { 
    name: 'Projects', 
    requiresAuth: true,
    dropdown: [
      { name: 'New Project', action: () => isNewProjectModalOpen.value = true, isPrimaryAction: true },
      { name: 'My Projects', path: '/projects', requiresAuth: true }
    ]
  },
  { 
    name: 'Explore', 
    path: '/explore'
  }
])

// Filter navigation items based on auth state
const displayNavItems = computed(() => {
  return navigationItems.value.filter(item => {
    // Filter out items requiring auth if user is not logged in
    return !(item.requiresAuth && !user.value)
  })
})

// Dropdown state management (only for profile now)
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
    // Redirect to the new project
    if (result?.id) {
      router.push(`/projects/${result.id}`)
    }
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

// Computed property for invite count
const pendingInviteCount = computed(() => {
  return userInvites.value?.length || 0
})

const onAcceptInvite = async (inviteId, onSuccess, onError) => {
  try {
    const success = await acceptInvite(inviteId)
    if (success) {
      await fetchUserInvites()
      if (onSuccess) onSuccess()
    } else {
      if (onError) onError()
    }
  } catch (e) {
    if (onError) onError()
  }
}

const onDeclineInvite = async (inviteId, onSuccess) => {
  try {
    await declineInvite(inviteId)
    await fetchUserInvites()
    if (onSuccess) onSuccess()
  } catch (e) {
    if (onSuccess) onSuccess()
  }
}

const navOpacity = ref(1);

function handleScroll() {
  const maxScroll = 200; // px after which nav is fully faded
  const scrollY = window.scrollY || window.pageYOffset;
  navOpacity.value = Math.max(0, 1 - scrollY / maxScroll);
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <nav class="nav-container" :style="{ opacity: navOpacity }">
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
        <template v-for="item in displayNavItems" :key="item.name">
          
          <!-- Item with Dropdown -->
          <div 
            v-if="item.dropdown"
            class="nav-item-container"
            @click.stop="toggleDropdown(item.name)"
          >
            <div 
              class="nav-item"
              :class="{ 'has-badge': item.name === 'Projects' && pendingInviteCount > 0 }" 
            >
              {{ item.name }}
               <!-- Badge for invites within Projects dropdown -->
              <span v-if="item.name === 'Projects' && pendingInviteCount > 0" class="badge">
                {{ pendingInviteCount }}
              </span>
              <span class="dropdown-arrow">▼</span>
            </div>
            <!-- Desktop dropdown menu -->
            <div 
              class="dropdown-menu"
              :class="{ 'show': activeDropdown === item.name }"
            >
              <!-- Render standard dropdown items first -->
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
                    @click="() => { dropdownItem.action(); closeDropdowns(); }" 
                  >
                    {{ dropdownItem.name }}
                  </button>
              </template>

              <!-- Conditionally render invites section if user is logged in -->
              <div v-if="user" class="dropdown-invites">
                <ProjectInvites
                  :invites="userInvites"
                  :loading="invitesLoading"
                  :error="invitesError"
                  @accept="onAcceptInvite"
                  @decline="onDeclineInvite"
                />
              </div>
            </div>
          </div>

          <!-- Standard link (no dropdown) -->
          <router-link 
            v-else-if="item.path"
            :to="item.path"
            class="nav-item"
            active-class="active"
          >
            {{ item.name }}
          </router-link>

          <!-- Button for action (no dropdown) -->
          <button
            v-else-if="item.action"
            class="nav-item"
            @click="item.action"
          >
            {{ item.name }}
          </button>
        </template>
      </div>

      <div class="nav-actions desktop-only">
        <template v-if="user">
          <div class="user-menu">
            <div class="user-profile" @click.stop="toggleDropdown('profile')">
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
         <template v-for="item in displayNavItems" :key="item.name">
            <!-- Mobile Item with Dropdown -->
            <div v-if="item.dropdown" class="mobile-nav-item-container">
               <div class="mobile-nav-item" @click="toggleDropdown(item.name)">
                 {{ item.name }}
                 <span v-if="item.name === 'Projects' && pendingInviteCount > 0" class="badge">
                   {{ pendingInviteCount }}
                 </span>
                 <span class="dropdown-arrow">▼</span>
               </div>
               <div class="mobile-dropdown-menu" :class="{ 'show': activeDropdown === item.name }">
                  <!-- Render standard mobile dropdown items -->
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
                       @click="() => { dropdownItem.action(); closeMobileMenu(); }"
                     >
                       {{ dropdownItem.name }}
                     </button>
                  </template>
                  <!-- Conditionally render mobile invites section -->
                  <div v-if="user" class="mobile-dropdown-invites">
                     <h4 class="mobile-invites-header">Pending Invites</h4>
                     <ProjectInvites
                       :invites="userInvites"
                       :loading="invitesLoading"
                       :error="invitesError"
                       @accept="onAcceptInvite"
                       @decline="onDeclineInvite"
                     />
                  </div>
               </div>
            </div>
             <!-- Mobile Item without Dropdown (Link) -->
            <router-link
               v-else-if="item.path"
               :to="item.path"
               class="mobile-nav-item"
               @click="closeMobileMenu"
            >
               {{ item.name }}
            </router-link>
            <!-- Mobile Item without Dropdown (Action) -->
            <button
              v-else-if="item.action"
              class="mobile-nav-item"
              @click="() => { item.action(); closeMobileMenu(); }"
            >
              {{ item.name }}
            </button>
         </template>
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
  background-color: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--navbar-height);
  z-index: 1000;
  transition: opacity 0.3s;
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
  color: #666666;
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
  color: #000000;
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
  background-color: rgba(0, 0, 0, 0.05);
}

.user-name {
  color: #000000;
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
  background: white;
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
  color: #000000;
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
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: var(--border-radius-small);
  margin: 0.5rem 0;
}

.mobile-dropdown-menu.show {
  max-height: 500px;
}

.mobile-dropdown-item {
  display: block;
  padding: 0.75rem 0;
  color: #666666;
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
  color: #000000;
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
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background-color: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--border-radius);
  padding: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 240px;
  z-index: 1001;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%) translateY(-10px);
  transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
}

.dropdown-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.profile-dropdown {
  left: auto;
  right: 0;
  transform: translateX(0);
}

.profile-dropdown.show {
  transform: translateX(0) translateY(0);
}

.dropdown-item {
  display: block;
  padding: 0.75rem 1rem;
  color: #666666;
  text-decoration: none;
  white-space: nowrap;
  border-radius: var(--border-radius-small);
  transition: background-color 0.2s ease, color 0.2s ease;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
}

.dropdown-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #000000;
}

.dropdown-item-primary {
  background-color: var(--color-equipt-orange);
  color: white;
  font-weight: 500;
}

.dropdown-item-primary:hover {
  background-color: var(--color-equipt-orange-90);
  color: white;
}

/* Add styles for badge */
.badge {
  background-color: var(--color-primary);
  color: white;
  border-radius: 50%;
  padding: 0.1em 0.4em;
  font-size: 0.75rem;
  min-width: 1.5em;
  height: 1.5em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.5em;
  line-height: 1;
}

.nav-item.has-badge {
  /* Add padding or adjust spacing if needed when badge is present */
}

.nav-item:disabled {
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.mobile-nav-item {
  /* Ensure mobile items can be disabled */
   display: flex; /* Align badge */
   justify-content: space-between; /* Align badge */
   align-items: center; /* Align badge */
   width: 100%;
}

.mobile-nav-item:disabled {
  color: var(--color-text-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.mobile-dropdown-invites {
   border-top: 1px solid rgba(0, 0, 0, 0.1);
   margin: 0.5rem 0;
   padding: 0.5rem 0;
}

.mobile-invites-header {
    color: #666666;
    font-size: 0.8rem;
    padding: 0 0 0.5rem 1rem;
    text-transform: uppercase;
}
</style>