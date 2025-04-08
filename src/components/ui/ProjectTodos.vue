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

    <!-- Todo List -->
    <div v-if="todos.length > 0" class="todos-list">
      <div 
        v-for="todo in todos" 
        :key="todo.id"
        class="todo-item"
        :class="{ 'completed': todo.completed }"
      >
        <div class="todo-content">
          <input
            type="checkbox"
            :checked="todo.completed"
            @change="toggleTodo(todo)"
            :disabled="!canEdit"
            class="checkbox"
          />
          <span class="todo-text">{{ todo.description }}</span>
        </div>
        <button 
          v-if="canEdit"
          @click="deleteTodo(todo.id)"
          class="delete-btn"
          title="Delete task"
        >
          ×
        </button>
      </div>
    </div>
    <div v-else class="empty-state">
      No tasks added yet
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../supabase/config'
import { useToast } from '../../composables/useToast'
import { useAuth } from '../../composables/useAuth'

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

onMounted(async () => {
  await fetchTodos()
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
    const { data, error } = await supabase
      .from('project_todos')
      .select('*')
      .eq('project_id', props.projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    todos.value = data
  } catch (error) {
    showToast('Error loading tasks', 'error')
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
</script>

<style scoped>
.todos-card {
  background: linear-gradient(to bottom, var(--secondary-dark), rgba(30, 30, 36, 1));
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.2rem;
  font-size: 1.1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.card-header .icon {
  font-size: 1.2rem;
}

.add-task-button {
  margin-left: auto;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  font-size: 1.2rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-task-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.add-todo-form {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.input-field {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.input-field:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.btn-primary {
  background: var(--accent-blue);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--accent-blue-hover);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.todos-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.todo-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.todo-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.todo-text {
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.4;
}

.completed .todo-text {
  text-decoration: line-through;
  color: var(--text-secondary);
}

.checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.checkbox:checked {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
}

.delete-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.2rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 0.5rem;
}

.delete-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  padding: 2rem 0;
  font-style: italic;
}
</style> 