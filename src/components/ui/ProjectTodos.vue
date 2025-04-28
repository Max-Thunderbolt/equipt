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
      <form @submit.prevent="addTodo" class="flex flex-col gap-3">
        <div class="form-group">
          <input 
            v-model="newTodoTitle" 
            type="text" 
            placeholder="Task title"
            class="input-field w-full text-lg font-medium"
            required
          />
        </div>
        <div class="form-group">
          <textarea 
            v-model="newTodoDescription" 
            placeholder="Add description..."
            class="input-field w-full min-h-[80px] resize-y"
            rows="3"
          ></textarea>
        </div>
        <div class="flex gap-2 items-center">
          <div class="form-group flex-1">
            <input 
              v-model="newTodoDuration" 
              type="number" 
              placeholder="Duration (min)"
              class="input-field"
              min="0"
            />
          </div>
          <div class="form-group flex-1">
            <input 
              v-model="newTodoDueDate" 
              type="datetime-local" 
              class="input-field"
            />
          </div>
          <button type="submit" class="btn-primary">Add Task</button>
          <button type="button" @click="showAddTodo = false" class="btn-secondary">Cancel</button>
        </div>
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
              <div class="todo-header">
                <span class="todo-title">{{ todo.name }}</span>
                <div class="todo-actions">
                  <button 
                    v-if="canEdit"
                    @click="toggleEditMode(todo)"
                    class="action-btn edit-btn"
                    title="Edit task"
                  >
                    ✏️
                  </button>
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
              <div v-if="editingTodo?.id === todo.id" class="edit-todo-form">
                <form @submit.prevent="saveTodoEdit(todo)" class="flex flex-col gap-3">
                  <div class="form-group">
                    <input 
                      v-model="editingTodo.title" 
                      type="text" 
                      placeholder="Task title"
                      class="input-field w-full text-lg font-medium"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <textarea 
                      v-model="editingTodo.description" 
                      placeholder="Add description..."
                      class="input-field w-full min-h-[80px] resize-y"
                      rows="3"
                    ></textarea>
                  </div>
                  <div class="flex gap-2 items-center">
                    <div class="form-group flex-1">
                      <input 
                        v-model="editingTodo.duration_minutes" 
                        type="number" 
                        placeholder="Duration (min)"
                        class="input-field"
                        min="0"
                      />
                    </div>
                    <div class="form-group flex-1">
                      <input 
                        v-model="editingTodo.due_date" 
                        type="datetime-local" 
                        class="input-field"
                      />
                    </div>
                  </div>
                  <div class="subtasks-edit">
                    <h4 class="subtasks-title">Subtasks</h4>
                    <div class="subtasks-list">
                      <div 
                        v-for="subtask in editingTodo.subtasks" 
                        :key="subtask.id"
                        class="subtask-item"
                      >
                        <input
                          type="checkbox"
                          v-model="subtask.completed"
                          class="checkbox"
                        />
                        <input
                          v-model="subtask.description"
                          type="text"
                          class="input-field flex-1"
                          placeholder="Subtask description"
                        />
                        <button 
                          type="button"
                          @click="deleteSubtask(subtask.id)"
                          class="delete-subtask-btn"
                          title="Delete subtask"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div class="add-subtask">
                      <form @submit.prevent="addSubtask(todo)" class="add-subtask-form">
                        <input 
                          v-model="newSubtaskText[todo.id]" 
                          type="text" 
                          placeholder="Add subtask..."
                          class="input-field"
                        />
                        <button type="submit" class="btn-primary btn-sm">Add</button>
                      </form>
                    </div>
                  </div>
                  <div class="edit-actions">
                    <button type="submit" class="btn-primary">Save Changes</button>
                    <button 
                      type="button" 
                      @click="cancelEdit" 
                      class="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
              <p v-else-if="todo.description" class="todo-description">{{ todo.description }}</p>
              <div v-if="todo.subtasks && todo.subtasks.length > 0" class="subtasks-list">
                <div 
                  v-for="subtask in todo.subtasks" 
                  :key="subtask.id"
                  class="subtask-item"
                >
                  <input
                    type="checkbox"
                    :checked="subtask.completed"
                    @change="toggleSubtask(subtask)"
                    :disabled="!canEdit && todo.assigned_to !== user?.id"
                    class="checkbox"
                  />
                  <span :class="{ 'completed': subtask.completed }">{{ subtask.description }}</span>
                  <button 
                    v-if="canEdit"
                    @click="deleteSubtask(subtask.id)"
                    class="delete-subtask-btn"
                    title="Delete subtask"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div v-if="canEdit || todo.assigned_to === user?.id" class="add-subtask">
                <form @submit.prevent="addSubtask(todo)" class="add-subtask-form">
                  <input 
                    v-model="newSubtaskText[todo.id]" 
                    type="text" 
                    placeholder="Add subtask..."
                    class="input-field"
                  />
                  <button type="submit" class="btn-primary btn-sm">Add</button>
                </form>
              </div>
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
                <span v-if="todo.duration_minutes" class="todo-duration">
                  ⏱️ {{ todo.duration_minutes }} min
                </span>
                <span v-if="todo.due_date" class="todo-due-date" :class="{ 'overdue': isOverdue(todo.due_date) }">
                  📅 {{ formatDate(todo.due_date) }}
                </span>
              </div>
            </div>
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
                <div class="todo-header">
                  <span class="todo-title">{{ todo.name }}</span>
                  <div class="todo-actions">
                    <button 
                      v-if="canEdit"
                      @click="toggleEditMode(todo)"
                      class="action-btn edit-btn"
                      title="Edit task"
                    >
                      ✏️
                    </button>
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
                <div v-if="editingTodo?.id === todo.id" class="edit-todo-form">
                  <form @submit.prevent="saveTodoEdit(todo)" class="flex flex-col gap-3">
                    <div class="form-group">
                      <input 
                        v-model="editingTodo.title" 
                        type="text" 
                        placeholder="Task title"
                        class="input-field w-full text-lg font-medium"
                        required
                      />
                    </div>
                    <div class="form-group">
                      <textarea 
                        v-model="editingTodo.description" 
                        placeholder="Add description..."
                        class="input-field w-full min-h-[80px] resize-y"
                        rows="3"
                      ></textarea>
                    </div>
                    <div class="flex gap-2 items-center">
                      <div class="form-group flex-1">
                        <input 
                          v-model="editingTodo.duration_minutes" 
                          type="number" 
                          placeholder="Duration (min)"
                          class="input-field"
                          min="0"
                        />
                      </div>
                      <div class="form-group flex-1">
                        <input 
                          v-model="editingTodo.due_date" 
                          type="datetime-local" 
                          class="input-field"
                        />
                      </div>
                    </div>
                    <div class="subtasks-edit">
                      <h4 class="subtasks-title">Subtasks</h4>
                      <div class="subtasks-list">
                        <div 
                          v-for="subtask in editingTodo.subtasks" 
                          :key="subtask.id"
                          class="subtask-item"
                        >
                          <input
                            type="checkbox"
                            v-model="subtask.completed"
                            class="checkbox"
                          />
                          <input
                            v-model="subtask.description"
                            type="text"
                            class="input-field flex-1"
                            placeholder="Subtask description"
                          />
                          <button 
                            type="button"
                            @click="deleteSubtask(subtask.id)"
                            class="delete-subtask-btn"
                            title="Delete subtask"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <div class="add-subtask">
                        <form @submit.prevent="addSubtask(todo)" class="add-subtask-form">
                          <input 
                            v-model="newSubtaskText[todo.id]" 
                            type="text" 
                            placeholder="Add subtask..."
                            class="input-field"
                          />
                          <button type="submit" class="btn-primary btn-sm">Add</button>
                        </form>
                      </div>
                    </div>
                    <div class="edit-actions">
                      <button type="submit" class="btn-primary">Save Changes</button>
                      <button 
                        type="button" 
                        @click="cancelEdit" 
                        class="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
                <p v-else-if="todo.description" class="todo-description">{{ todo.description }}</p>
                <div v-if="todo.subtasks && todo.subtasks.length > 0" class="subtasks-list">
                  <div 
                    v-for="subtask in todo.subtasks" 
                    :key="subtask.id"
                    class="subtask-item"
                  >
                    <input
                      type="checkbox"
                      :checked="subtask.completed"
                      @change="toggleSubtask(subtask)"
                      :disabled="!canEdit && todo.assigned_to !== user?.id"
                      class="checkbox"
                    />
                    <span :class="{ 'completed': subtask.completed }">{{ subtask.description }}</span>
                    <button 
                      v-if="canEdit"
                      @click="deleteSubtask(subtask.id)"
                      class="delete-subtask-btn"
                      title="Delete subtask"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div v-if="canEdit || todo.assigned_to === user?.id" class="add-subtask">
                  <form @submit.prevent="addSubtask(todo)" class="add-subtask-form">
                    <input 
                      v-model="newSubtaskText[todo.id]" 
                      type="text" 
                      placeholder="Add subtask..."
                      class="input-field"
                    />
                    <button type="submit" class="btn-primary btn-sm">Add</button>
                  </form>
                </div>
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
                  <span v-if="todo.duration_minutes" class="todo-duration">
                    ⏱️ {{ todo.duration_minutes }} min
                  </span>
                  <span v-if="todo.due_date" class="todo-due-date" :class="{ 'overdue': isOverdue(todo.due_date) }">
                    📅 {{ formatDate(todo.due_date) }}
                  </span>
                </div>
              </div>
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
const newTodoTitle = ref('')
const newTodoDescription = ref('')
const newTodoDuration = ref(null)
const newTodoDueDate = ref(null)
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

const newSubtaskText = ref({})

const editingTodo = ref(null)

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
        *,
        subtasks:project_subtasks(*)
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
      .filter(id => id !== null)
    )];

    let assigneesMap = {};
    if (assigneeIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', assigneeIds);

      if (profilesError) throw profilesError;
      assigneesMap = profilesData.reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {});
    }

    // Step 3: Merge profile data into todos
    const enrichedTodos = todosData.map(todo => ({
      ...todo,
      assignee: todo.assigned_to ? assigneesMap[todo.assigned_to] || null : null
    }));

    todos.value = enrichedTodos;
  } catch (error) {
    console.error('Error loading tasks and assignees:', error);
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
        name: newTodoTitle.value,
        description: newTodoDescription.value || null,
        completed: false,
        duration_minutes: newTodoDuration.value ? parseInt(newTodoDuration.value) : null,
        due_date: newTodoDueDate.value || null
      })

    if (todoError) throw todoError

    // Create project update for new todo
    await createProjectUpdate(`Added new task: ${newTodoTitle.value}`)

    newTodoTitle.value = ''
    newTodoDescription.value = ''
    newTodoDuration.value = null
    newTodoDueDate.value = null
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
      ? `Completed task: ${todo.name}`
      : `Reopened task: ${todo.name}`
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
    await createProjectUpdate(`Removed task: ${todoToDelete.name}`)

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

    await createProjectUpdate(`Assigned task "${selectedTodo.value.name}" to ${selectedCollaborator.user?.display_name || 'Unknown User'}`)
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

    await createProjectUpdate(`Claimed task: ${todo.name}`)
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

// Add isOverdue helper function
const isOverdue = (dueDate) => {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

// Computed properties for filtering and sorting
const filteredTodos = computed(() => {
  let result = [...todos.value]
  
  // Apply search filter if query exists
  if (taskSearchQuery.value) {
    const query = taskSearchQuery.value.toLowerCase()
    result = result.filter(todo => 
      todo.name.toLowerCase().includes(query) ||
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

// Add a new subtask
async function addSubtask(todo) {
  if (!newSubtaskText.value[todo.id]) return;

  try {
    const { error } = await supabase
      .from('project_subtasks')
      .insert({
        todo_id: todo.id,
        description: newSubtaskText.value[todo.id],
        completed: false
      })

    if (error) throw error;

    newSubtaskText.value[todo.id] = '';
    await fetchTodos();
    showToast('Subtask added successfully', 'success');
  } catch (error) {
    showToast('Error adding subtask', 'error');
  }
}

// Toggle subtask completion
async function toggleSubtask(subtask) {
  try {
    const newStatus = !subtask.completed;
    const { error } = await supabase
      .from('project_subtasks')
      .update({ completed: newStatus })
      .eq('id', subtask.id)

    if (error) throw error;
    await fetchTodos();
  } catch (error) {
    showToast('Error updating subtask', 'error');
  }
}

// Delete a subtask
async function deleteSubtask(subtaskId) {
  try {
    const { error } = await supabase
      .from('project_subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) throw error;
    await fetchTodos();
    showToast('Subtask deleted successfully', 'success');
  } catch (error) {
    showToast('Error deleting subtask', 'error');
  }
}

// Toggle edit mode for a todo
function toggleEditMode(todo) {
  if (editingTodo.value?.id === todo.id) {
    cancelEdit()
  } else {
    editingTodo.value = {
      ...todo,
      subtasks: todo.subtasks ? [...todo.subtasks] : []
    }
  }
}

// Cancel editing
function cancelEdit() {
  editingTodo.value = null
}

// Save todo edits
async function saveTodoEdit(todo) {
  try {
    // Update main todo
    const { error: todoError } = await supabase
      .from('project_todos')
      .update({
        name: editingTodo.value.title,
        description: editingTodo.value.description,
        duration_minutes: editingTodo.value.duration_minutes ? parseInt(editingTodo.value.duration_minutes) : null,
        due_date: editingTodo.value.due_date || null
      })
      .eq('id', todo.id)

    if (todoError) throw todoError

    // Update subtasks
    for (const subtask of editingTodo.value.subtasks) {
      if (subtask.id) {
        // Update existing subtask
        const { error: subtaskError } = await supabase
          .from('project_subtasks')
          .update({
            description: subtask.description,
            completed: subtask.completed
          })
          .eq('id', subtask.id)

        if (subtaskError) throw subtaskError
      }
    }

    await fetchTodos()
    editingTodo.value = null
    showToast('Task updated successfully', 'success')
  } catch (error) {
    console.error('Error updating task:', error)
    showToast('Error updating task', 'error')
  }
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

.todo-duration,
.todo-due-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.todo-due-date.overdue {
  color: var(--color-danger);
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

/* Additional styles for new todo layout */
.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.todo-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.2;
}

.todo-description {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
  white-space: pre-line;
}

.add-todo-form {
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  padding: 1rem;
  margin: 1rem;
}

.add-todo-form textarea {
  font-family: inherit;
  line-height: 1.5;
}

.todo-content {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  flex: 1;
}

.checkbox {
  margin-top: 0.35rem;
}

.subtasks-list {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.9rem;
}

.subtask-item .completed {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.delete-subtask-btn {
  opacity: 0;
  background: none;
  border: none;
  color: var(--color-danger);
  cursor: pointer;
  padding: 0 0.25rem;
  font-size: 1.1rem;
  line-height: 1;
  transition: opacity 0.2s ease;
}

.subtask-item:hover .delete-subtask-btn {
  opacity: 1;
}

.add-subtask {
  margin-top: 0.5rem;
  padding-left: 1.5rem;
}

.add-subtask-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.add-subtask-form .input-field {
  flex: 1;
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
}

.edit-todo-form {
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  padding: 1rem;
  margin: 0.5rem 0;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.subtasks-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 0.5rem 0;
}

.edit-btn {
  color: var(--color-primary);
}

.subtasks-edit {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-background);
  border-radius: var(--border-radius);
}

.subtasks-edit .subtasks-list {
  margin: 0.5rem 0;
}

.subtasks-edit .subtask-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  margin-bottom: 0.5rem;
}

.subtasks-edit .subtask-item .input-field {
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
}

.subtasks-edit .delete-subtask-btn {
  opacity: 1;
  padding: 0.25rem 0.5rem;
}
</style> 