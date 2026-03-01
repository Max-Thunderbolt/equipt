<template>
  <div class="tasks-view">
    <header class="tasks-header">
      <div class="tasks-header-left">
        <h2 class="tasks-title">Tasks</h2>
        <div class="view-switcher">
          <button v-for="view in views" :key="view.id" class="view-switcher-btn"
            :class="{ active: currentView === view.id }" @click="currentView = view.id">
            <v-icon size="18" class="mr-2">{{ view.icon }}</v-icon>
            {{ view.name }}
          </button>
        </div>
      </div>
      <CreateButton name="New Task" icon="mdi-plus" @click="showCreateTask = true" />
    </header>

    <div class="tasks-filters" v-if="currentView === 'list'">
      <div class="tasks-filter-group">
        <v-icon size="18" color="grey">mdi-magnify</v-icon>
        <input v-model="searchQuery" type="text" placeholder="Search tasks..." class="tasks-filter-input">
      </div>
      <div class="tasks-filter-group nav-dropdown-trigger" @mouseenter="isStatusFilterOpen = true"
        @mouseleave="isStatusFilterOpen = false">
        <button type="button" class="tasks-filter-button">
          {{ formatStatus(statusFilter) }}
          <v-icon size="18" color="grey">mdi-chevron-down</v-icon>
        </button>
        <Dropdown v-if="isStatusFilterOpen" :open="isStatusFilterOpen" :items="statusFilterItems"
          @close="closeStatusFilter" @select="selectStatusFilter" />
      </div>
    </div>

    <div class="tasks-content">
      <component :is="activeViewComponent" :tasks="filteredTasks" />
    </div>

    <v-dialog v-model="showCreateTask" max-width="600" class="create-task-dialog">
      <div class="create-task-modal glass">
        <div class="create-task-modal__header">
          <h2 class="create-task-modal__title">Create Task</h2>
          <button type="button" class="create-task-modal__close" @click="showCreateTask = false">
            <v-icon size="24">mdi-close</v-icon>
          </button>
        </div>

        <form @submit.prevent="createTask" class="create-task-modal__form">
          <div class="create-task-modal__field">
            <label class="create-task-modal__label">Task Title</label>
            <input v-model="newTaskTitle" type="text" class="create-task-modal__input" placeholder="Enter task title">
          </div>

          <div class="create-task-modal__field">
            <label class="create-task-modal__label">Description</label>
            <textarea v-model="newTaskDescription" class="create-task-modal__textarea" placeholder="Task description"
              rows="3"></textarea>
          </div>

          <div class="create-task-modal__row">
            <div class="create-task-modal__field">
              <label class="create-task-modal__label">Status</label>
              <div class="create-task-modal__select-wrapper">
                <select v-model="newTaskStatus" class="create-task-modal__select">
                  <option v-for="status in statuses" :key="status" :value="status">
                    {{ status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') }}
                  </option>
                </select>
                <v-icon class="create-task-modal__select-icon">mdi-chevron-down</v-icon>
              </div>
            </div>

            <div class="create-task-modal__field">
              <label class="create-task-modal__label">Assignee</label>
              <input v-model="newTaskAssignee" type="text" class="create-task-modal__input" placeholder="Assign to...">
            </div>
          </div>

          <div class="create-task-modal__actions">
            <button type="button" class="create-task-modal__btn create-task-modal__btn--secondary"
              @click="showCreateTask = false">
              Cancel
            </button>
            <button type="submit" class="create-task-modal__btn create-task-modal__btn--primary">
              Create Task
            </button>
          </div>
        </form>
      </div>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TaskListView from './TaskListView.vue'
import TaskBoardView from './TaskBoardView.vue'
import Dropdown from '@/components/dropdowns/Dropdown.vue'
import CreateButton from '@/components/buttons/CreateButton.vue'
//import CreateTaskModal from '../../modals/CreateTaskModal.vue'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const currentView = ref('list')
const showCreateTask = ref(false)
const newTaskTitle = ref('')
const newTaskDescription = ref('')
const newTaskStatus = ref('todo')
const newTaskAssignee = ref('')
const isStatusFilterOpen = ref(false)

const views = [
  { id: 'list', name: 'List', icon: 'mdi-format-list-bulleted' },
  { id: 'board', name: 'Board', icon: 'mdi-view-column' }
]

const statuses = ['todo', 'in_progress', 'review', 'done']

const statusFilterItems = computed(() => {
  const items = [
    { type: 'button', name: 'All Statuses', value: '' },
    { type: 'divider' }
  ]

  statuses.forEach(status => {
    items.push({
      type: 'button',
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      value: status
    })
  })

  return items
})

// Mock data - in a real app this would come from a store/API
const tasks = ref([
  { id: 1, title: 'Design Homepage', description: 'Create mockups for the new homepage', status: 'in_progress', assignee: 'Alex' },
  { id: 2, title: 'Setup Database', description: 'Configure MongoDB connection', status: 'done', assignee: 'Sam' },
  { id: 3, title: 'Auth Implementation', description: 'Implement JWT authentication', status: 'todo', assignee: 'Jordan' },
  { id: 4, title: 'User Testing', description: 'Conduct user interviews', status: 'review', assignee: 'Taylor' }
])

const searchQuery = ref('')
const statusFilter = ref('')

const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = statusFilter.value ? task.status === statusFilter.value : true
    return matchesSearch && matchesStatus
  })
})

const activeViewComponent = computed(() => {
  return currentView.value === 'list' ? TaskListView : TaskBoardView
})

const createTask = () => {
  if (!newTaskTitle.value) return

  tasks.value.push({
    id: Date.now(),
    title: newTaskTitle.value,
    description: newTaskDescription.value,
    status: newTaskStatus.value,
    assignee: newTaskAssignee.value
  })

  showCreateTask.value = false
  newTaskTitle.value = ''
  newTaskDescription.value = ''
  newTaskStatus.value = 'todo'
  newTaskAssignee.value = ''
}

const toggleStatusFilter = () => {
  isStatusFilterOpen.value = !isStatusFilterOpen.value
}

const closeStatusFilter = () => {
  isStatusFilterOpen.value = false
}

const selectStatusFilter = (item) => {
  if (item.type === 'button') {
    statusFilter.value = item.value
  }
}

const formatStatus = (status) => {
  if (!status) return 'All Statuses'
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}
</script>

<style scoped>
.tasks-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tasks-header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.tasks-title {
  font-family: var(--font-sans);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.view-switcher {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
}

.view-switcher-btn {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.view-switcher-btn:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.05);
}

.view-switcher-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.tasks-content {
  flex: 1;
  overflow: hidden;
}

.create-task-card {
  background: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

:deep(.v-field__outline__start),
:deep(.v-field__outline__end),
:deep(.v-field__outline__notch) {
  border-color: var(--color-border) !important;
}

:deep(.v-label) {
  color: var(--color-text-secondary) !important;
}

:deep(.v-field__input) {
  color: var(--color-text) !important;
}

.tasks-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.tasks-filter-group {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: var(--glass-border);
  border-radius: 9999px;
  padding: 0 0.75rem;
  height: 2.5rem;
  transition: all 0.2s;
}

.tasks-filter-group:focus-within {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.tasks-filter-input {
  background: transparent;
  border: none;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  width: 200px;
  margin-left: 0.5rem;
  outline: none;
  border-radius: 9999px;
}

.tasks-filter-input::placeholder {
  color: var(--color-text-secondary);
}

.tasks-filter-button {
  background: transparent;
  border: none;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  padding-right: 0.5rem;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 140px;
}

.create-task-modal {
  background: var(--glass-gradient);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-card);
  padding: 2rem;
  color: var(--color-text);
}

.create-task-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.create-task-modal__title {
  font-family: var(--font-sans);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.create-task-modal__close {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-task-modal__close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.create-task-modal__form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.create-task-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.create-task-modal__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.create-task-modal__label {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.create-task-modal__input,
.create-task-modal__textarea,
.create-task-modal__select {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  transition: all 0.2s;
  outline: none;
}

.create-task-modal__input:focus,
.create-task-modal__textarea:focus,
.create-task-modal__select:focus {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.05);
}

.create-task-modal__textarea {
  resize: vertical;
  min-height: 100px;
}

.create-task-modal__select-wrapper {
  position: relative;
}

.create-task-modal__select {
  appearance: none;
  cursor: pointer;
}

.create-task-modal__select-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--color-text-secondary);
}

.create-task-modal__select option {
  background: #1a1a1a;
  color: var(--color-text);
  padding: 0.5rem;
}

.create-task-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.create-task-modal__btn {
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.create-task-modal__btn--secondary {
  background: transparent;
  color: var(--color-text-secondary);
}

.create-task-modal__btn--secondary:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.05);
}

.create-task-modal__btn--primary {
  background: var(--equipt-orange);
  color: white;
}

.create-task-modal__btn--primary:hover {
  background: var(--color-equipt-orange-90);
  box-shadow: 0 4px 12px rgba(237, 150, 62, 0.3);
}
</style>
