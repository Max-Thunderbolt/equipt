<template>
  <Teleport to="body">
    <div v-if="open" class="create-project-overlay" @click.self="handleClose">
      <div class="create-project-modal glass">
        <div class="create-project-modal__header">
          <h2 class="create-project-modal__title">New Project</h2>
          <button type="button" class="create-project-modal__close" aria-label="Close" @click="handleClose">
            <v-icon size="24">mdi-close</v-icon>
          </button>
        </div>
        <form class="create-project-modal__form" @submit.prevent="onSubmit">
          <div class="create-project-modal__field">
            <label for="create-project-name" class="create-project-modal__label">Project name</label>
            <input
              id="create-project-name"
              v-model="form.name"
              type="text"
              class="create-project-modal__input"
              placeholder="Enter project name"
              required
            >
          </div>
          <div class="create-project-modal__field">
            <label for="create-project-desc" class="create-project-modal__label">Description</label>
            <textarea
              id="create-project-desc"
              v-model="form.description"
              class="create-project-modal__textarea"
              placeholder="Optional description"
              rows="3"
            />
          </div>
          <div class="create-project-modal__field">
            <label class="create-project-modal__label">Collaborators</label>
            <div class="create-project-modal__search-wrap">
              <input
                v-model="searchQuery"
                type="text"
                class="create-project-modal__input"
                placeholder="Search users to invite"
                autocomplete="off"
                @focus="showSearchResults = true"
              >
              <ul v-if="showSearchResults && searchResults.length > 0" class="create-project-modal__results">
                <li
                  v-for="u in searchResults"
                  :key="u._id"
                  class="create-project-modal__result-item"
                  @click="addCollaborator(u)"
                >
                  <img
                    v-if="u.photoURL"
                    :src="u.photoURL"
                    alt=""
                    class="create-project-modal__result-avatar"
                  >
                  <span v-else class="create-project-modal__result-avatar create-project-modal__result-avatar--fallback">{{ (u.displayName || u.email || '?')[0] }}</span>
                  <span>{{ u.displayName || u.email || u._id }}</span>
                </li>
              </ul>
            </div>
            <div v-if="selectedCollaborators.length > 0" class="create-project-modal__chips">
              <span
                v-for="u in selectedCollaborators"
                :key="u._id"
                class="create-project-modal__chip"
              >
                {{ u.displayName || u.email || u._id }}
                <button type="button" class="create-project-modal__chip-remove" @click="removeCollaborator(u)">×</button>
              </span>
            </div>
          </div>
          <div class="create-project-modal__field create-project-modal__field--row">
            <input
              id="create-project-public"
              v-model="form.isPublic"
              type="checkbox"
              class="create-project-modal__checkbox"
            >
            <label for="create-project-public" class="create-project-modal__label create-project-modal__label--inline">Public project</label>
          </div>
          <div class="create-project-modal__actions">
            <button type="button" class="create-project-modal__btn create-project-modal__btn--secondary" @click="handleClose">
              Cancel
            </button>
            <button type="submit" class="create-project-modal__btn create-project-modal__btn--primary" :disabled="saving">
              {{ saving ? 'Creating…' : 'Create Project' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import Server from '@/services/server'
import { useUserStore } from '@/stores'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'created'])

const userStore = useUserStore()

const form = ref({
  name: '',
  description: '',
  isPublic: false,
})
const searchQuery = ref('')
const searchResults = ref([])
const showSearchResults = ref(false)
const selectedCollaborators = ref([])
const saving = ref(false)

let searchTimeout = null

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    form.value = { name: '', description: '', isPublic: false }
    searchQuery.value = ''
    searchResults.value = []
    selectedCollaborators.value = []
    showSearchResults.value = false
  }
})

watch(searchQuery, (q) => {
  clearTimeout(searchTimeout)
  if (!q || q.length < 2) {
    searchResults.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    try {
      const list = await Server.searchUsers(q)
      const ids = new Set(selectedCollaborators.value.map(u => u._id))
      searchResults.value = (list || []).filter(u => !ids.has(u._id) && u._id !== userStore.uid)
    } catch (err) {
      searchResults.value = []
    }
  }, 300)
})

function addCollaborator(user) {
  if (selectedCollaborators.value.some(u => u._id === user._id)) return
  selectedCollaborators.value = [...selectedCollaborators.value, user]
  searchQuery.value = ''
  searchResults.value = []
  showSearchResults.value = false
}

function removeCollaborator(user) {
  selectedCollaborators.value = selectedCollaborators.value.filter(u => u._id !== user._id)
}

function handleClose() {
  emit('close')
}

async function onSubmit() {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    const project = await Server.createProject({
      name: form.value.name.trim(),
      description: (form.value.description || '').trim(),
      collaborators: selectedCollaborators.value.map(u => u._id),
      isPublic: form.value.isPublic,
    })
    emit('created', project)
    handleClose()
  } catch (err) {
    console.error('Create project failed', err)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.create-project-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  padding: 1rem;
}

.create-project-modal {
  width: 100%;
  max-width: 420px;
  border-radius: var(--radius-card);
  padding: 1.5rem;
  background: var(--glass-gradient);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.create-project-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.create-project-modal__title {
  font-family: var(--font-sans), sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.create-project-modal__close {
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--border-radius);
}

.create-project-modal__close:hover {
  color: var(--color-text);
}

.create-project-modal__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.create-project-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.create-project-modal__field--row {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.create-project-modal__label {
  font-family: var(--font-sans), sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.create-project-modal__label--inline {
  margin: 0;
}

.create-project-modal__input,
.create-project-modal__textarea {
  font-family: var(--font-sans), sans-serif;
  font-size: 0.9375rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text);
}

.create-project-modal__input::placeholder,
.create-project-modal__textarea::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.create-project-modal__textarea {
  resize: vertical;
  min-height: 4rem;
}

.create-project-modal__search-wrap {
  position: relative;
}

.create-project-modal__results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  background: var(--color-background);
  border: var(--glass-border);
  border-radius: var(--border-radius);
  box-shadow: var(--glass-shadow);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1;
}

.create-project-modal__result-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-family: var(--font-sans), sans-serif;
  font-size: 0.875rem;
  color: var(--color-text);
}

.create-project-modal__result-item:hover {
  background: var(--color-white-10);
}

.create-project-modal__result-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.create-project-modal__result-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-equipt-orange-30);
  font-size: 0.75rem;
  font-weight: 600;
}

.create-project-modal__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.create-project-modal__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background: var(--color-white-10);
  font-family: var(--font-sans), sans-serif;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.create-project-modal__chip-remove {
  padding: 0 0.15rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}

.create-project-modal__chip-remove:hover {
  color: var(--color-text);
}

.create-project-modal__checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--equipt-orange);
}

.create-project-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.create-project-modal__btn {
  font-family: var(--font-sans), sans-serif;
  font-size: 0.9375rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  border: none;
}

.create-project-modal__btn--secondary {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.create-project-modal__btn--secondary:hover {
  color: var(--color-text);
  border-color: var(--color-border-hover);
}

.create-project-modal__btn--primary {
  background: var(--equipt-orange);
  color: #000;
}

.create-project-modal__btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.create-project-modal__btn--primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
