<template>
  <nav class="nav">
    <div class="nav-container">
      <div class="nav-logo">
        <router-link to="/">
          <img :src="logoImg" alt="equipt. logo" class="nav-logo-img">
        </router-link>
      </div>
      <div class="nav-links">
        <template v-if="userStore.isLoggedIn && !route.path.includes('/projects/')">
          <div
            class="nav-link-item nav-dropdown-trigger"
            @mouseenter="openProjects"
            @mouseleave="closeProjects"
          >
            <button type="button" class="sideNavBackToProjects" :class="{ 'nav-link-button--active': isProjectsActive }">
              Projects
              <v-icon size="16">mdi-chevron-down</v-icon>
            </button>
            <Dropdown v-if="isProjectsOpen" :open="isProjectsOpen" :items="projectsDropdownItems"
              @close="closeProjects" />
          </div>
          <div class="nav-link-item">
            <router-link to="/explore" class="sideNavBackToProjects" @click="closeProjects">
              Explore
            </router-link>
          </div>
        </template>
        <!-- Project details navigation links -->
        <template v-if="route.path.includes('/projects/') && projectId">
          <div class="nav-link-item">
            <router-link to="/projects" class="sideNavBackToProjects">
              <span class="sideNavBackToProjectsButton">
                <v-icon size="20">mdi-arrow-left</v-icon>
              </span>
              <span class="sideNavBackToProjectsText">projects</span>
            </router-link>
          </div>
          <div
            class="nav-link-item nav-dropdown-trigger"
            @mouseenter="openOverview"
            @mouseleave="closeOverview"
          >
            <button type="button" class="sideNavBackToProjects">
              Overview
              <v-icon size="16">mdi-chevron-down</v-icon>
            </button>
            <Dropdown v-if="isOverviewOpen" :open="isOverviewOpen" :items="overviewDropdownItems"
              @close="closeOverview" />
          </div>
          <div
            class="nav-link-item nav-dropdown-trigger"
            @mouseenter="openCollaborate"
            @mouseleave="closeCollaborate"
          >
            <button type="button" class="sideNavBackToProjects">
              Collaborate
              <v-icon size="16">mdi-chevron-down</v-icon>
            </button>
            <Dropdown v-if="isCollaborateOpen" :open="isCollaborateOpen" :items="collaborateDropdownItems"
              @close="closeCollaborate" />
          </div>

          <div
            class="nav-link-item nav-dropdown-trigger"
            @mouseenter="openManage"
            @mouseleave="closeManage"
          >
            <button type="button" class="sideNavBackToProjects">
              Manage
              <v-icon size="16">mdi-chevron-down</v-icon>
            </button>
            <Dropdown v-if="isManageOpen" :open="isManageOpen" :items="manageDropdownItems" @close="closeManage" />
          </div>
        </template>
      </div>
      <div class="nav-auth">
        <template v-if="userStore.isLoggedIn">
          <div class="profile">
            <button class="profile-button" @click="toggleProfile">
              <img :src="userStore.photoURL || defaultAvatar" alt="profile" class="profile-img"
                :class="{ 'profile-img--default': !userStore.photoURL }" @error="onAvatarError">
            </button>
            <ProfileDropdown v-if="isProfileOpen" :open="isProfileOpen" @close="closeProfile" />
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="nav-auth-link">Login</router-link>
          <router-link to="/register" class="nav-auth-link nav-auth-link--primary">Register</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores'
import Dropdown from '@/components/dropdowns/Dropdown.vue'
import ProfileDropdown from '@/components/dropdowns/ProfileDropdown.vue'
import logoImg from '@/assets/equiptBanner.png'
import defaultAvatar from '@/assets/user.png'

const userStore = useUserStore()
const route = useRoute()
const isProjectsOpen = ref(false)
const isProfileOpen = ref(false)
const isOverviewOpen = ref(false)
const isCollaborateOpen = ref(false)
const isManageOpen = ref(false)

const isProjectsActive = computed(() => route.path === '/projects')

const projectId = computed(() => route.params.id)

const projectsDropdownItems = [
  { type: 'link', name: 'New Project', to: '/projects', query: { new: '1' }, highlight: true },
  { type: 'link', name: 'My Projects', to: '/projects' },
  { type: 'divider' },
  { type: 'invites', name: 'No pending invites', icon: 'mdi-email-outline' },
]

const overviewDropdownItems = computed(() => [
  { type: 'link', name: 'Dashboard', to: `/projects/${projectId.value}`, query: { view: 'dashboard' } },
  { type: 'link', name: 'Files', to: `/projects/${projectId.value}`, query: { view: 'files' } },
  { type: 'link', name: 'Assets', to: `/projects/${projectId.value}`, query: { view: 'assets' } },
])

const collaborateDropdownItems = computed(() => [
  { type: 'link', name: 'Discussions', to: `/projects/${projectId.value}`, query: { view: 'discussions' } },
  { type: 'link', name: 'Tasks', to: `/projects/${projectId.value}`, query: { view: 'tasks' } },
])

const manageDropdownItems = computed(() => [
  { type: 'link', name: 'Settings', to: `/projects/${projectId.value}`, query: { view: 'settings' } },
])

function onAvatarError(e) {
  e.target.src = defaultAvatar
}

function openProjects() {
  isProjectsOpen.value = true
}

function openOverview() {
  isOverviewOpen.value = true
}

function openCollaborate() {
  isCollaborateOpen.value = true
}

function openManage() {
  isManageOpen.value = true
}

function toggleProfile() {
  isProfileOpen.value = !isProfileOpen.value
}

function closeProjects() {
  isProjectsOpen.value = false
}

function closeProfile() {
  isProfileOpen.value = false
}

function closeOverview() {
  isOverviewOpen.value = false
}

function closeCollaborate() {
  isCollaborateOpen.value = false
}

function closeManage() {
  isManageOpen.value = false
}
</script>

<style scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 1rem;
  pointer-events: none;
}

.nav-container {
  pointer-events: auto;
  border-radius: 9999px;
  background: linear-gradient(180deg,
      rgba(121, 121, 183, 0.35) 0%,
      rgba(242, 104, 55, 0.35) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid linear-gradient(180deg,
      rgba(121, 121, 183, 0.35) 0%,
      rgba(242, 104, 55, 0.35) 100%);
  box-shadow: 0 4px 24px linear-gradient(180deg,
      rgba(121, 121, 183, 0.35) 0%,
      rgba(242, 104, 55, 0.35) 100%);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr;
  align-items: center;
  height: 4rem;
  padding: 0 1.5rem;
  margin: 0 auto;
  max-width: 1200px;
  box-sizing: border-box;
}

.nav-logo {
  justify-self: start;
  display: flex;
  align-items: center;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.nav-logo-img {
  display: block;
  max-height: 6rem;
  width: auto;
  object-fit: contain;
}

.nav-links {
  font-family: var(--font-figtree);
  justify-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.nav-link-item {
  color: #fff;
  position: relative;
}

.nav-link-item:hover {
  border-radius: 9999px;
  background: linear-gradient(180deg,
      rgba(121, 121, 183, 0.35) 0%,
      rgba(242, 104, 55, 0.35) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  padding: 0.5rem 1rem;
  color: #fff;
}

.nav-link-button-projects,
.nav-link-button-todos {
  font-family: var(--font-figtree);
  font-size: 0.9375rem;
  font-weight: 500;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-link-button-projects.nav-link-button--active,
.nav-link-button-todos.router-link-active {
  background: linear-gradient(180deg,
      rgba(121, 121, 183, 0.25) 0%,
      rgba(242, 104, 55, 0.25) 100%);
  color: #fff;
}

.nav-auth {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-auth-link {
  font-family: var(--font-figtree);
  font-size: 0.9375rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  transition: all 0.2s ease;
}

.nav-auth-link--primary {
  color: #fff;
}

.nav-auth-link--primary:hover {
  box-shadow: 0 4px 24px rgba(237, 150, 62, 0.35);
  border-color: rgba(255, 255, 255, 0.12);
}

.profile {
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile:hover {
  border-radius: 9999px;
  background: linear-gradient(180deg,
      rgba(121, 121, 183, 0.35) 0%,
      rgba(242, 104, 55, 0.35) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  padding: 0.25rem 0.25rem;
}

.profile-button {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-img {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  object-fit: cover;
}

.profile-img--default {
  /* Tint placeholder to equipt orange #ED963E */
  filter: brightness(0) invert(68%) sepia(52%) saturate(1200%) hue-rotate(360deg);
}

.sideNavBackToProjects {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: white;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 500;
  transition: color 0.2s;
}
</style>
