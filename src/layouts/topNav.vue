<template>
  <nav class="nav">
    <div class="nav-container">
      <div class="nav-logo">
        <router-link to="/">
          <img :src="logoImg" alt="equipt. logo" class="nav-logo-img">
        </router-link>
      </div>
      <div class="nav-links">
        <template v-if="userStore.isLoggedIn">
          <div class="nav-link-item">
            <button class="nav-link-button-projects" @click="toggleProjects">
              Projects
              <v-icon size="16">mdi-chevron-down</v-icon>
            </button>
            <ProjectsModal v-if="isProjectsOpen" :open="isProjectsOpen" @close="closeProjects" />
          </div>
          <div class="nav-link-item">
            <button class="nav-link-button-todos" @click="goToExplore">
              Explore
            </button>
          </div>
        </template>
      </div>
      <div class="nav-auth">
        <template v-if="userStore.isLoggedIn">
          <div class="profile">
            <button class="profile-button" @click="toggleProfile">
              <img
                :src="userStore.photoURL || defaultAvatar"
                alt="profile"
                class="profile-img"
                :class="{ 'profile-img--default': !userStore.photoURL }"
                @error="onAvatarError"
              >
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
import { ref } from 'vue'
import { useUserStore } from '@/stores'
import ProjectsModal from '@/components/modals/projectsModal.vue'
import ProfileDropdown from '@/components/dropdowns/ProfileDropdown.vue'
import logoImg from '@/assets/equiptBanner.png'
import defaultAvatar from '@/assets/user.png'

const userStore = useUserStore()
const isProjectsOpen = ref(false)
const isProfileOpen = ref(false)

function onAvatarError(e) {
  e.target.src = defaultAvatar
}

const toggleProjects = () => {
  isProjectsOpen.value = !isProjectsOpen.value
}

const toggleProfile = () => {
  isProfileOpen.value = !isProfileOpen.value
}

const closeProjects = () => {
  isProjectsOpen.value = false
}

const closeProfile = () => {
  isProfileOpen.value = false
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
      rgba(121, 121, 183, 0.08) 0%,
      rgba(242, 104, 55, 0.08) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
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

.nav-auth-link:hover {
  background: linear-gradient(180deg,
      rgba(121, 121, 183, 0.2) 0%,
      rgba(242, 104, 55, 0.2) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #fff;
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
  padding: 0.5rem 1rem;
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
</style>
