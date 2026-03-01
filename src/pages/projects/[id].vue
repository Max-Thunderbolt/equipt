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
        <projectDashboard v-if="currentView === 'dashboard'" :project="project" />
        <TasksView v-else-if="currentView === 'tasks'" :project="project" />
        <div v-else class="view-placeholder">
          <h2>{{ formatViewName(currentView) }}</h2>
          <p>This view is under construction.</p>
        </div>
      </main>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
//import projectSideNav from '@/components/projects/projectSideNav.vue'
import projectDashboard from '@/components/projects/projectDashboard.vue'
import TasksView from '@/components/projects/views/TasksView.vue'
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
const currentView = computed(() => route.query.view || 'dashboard')

const { project, loading, error } = useProject(projectId)

const formatViewName = (view) => {
  return view.charAt(0).toUpperCase() + view.slice(1)
}
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

.view-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
}

.view-placeholder h2 {
  color: var(--color-text);
  margin-bottom: 0.5rem;
}
</style>
