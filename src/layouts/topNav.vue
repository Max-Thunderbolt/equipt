<template>
  <nav class="nav">
    <div class="nav-container">
      <!-- <div class="glass"> -->
      <div class="nav-logo">
        <router-link to="/">
          <img :src="logoImg" alt="equipt. logo" class="nav-logo-img">
        </router-link>
      </div>
      <div class="nav-links">
        <div class="nav-link-item">
          <button class="nav-link-button-projects" @click="toggleProjects">
            Projects
            <v-icon size="16">mdi-chevron-down</v-icon>
          </button>
          <ProjectsModal v-if="isProjectsOpen" :open="isProjectsOpen" @close="closeProjects" />
        </div>
        <div class="nav-link-item">
          <button class="nav-link-button" @click="toggleExplore">
            Explore
          </button>
        </div>
      </div>
    </div>
    <!-- </div> -->
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import ProjectsModal from '@/components/modals/projectsModal.vue'
import ProfileDropdown from '@/components/dropdowns/ProfileDropdown.vue'
import logoImg from '@/assets/equiptBanner.png'
import arrowDown from '@/assets/arrow.svg'

const isProjectsOpen = ref(false)
const isProfileOpen = ref(false)
const isCollapsed = ref(false)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleProjects = () => {
  console.log('toggleProjects', !isProjectsOpen.value)
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
}

.profile {
  justify-self: end;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-down-icon {

  width: 1rem;
  height: 1rem;
}
</style>
