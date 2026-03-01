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
      <projectSideNav :project="projectForNav" />
      <main class="project-details-main">
        <!-- Main content area for dashboard, files, etc. -->
      </main>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import projectSideNav from '@/components/projectSideNav.vue'
import { useProject } from '@/composables/projects/useProject'

definePage({
  meta: {
    requiresAuth: true,
  },
})

const route = useRoute()
const projectId = computed(() => route.params.id)

const { project, loading, error } = useProject(projectId)

// Sidebar expects teamMembers; API returns collaborators (uids). Normalize for display.
const projectForNav = computed(() => {
  if (!project.value) return null
  return {
    ...project.value,
    teamMembers: (project.value.collaborators || []).map((uid) => ({
      id: uid,
      name: uid,
      avatar: '',
      role: 'Collaborator',
    })),
  }
})
</script>

<style scoped>
.project-details-page {
  min-height: 100vh;
  display: flex;
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
  padding: 2rem;
}
</style>
