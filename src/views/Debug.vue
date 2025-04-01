<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase/config'
import { useProjects } from '../composables/useProjects'

const TABLES = {
  PROJECT_COLLABORATORS: 'project_collaborators'
}

const { removeCollaborator } = useProjects()
const collaborators = ref([])
const testProjectId = ref('')
const testUserId = ref('')
const loading = ref(false)
const message = ref('')

// Function to fetch all collaborators
const fetchCollaborators = async () => {
  loading.value = true
  try {
    // Fetch all project collaborators
    const { data, error } = await supabase
      .from(TABLES.PROJECT_COLLABORATORS)
      .select('*')
    
    if (error) throw error
    
    collaborators.value = data || []
    console.log('Fetched collaborators:', collaborators.value)
  } catch (err) {
    console.error('Error fetching collaborators:', err)
    message.value = 'Error fetching collaborators: ' + err.message
  } finally {
    loading.value = false
  }
}

// Function to test direct deletion using Supabase
const testDirectDeletion = async () => {
  if (!testProjectId.value || !testUserId.value) {
    message.value = 'Please provide both project ID and user ID'
    return
  }
  
  loading.value = true
  message.value = ''
  
  try {
    console.log(`Attempting direct deletion: Project ID: ${testProjectId.value}, User ID: ${testUserId.value}`)
    
    // Direct Supabase call
    const { data, error } = await supabase
      .from(TABLES.PROJECT_COLLABORATORS)
      .delete()
      .eq('project_id', testProjectId.value)
      .eq('user_id', testUserId.value)
      .select()
    
    console.log('Direct deletion response:', { data, error })
    
    if (error) throw error
    
    message.value = 'Direct deletion successful'
    // Refresh the list
    await fetchCollaborators()
  } catch (err) {
    console.error('Error in direct deletion:', err)
    message.value = 'Error in direct deletion: ' + err.message
  } finally {
    loading.value = false
  }
}

// Function to test deletion using composable
const testComposableDeletion = async () => {
  if (!testProjectId.value || !testUserId.value) {
    message.value = 'Please provide both project ID and user ID'
    return
  }
  
  loading.value = true
  message.value = ''
  
  try {
    console.log(`Testing removal via composable: Project ID: ${testProjectId.value}, User ID: ${testUserId.value}`)
    
    // Use the composable function
    const success = await removeCollaborator(testProjectId.value, testUserId.value)
    
    console.log('Composable removal result:', success)
    
    if (!success) {
      throw new Error('Composable returned false')
    }
    
    message.value = 'Composable deletion successful'
    // Refresh the list
    await fetchCollaborators()
  } catch (err) {
    console.error('Error in composable deletion:', err)
    message.value = 'Error in composable deletion: ' + err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCollaborators()
})
</script>

<template>
  <div class="debug-page container">
    <h1>Debug Collaborator Removal</h1>
    
    <div v-if="loading" class="loading">Loading...</div>
    
    <div v-if="message" class="message" :class="{ error: message.includes('Error') }">
      {{ message }}
    </div>
    
    <div class="debug-controls">
      <h2>Test Deletion</h2>
      <div class="form-group">
        <label for="project-id">Project ID:</label>
        <input
          id="project-id"
          v-model="testProjectId"
          type="text"
          placeholder="Enter project ID"
        >
      </div>
      
      <div class="form-group">
        <label for="user-id">User ID:</label>
        <input
          id="user-id"
          v-model="testUserId"
          type="text"
          placeholder="Enter user ID"
        >
      </div>
      
      <div class="button-group">
        <button @click="testDirectDeletion" class="btn btn-primary" :disabled="loading">
          Test Direct Deletion
        </button>
        <button @click="testComposableDeletion" class="btn btn-danger" :disabled="loading">
          Test Composable Deletion
        </button>
        <button @click="fetchCollaborators" class="btn btn-secondary" :disabled="loading">
          Refresh List
        </button>
      </div>
    </div>
    
    <div class="collaborators-list">
      <h2>Current Collaborators</h2>
      <div v-if="collaborators.length === 0" class="empty-state">
        No collaborators found
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Project ID</th>
            <th>User ID</th>
            <th>Role</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="collab in collaborators" :key="`${collab.project_id}-${collab.user_id}`">
            <td>
              <span class="id">{{ collab.project_id }}</span>
              <button @click="testProjectId = collab.project_id" class="copy-btn" title="Use this project ID">Use</button>
            </td>
            <td>
              <span class="id">{{ collab.user_id }}</span>
              <button @click="testUserId = collab.user_id" class="copy-btn" title="Use this user ID">Use</button>
            </td>
            <td>{{ collab.role }}</td>
            <td>{{ new Date(collab.created_at).toLocaleString() }}</td>
            <td>
              <button 
                @click="testProjectId = collab.project_id; testUserId = collab.user_id; testDirectDeletion()" 
                class="btn btn-sm btn-danger"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.debug-page {
  padding: 2rem;
}

.message {
  padding: 1rem;
  margin: 1rem 0;
  background-color: #e6f7e6;
  border-radius: 4px;
}

.message.error {
  background-color: #f7e6e6;
}

.debug-controls {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, 
.data-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.id {
  font-family: monospace;
  font-size: 0.8rem;
  color: #666;
}

.copy-btn {
  background: none;
  border: none;
  color: #0077cc;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  margin-left: 0.5rem;
}

.copy-btn:hover {
  text-decoration: underline;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}
</style> 