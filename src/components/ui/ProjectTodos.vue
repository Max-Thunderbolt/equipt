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
/* Styles moved to todos.css */
</style> 