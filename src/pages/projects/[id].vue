<template>
  <div class="project-details-page">
    <div v-if="loading" class="project-details-loading">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>
    <template v-else-if="error">
      <div class="project-details-error">
        <p>{{ error }}</p>
        <router-link to="/projects" class="project-details-back">Back to projects</router-link>
      </div>
    </template>
    <template v-else-if="project">
      <!-- <projectSideNav :project="project" /> -->
      <main class="project-details-main">
        <!-- Main content area -->
        <!-- <v-breadcrumbs
          :items="[{ text: 'Projects', to: '/projects' }, { text: project.name, to: `/projects/${project._id}` }]"
          class="project-details-breadcrumbs" /> -->
        <projectDashboard :project="project" />

      </main>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import projectSideNav from '@/components/projects/projectSideNav.vue'
import { useProject } from '@/composables/projects/useProject'
import { useAppStore } from '@/stores'

definePage({
  meta: {
    requiresAuth: true,
  },
})

const route = useRoute()
const appStore = useAppStore()
const projectId = computed(() => route.params.id)

const { project, loading, error } = useProject(projectId)
</script>

<style scoped>
.project-details-page {
  min-height: 100vh;
  display: flex;
  align-items: stretch;
  background: var(--color-background);
}

.project-details-loading,
.project-details-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: 2rem;
}

.project-details-error p {
  margin: 0 0 1rem;
  color: var(--color-text-secondary);
}

.project-details-back {
  color: var(--equipt-orange);
  font-weight: 500;
}

.project-details-main {
  flex: 1;
  margin-top: 5em;
  margin-left: 5em;
  margin-right: 5em;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.project-details-breadcrumbs {
  margin-top: 2rem;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  color: var(--color-text);
}
</style>
