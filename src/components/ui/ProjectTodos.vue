<template>
  <div class="todos-card">
    <div class="card-header">
      <span class="icon">✅</span>
      <span>Project Tasks</span>
      <button 
        v-if="canEdit" 
        @click="showAddTodo = true"
        class="add-task-button"
        title="Add Task"
      >
        +
      </button>
    </div>

    <!-- Add Todo Form -->
    <div v-if="showAddTodo && canEdit" class="add-todo-form">
      <form @submit.prevent="addTodo" class="flex gap-2">
        <input 
          v-model="newTodoText" 
          type="text" 
          placeholder="Enter task description"
          class="input-field flex-1"
          required
        />
        <button type="submit" class="btn-primary">Add</button>
        <button type="button" @click="showAddTodo = false" class="btn-secondary">Cancel</button>
      </form>
    </div>

    <!-- Filters and Search -->
    <div class="todos-controls">
      <div class="search-container">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search tasks..." 
          class="search-input"
        />
      </div>
      
      <div class="filter-tabs">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          class="filter-tab"
          :class="{ active: currentFilter === filter.value }"
          @click="currentFilter = filter.value"
        >
          {{ filter.label }}
          <span class="filter-count" v-if="getFilterCount(filter.value) > 0">
            {{ getFilterCount(filter.value) }}
          </span>
        </button>
      </div>
      
      <div class="sort-options">
        <select v-model="sortBy" class="sort-select">
          <option value="created_desc">Newest First</option>
          <option value="created_asc">Oldest First</option>
          <option value="completed">Completion Status</option>
        </select>
      </div>
    </div>

    <!-- Todo List -->
    <div v-if="filteredTodos.length > 0" class="todos-list">
      <!-- Active Tasks -->
      <div v-if="hasActiveTasks" class="todo-section">
        <div class="section-header">
          <h3>Active Tasks</h3>
          <span class="task-count">{{ activeTasksCount }} tasks</span>
        </div>
        <div 
          v-for="todo in activeTodos" 
          :key="todo.id"
          class="todo-item"
        >
          <div class="todo-content">
            <input
              type="checkbox"
              :checked="todo.completed"
              @change="toggleTodo(todo)"
              :disabled="!canEdit && todo.assigned_to !== user?.id"
              class="checkbox"
            />
            <div class="todo-details">
              <span class="todo-text">{{ todo.description }}</span>
              <div class="todo-meta">
                <div v-if="todo.assigned_to" class="assigned-to">
                  <img 
                    v-if="todo.assignee?.avatar_url" 
                    :src="todo.assignee.avatar_url" 
                    :alt="todo.assignee.display_name"
                    class="assignee-avatar"
                  />
                  <span v-else class="avatar-placeholder">
                    {{ todo.assignee?.display_name?.[0] || '?' }}
                  </span>
                  <span class="assignee-name">{{ todo.assignee?.display_name || 'Unknown User' }}</span>
                </div>
                <div v-else class="unassigned">
                  <span class="unassigned-text">Unassigned</span>
                  <button 
                    v-if="canEdit || user"
                    @click="claimTask(todo)"
                    class="claim-btn"
                    title="Claim this task"
                  >
                    Claim
                  </button>
                </div>
                <span class="todo-date">{{ formatDate(todo.created_at) }}</span>
              </div>
            </div>
          </div>
          <div class="todo-actions">
            <button 
              v-if="canEdit"
              @click="showAssignModal(todo)"
              class="action-btn assign-btn"
              title="Assign task"
            >
              👤
            </button>
            <button 
              v-if="canEdit"
              @click="deleteTodo(todo.id)"
              class="action-btn delete-btn"
              title="Delete task"
            >
              ×
            </button>
          </div>
        </div>
      </div>
      
      <!-- Completed Tasks -->
      <div v-if="hasCompletedTasks" class="todo-section completed-section">
        <div class="section-header">
          <h3>Completed Tasks</h3>
          <span class="task-count">{{ completedTasksCount }} tasks</span>
          <button 
            v-if="hasCompletedTasks" 
            @click="toggleCompletedVisibility" 
            class="toggle-completed-btn"
          >
            {{ showCompleted ? 'Hide' : 'Show' }}
          </button>
        </div>
        <div v-if="showCompleted">
          <div 
            v-for="todo in completedTodos" 
            :key="todo.id"
            class="todo-item completed"
          >
            <div class="todo-content">
              <input
                type="checkbox"
                :checked="todo.completed"
                @change="toggleTodo(todo)"
                :disabled="!canEdit && todo.assigned_to !== user?.id"
                class="checkbox"
              />
              <div class="todo-details">
                <span class="todo-text">{{ todo.description }}</span>
                <div class="todo-meta">
                  <div v-if="todo.assigned_to" class="assigned-to">
                    <img 
                      v-if="todo.assignee?.avatar_url" 
                      :src="todo.assignee.avatar_url" 
                      :alt="todo.assignee.display_name"
                      class="assignee-avatar"
                    />
                    <span v-else class="avatar-placeholder">
                      {{ todo.assignee?.display_name?.[0] || '?' }}
                    </span>
                    <span class="assignee-name">{{ todo.assignee?.display_name || 'Unknown User' }}</span>
                  </div>
                  <div v-else class="unassigned">
                    <span class="unassigned-text">Unassigned</span>
                  </div>
                  <span class="todo-date">{{ formatDate(todo.created_at) }}</span>
                </div>
              </div>
            </div>
            <div class="todo-actions">
              <button 
                v-if="canEdit"
                @click="showAssignModal(todo)"
                class="action-btn assign-btn"
                title="Assign task"
              >
                👤
              </button>
              <button 
                v-if="canEdit"
                @click="deleteTodo(todo.id)"
                class="action-btn delete-btn"
                title="Delete task"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <div v-if="searchQuery" class="no-results">
        No tasks match your search
      </div>
      <div v-else-if="currentFilter !== 'all'" class="no-results">
        No {{ currentFilter }} tasks
      </div>
      <div v-else class="no-results">
        No tasks added yet
      </div>
    </div>

    <!-- Assign Task Modal -->
    <div v-if="showAssignTaskModal" class="modal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Assign Task</h3>
          <button class="close-button" @click="closeAssignModal">×</button>
        </div>
        <div class="modal-body">
          <div class="search-container">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search collaborators..."
              class="search-input"
              @input="handleSearch"
            />
            <div v-if="collaboratorsLoading" class="search-loading">
              <div class="spinner-small"></div>
            </div>
          </div>
          <div v-if="filteredCollaborators.length > 0" class="search-results">
            <div
              v-for="collab in filteredCollaborators"
              :key="collab.id"
              class="search-result-item"
              @click="assignTask(collab)"
            >
              <div class="user-info">
                <div class="user-avatar">
                  <img
                    v-if="collab.user?.avatar_url"
                    :src="collab.user.avatar_url"
                    :alt="collab.user.display_name"
                  />
                  <div v-else class="avatar-placeholder">
                    {{ collab.user?.display_name?.[0]?.toUpperCase() || '?' }}
                  </div>
                </div>
                <div class="user-details">
                  <div class="user-name">{{ collab.user?.display_name }}</div>
                  <div class="user-email">{{ collab.user?.email }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="!collaboratorsLoading" class="no-results">
            No collaborators found
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../supabase/config'
import { useToast } from '../../composables/useToast'
import { useAuth } from '../../composables/useAuth'
import { useUserSearch } from '../../composables/useUserSearch'
import '../../styles/todos.css'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  canEdit: {
    type: Boolean,
    default: false
  }
})

const { user } = useAuth()
const todos = ref([])
const showAddTodo = ref(false)
const newTodoText = ref('')
const { showToast } = useToast()
const { searchResults, loading: searchLoading, searchUsers } = useUserSearch()

// Assignment modal state
const showAssignTaskModal = ref(false)
const selectedTodo = ref(null)
const searchQuery = ref('')
const collaborators = ref([])
const filteredCollaborators = ref([])
const collaboratorsLoading = ref(false)

// Filter and sort state
const currentFilter = ref('all')
const sortBy = ref('created_desc')
const showCompleted = ref(true)

// Filter options
const filters = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Unassigned', value: 'unassigned' }
]

// Task search query
const taskSearchQuery = ref('')

onMounted(async () => {
  await fetchTodos()
  await fetchCollaborators()
})

async function createProjectUpdate(description) {
  try {
    const updatePayload = {
      project_id: props.projectId,
      description,
      user_id: user.value?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('project_updates')
      .insert(updatePayload)

    if (error) throw error
  } catch (error) {
    console.error('Error creating project update:', error)
  }
}

async function fetchTodos() {
  try {
    // Step 1: Fetch todos, including the assigned_to UUID
    const { data: todosData, error: todosError } = await supabase
      .from('project_todos')
      .select(`
        * 
      `)
      .eq('project_id', props.projectId)
      .order('created_at', { ascending: false })

    if (todosError) throw todosError;
    if (!todosData) {
      todos.value = [];
      return;
    }

    // Step 2: Extract unique assignee IDs
    const assigneeIds = [...new Set(todosData
      .map(todo => todo.assigned_to)
      .filter(id => id !== null) // Filter out null IDs
    )];

    let assigneesMap = {};
    // Step 3: Fetch profiles for the unique assignee IDs if any exist
    if (assigneeIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles') // Query the profiles table
        .select('id, display_name, avatar_url')
        .in('id', assigneeIds); // Match the IDs

      if (profilesError) throw profilesError;

      // Create a map for easy lookup
      assigneesMap = profilesData.reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {});
    }

    // Step 4: Merge profile data into todos
    const enrichedTodos = todosData.map(todo => ({
      ...todo,
      // Add the 'assignee' object if the profile was found
      assignee: todo.assigned_to ? assigneesMap[todo.assigned_to] || null : null
    }));

    todos.value = enrichedTodos;

  } catch (error) {
    console.error('Error loading tasks and assignees:', error); // Log the specific error
    showToast('Error loading tasks', 'error');
  }
}

async function fetchCollaborators() {
  try {
    collaboratorsLoading.value = true
    
    // Get collaborators
    const { data: collaboratorsData, error: collabError } = await supabase
      .from('project_collaborators')
      .select(`
        role,
        user_id,
        created_at,
        updated_at
      `)
      .eq('project_id', props.projectId)

    if (collabError) throw new Error('Failed to fetch collaborators')

    // Get user profiles for collaborators
    if (collaboratorsData && collaboratorsData.length > 0) {
      const userIds = collaboratorsData.map(c => c.user_id)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      if (profilesError) {
        throw new Error('Failed to fetch collaborator profiles')
      } else {
        // Combine collaborators with user profiles
        collaborators.value = (collaboratorsData || []).map(collab => ({
          ...collab,
          user: profiles.find(p => p.id === collab.user_id) || null
        }))
        
        // Initialize filtered collaborators
        filteredCollaborators.value = [...collaborators.value]
      }
    } else {
      collaborators.value = []
      filteredCollaborators.value = []
    }
  } catch (error) {
    console.error('Error loading collaborators:', error)
    showToast('Error loading collaborators', 'error')
  } finally {
    collaboratorsLoading.value = false
  }
}

async function addTodo() {
  try {
    const { error: todoError } = await supabase
      .from('project_todos')
      .insert({
        project_id: props.projectId,
        description: newTodoText.value,
        completed: false
      })

    if (todoError) throw todoError

    // Create project update for new todo
    await createProjectUpdate(`Added new task: ${newTodoText.value}`)

    newTodoText.value = ''
    showAddTodo.value = false
    await fetchTodos()
    showToast('Task added successfully', 'success')
  } catch (error) {
    showToast('Error adding task', 'error')
  }
}

async function toggleTodo(todo) {
  try {
    const newStatus = !todo.completed
    const { error } = await supabase
      .from('project_todos')
      .update({ completed: newStatus })
      .eq('id', todo.id)

    if (error) throw error

    // Create project update for todo status change
    const updateText = newStatus 
      ? `Completed task: ${todo.description}`
      : `Reopened task: ${todo.description}`
    await createProjectUpdate(updateText)

    await fetchTodos()
  } catch (error) {
    showToast('Error updating task', 'error')
  }
}

async function deleteTodo(todoId) {
  try {
    // Get todo description before deleting
    const todoToDelete = todos.value.find(t => t.id === todoId)
    if (!todoToDelete) return

    const { error } = await supabase
      .from('project_todos')
      .delete()
      .eq('id', todoId)

    if (error) throw error

    // Create project update for deleted todo
    await createProjectUpdate(`Removed task: ${todoToDelete.description}`)

    await fetchTodos()
    showToast('Task deleted successfully', 'success')
  } catch (error) {
    showToast('Error deleting task', 'error')
  }
}

// New functions for task assignment
const showAssignModal = (todo) => {
  selectedTodo.value = todo
  showAssignTaskModal.value = true
  // Reset search and filtered collaborators
  searchQuery.value = ''
  filteredCollaborators.value = [...collaborators.value]
}

const closeAssignModal = () => {
  showAssignTaskModal.value = false
  selectedTodo.value = null
  searchQuery.value = ''
}

// Replace the handleSearch function with a local filter
const handleSearch = () => {
  if (searchQuery.value.length >= 2) {
    const query = searchQuery.value.toLowerCase()
    filteredCollaborators.value = collaborators.value.filter(collab => 
      collab.user?.display_name?.toLowerCase().includes(query) ||
      collab.user?.email?.toLowerCase().includes(query)
    )
  } else {
    filteredCollaborators.value = [...collaborators.value]
  }
}

const assignTask = async (selectedCollaborator) => {
  if (!selectedTodo.value) return

  try {
    const { error } = await supabase
      .from('project_todos')
      .update({
        assigned_to: selectedCollaborator.user_id
      })
      .eq('id', selectedTodo.value.id)

    if (error) throw error

    await createProjectUpdate(`Assigned task "${selectedTodo.value.description}" to ${selectedCollaborator.user?.display_name || 'Unknown User'}`)
    await fetchTodos()
    showToast('Task assigned successfully', 'success')
    closeAssignModal()
  } catch (error) {
    showToast('Error assigning task', 'error')
  }
}

const claimTask = async (todo) => {
  if (!user.value) return

  try {
    const { error } = await supabase
      .from('project_todos')
      .update({
        assigned_to: user.value.id
      })
      .eq('id', todo.id)

    if (error) throw error

    await createProjectUpdate(`Claimed task: ${todo.description}`)
    await fetchTodos()
    showToast('Task claimed successfully', 'success')
  } catch (error) {
    showToast('Error claiming task', 'error')
  }
}

// Format date helper
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Toggle completed tasks visibility
const toggleCompletedVisibility = () => {
  showCompleted.value = !showCompleted.value
}

// Computed properties for filtering and sorting
const filteredTodos = computed(() => {
  let result = [...todos.value]
  
  // Apply search filter if query exists
  if (taskSearchQuery.value) {
    const query = taskSearchQuery.value.toLowerCase()
    result = result.filter(todo => 
      todo.description.toLowerCase().includes(query) ||
      (todo.assignee?.display_name?.toLowerCase().includes(query))
    )
  }
  
  // Apply status filter
  if (currentFilter.value === 'active') {
    result = result.filter(todo => !todo.completed)
  } else if (currentFilter.value === 'completed') {
    result = result.filter(todo => todo.completed)
  } else if (currentFilter.value === 'assigned') {
    result = result.filter(todo => todo.assigned_to)
  } else if (currentFilter.value === 'unassigned') {
    result = result.filter(todo => !todo.assigned_to)
  }
  
  // Apply sorting
  if (sortBy.value === 'created_desc') {
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else if (sortBy.value === 'created_asc') {
    result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  } else if (sortBy.value === 'completed') {
    result.sort((a, b) => {
      if (a.completed === b.completed) {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      return a.completed ? 1 : -1
    })
  }
  
  return result
})

// Separate active and completed tasks
const activeTodos = computed(() => {
  return filteredTodos.value.filter(todo => !todo.completed)
})

const completedTodos = computed(() => {
  return filteredTodos.value.filter(todo => todo.completed)
})

// Count tasks by status
const activeTasksCount = computed(() => activeTodos.value.length)
const completedTasksCount = computed(() => completedTodos.value.length)

// Check if we have tasks of each type
const hasActiveTasks = computed(() => activeTodos.value.length > 0)
const hasCompletedTasks = computed(() => completedTodos.value.length > 0)

// Get count for filter tabs
const getFilterCount = (filterValue) => {
  if (filterValue === 'all') return todos.value.length
  if (filterValue === 'active') return todos.value.filter(t => !t.completed).length
  if (filterValue === 'completed') return todos.value.filter(t => t.completed).length
  if (filterValue === 'assigned') return todos.value.filter(t => t.assigned_to).length
  if (filterValue === 'unassigned') return todos.value.filter(t => !t.assigned_to).length
  return 0
}
</script>

<style scoped>
/* Additional styles for task assignment */
.todo-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  flex-wrap: wrap;
}

.assigned-to {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
}

.assignee-avatar,
.avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  background: var(--color-background-mute);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.unassigned {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
}

.claim-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border: none;
  border-radius: var(--border-radius);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.claim-btn:hover {
  background: var(--color-primary);
  color: white;
}

.todo-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-background-mute);
}

.assign-btn {
  color: var(--color-primary);
}

.delete-btn {
  color: var(--color-danger);
}

/* New styles for filtering and organization */
.todos-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
}

.search-container {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.filter-tab {
  padding: 0.5rem 1rem;
  background: var(--color-background-mute);
  border: none;
  border-radius: var(--border-radius);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-tab:hover {
  background: var(--color-background);
  color: var(--color-text);
}

.filter-tab.active {
  background: var(--color-primary);
  color: white;
}

.filter-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 1rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
}

.sort-options {
  display: flex;
  justify-content: flex-end;
}

.sort-select {
  padding: 0.5rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  color: var(--color-text);
  font-size: 0.875rem;
}

.todo-section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0 1rem;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0;
}

.task-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-background-mute);
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
}

.toggle-completed-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.75rem;
  cursor: pointer;
}

.completed-section {
  opacity: 0.8;
}

.todo-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* Modal styles */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: black;
  border-radius: var(--border-radius-large);
  padding: 1.5rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0.25rem;
  line-height: 1;
}

.close-button:hover {
  color: var(--color-text);
}

.search-loading {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}

.search-results {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
}

.search-result-item {
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.search-result-item:hover {
  background: var(--color-background-mute);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
}

.user-email {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .filter-tabs {
    flex-wrap: wrap;
  }
  
  .todos-controls {
    flex-direction: column;
  }
  
  .sort-options {
    justify-content: flex-start;
  }
}
</style> 