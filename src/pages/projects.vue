<template>
  <div class="projects-page">
    <header class="projects-header">
      <div class="projects-header__text">
        <h1 class="projects-header__title">Projects</h1>
        <p class="projects-header__subtitle">{{ projectCount }} projects</p>
      </div>
      <button type="button" class="projects-header__btn project-header__btn-glass" @click="openCreateModal">
        + New Project
      </button>
    </header>

    <div class="projects-toolbar">
      <div class="projects-toolbar__search">
        <v-icon size="20" class="projects-toolbar__search-icon">mdi-magnify</v-icon>
        <input v-model="searchQuery" type="text" class="projects-toolbar__input" placeholder="Search projects...">
      </div>
      <div class="projects-toolbar__filters">
        <button type="button" class="projects-toolbar__pill"
          :class="{ 'projects-toolbar__pill--active': filterMode === 'recent' }" @click="filterMode = 'recent'">
          <v-icon size="18">mdi-clock-outline</v-icon>
          Recent
        </button>
        <div class="projects-toolbar__view">
          <button type="button" class="projects-toolbar__view-btn"
            :class="{ 'projects-toolbar__view-btn--active': viewMode === 'grid' }" aria-label="Grid view"
            @click="viewMode = 'grid'">
            <v-icon size="20">mdi-view-grid-outline</v-icon>
          </button>
          <button type="button" class="projects-toolbar__view-btn"
            :class="{ 'projects-toolbar__view-btn--active': viewMode === 'list' }" aria-label="List view"
            @click="viewMode = 'list'">
            <v-icon size="20">mdi-view-list-outline</v-icon>
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="projects-loading">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>
    <div v-else-if="filteredProjects.length === 0" class="projects-empty">
      <p class="projects-empty__text">No projects yet. Create one to get started.</p>
    </div>
    <div v-else class="projects-grid" :class="{ 'projects-grid--list': viewMode === 'list' }">
      <article v-for="(project, i) in filteredProjects" :key="project._id" class="project-card">
        <div class="project-card__thumb" :style="{ background: cardAccent(i) }">
          <v-icon size="28" class="project-card__thumb-icon">mdi-lightbulb-outline</v-icon>
        </div>
        <div class="project-card__body">
          <h3 class="project-card__title">{{ project.name }}</h3>
          <p class="project-card__meta">
            {{ project.collaborators ? project.collaborators.length : 0 }} collaborators
          </p>
          <div class="project-card__footer">
            <div class="project-card__avatars">
              <span v-for="(_, j) in (project.collaborators || []).slice(0, 2)" :key="j" class="project-card__avatar">
                ?
              </span>
            </div>
            <span class="project-card__updated">{{ formatUpdated(project.updatedAt) }}</span>
          </div>
        </div>
      </article>
    </div>

    <CreateProjectModal :open="showCreateModal" @close="showCreateModal = false" @created="onProjectCreated" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Server from '@/services/server'
import CreateProjectModal from '@/components/modals/CreateProjectModal.vue'

definePage({
  meta: {
    requiresAuth: true,
  },
})

const route = useRoute()
const projects = ref([])
const loading = ref(true)
const searchQuery = ref('')
const filterMode = ref('recent')
const viewMode = ref('grid')
const showCreateModal = ref(false)

const projectCount = computed(() => projects.value.length)

const filteredProjects = computed(() => {
  let list = [...projects.value]
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    )
  }
  if (filterMode.value === 'recent') {
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  }
  return list
})

const CARD_ACCENTS = [
  'linear-gradient(135deg, rgba(180, 120, 80, 0.9), rgba(140, 90, 50, 0.9))',
  'linear-gradient(135deg, rgba(120, 100, 160, 0.9), rgba(80, 60, 120, 0.9))',
  'linear-gradient(135deg, rgba(60, 80, 120, 0.9), rgba(40, 60, 100, 0.9))',
  'linear-gradient(135deg, rgba(60, 100, 80, 0.9), rgba(40, 80, 60, 0.9))',
  'linear-gradient(135deg, rgba(120, 60, 60, 0.9), rgba(90, 40, 40, 0.9))',
  'linear-gradient(135deg, rgba(160, 130, 50, 0.9), rgba(120, 90, 30, 0.9))',
]

function cardAccent(index) {
  return CARD_ACCENTS[index % CARD_ACCENTS.length]
}

function formatUpdated(ts) {
  if (!ts) return ''
  const d = Date.now() - ts
  if (d < 60 * 60 * 1000) return `${Math.round(d / (60 * 1000))}m ago`
  if (d < 24 * 60 * 60 * 1000) return `${Math.round(d / (60 * 60 * 1000))}h ago`
  if (d < 7 * 24 * 60 * 60 * 1000) return `${Math.round(d / (24 * 60 * 60 * 1000))}d ago`
  return '1w+ ago'
}

function openCreateModal() {
  showCreateModal.value = true
}

function onProjectCreated() {
  fetchProjects()
}

async function fetchProjects() {
  loading.value = true
  try {
    projects.value = await Server.getProjects() || []
  } catch (err) {
    console.error('Failed to load projects', err)
    projects.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query.new,
  (val) => {
    if (val === '1' || val === 'true') showCreateModal.value = true
  },
  { immediate: true }
)

onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.projects-page {
  min-height: 100vh;
  padding: 2rem 1.5rem;
  padding-top: 6rem;
  background: var(--color-background);
  max-width: 1200px;
  margin: 0 auto;
}

.projects-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.projects-header__text {
  flex: 1;
}

.projects-header__title {
  font-family: var(--font-sans), sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.25rem;
}

.projects-header__subtitle {
  font-family: var(--font-sans), sans-serif;
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.projects-header__btn {
  font-family: var(--font-sans), sans-serif;
  padding: 0.6rem 1.25rem;
  border-radius: 9999px;
  background: var(--color-accent-hover);

  color: #fff;
  cursor: pointer;
  white-space: nowrap;
}

.project-header__btn-glass {
  background: linear-gradient(180deg, rgba(237, 150, 62, 0.35) 0%, rgba(237, 150, 62, 0.15) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-card);
  padding: 0.6rem 1.25rem;
}

.projects-header__btn:hover {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid linear-gradient(180deg, rgba(237, 150, 62, 0.35) 0%, rgba(237, 150, 62, 0.15) 100%);
  box-shadow: inset 1px 1px 1px 1px rgba(237, 150, 62);
}

.projects-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.projects-toolbar__search {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.06);
}

.projects-toolbar__search-icon {
  color: var(--color-text-secondary);
}

.projects-toolbar__input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-sans), sans-serif;
  font-size: 0.9375rem;
  border: none !important;
  border-radius: 9999px;
  background: transparent;
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  outline: none !important;
}

.projects-toolbar__input::placeholder {
  color: var(--color-text-secondary);
}

.projects-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.projects-toolbar__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-sans), sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.projects-toolbar__pill:hover,
.projects-toolbar__pill:focus {
  transform: scale(1.05);
  transition: all 0.2s ease-in-out;
  box-shadow: 0 0 10px 0 rgba(237, 150, 62, 0.5);
}

.projects-toolbar__pill--active {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--color-text);
}

.projects-toolbar__view {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  overflow: hidden;
}

.projects-toolbar__view-btn {
  padding: 0.5rem 0.6rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.projects-toolbar__view-btn:hover,
.projects-toolbar__view-btn:focus,
.projects-toolbar__view-btn:active {
  transition: all 0.2s ease-in-out;
}

.projects-toolbar__view-btn--active {
  background: linear-gradient(180deg, rgba(237, 150, 62, 0.35) 0%, rgba(237, 150, 62, 0.15) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-card);
  color: #fff;
}

.projects-loading,
.projects-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.projects-empty__text {
  font-family: var(--font-sans), sans-serif;
  color: var(--color-text-secondary);
  margin: 0;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.projects-grid--list {
  grid-template-columns: 1fr;
}

.project-card {
  background: var(--glass-gradient);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.project-card:hover {
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.project-card__thumb {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-card__thumb-icon {
  color: rgba(255, 255, 255, 0.5);
}

.project-card__body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.project-card__title {
  font-family: var(--font-sans), sans-serif;
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  line-height: 1.3;
}

.project-card__meta {
  font-family: var(--font-sans), sans-serif;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.project-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0.75rem;
}

.project-card__avatars {
  display: flex;
  gap: -4px;
}

.project-card__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-white-20);
  border: 2px solid var(--color-background);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  margin-left: -6px;
}

.project-card__avatar:first-child {
  margin-left: 0;
}

.project-card__updated {
  font-family: var(--font-sans), sans-serif;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
</style>
