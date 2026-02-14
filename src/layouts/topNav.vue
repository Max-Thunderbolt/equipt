<template>
    <nav>
        <div class="nav-container">
            <div class="nav-logo"><router-link to="/">
                    <img src="../assets/equiptBanner.png" alt="equipt. logo" class="nav-logo-img">
                </router-link></div>
            <div class="nav-links">
                <div class="nav-link-item">
                    <button class="nav-link-button-projects" @click="toggleProjects">Projects <v-icon
                            size="16">mdi-chevron-down</v-icon></button>
                    <ProjectsModal v-if="isProjectsOpen" />
                </div>
                <div class="nav-link-item">
                    <button class="nav-link-button">Explore</button>
                </div>
            </div>
            <div class="profile">
                <v-btn class="profile-button" @click="toggleProfile"><v-icon>mdi-account</v-icon></v-btn>
            </div>
        </div>
    </nav>

</template>

<script setup>
import { ref } from 'vue';
import ProjectsModal from '../components/modals/projectsModal.vue';

const isProjectsOpen = ref(false);
const isProfileOpen = ref(false);

const toggleProjects = () => {
    isProjectsOpen.value = !isProjectsOpen.value;
}

const toggleProfile = () => {
    isProfileOpen.value = !isProfileOpen.value;
}
</script>

<style scoped>
nav {
    height: 4rem;
    overflow: visible;
    position: relative;
    background-color: var(--white);
    z-index: 10;
}

.nav-logo-img {
    display: block;
    height: 5rem;
    width: auto;
    object-fit: contain;
    margin-left: 1rem;
}

.nav-container {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;
    height: 100%;
}

.nav-logo {
    justify-self: start;
}

.nav-links {
    justify-self: center;
    display: flex;
    align-items: center;
    gap: 1rem;
    /* remove margin-left: auto */
}

.nav-link-item {
    font-size: 1.2rem;
    color: var(--black);
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: all 0.3s ease;
}

.nav-link-button {
    font-size: 1.2rem;
    font-family: var(--font-mono) !important;
}

.nav-link-button-projects {
    font-size: 1.2rem;
    font-family: var(--font-mono) !important;
}

.profile {
    justify-self: end;
}

.profile-button {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--white);
    background-color: var(--equipt-orange);
    border-radius: 1rem;
    transition: all 0.3s ease;
    border-radius: 1rem;
    width: auto;
    height: auto;
    margin-right: 1rem;
}
</style>