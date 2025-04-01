<template>
  <div class="collaborator-management">
    <div v-if="error" class="error-message">{{ error }}</div>
    
    <div class="collaborator-list">
      <div v-for="collaborator in collaborators" :key="collaborator.user_id" class="collaborator-item">
        <!-- Avatar -->
        <div v-if="collaborator.user?.avatar_url" class="collaborator-avatar">
          <img :src="collaborator.user.avatar_url" :alt="collaborator.user?.display_name" />
        </div>
        <div v-else class="collaborator-avatar">
          {{ collaborator.user?.display_name?.[0] || '?' }}
        </div>

        <!-- Info -->
        <div class="collaborator-info">
          <span class="collaborator-name">{{ collaborator.user?.display_name }}</span>
          <span class="collaborator-role">{{ collaborator.role }}</span>
        </div>

        <!-- Actions -->
        <div class="collaborator-actions">
          <select 
            v-if="canManageRole(collaborator)"
            v-model="collaborator.role"
            class="role-select"
            @change="handleRoleChange(collaborator)"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button 
            v-if="canRemoveCollaborator(collaborator)"
            class="remove-collaborator"
            @click="removeCollaborator(collaborator)"
            title="Remove collaborator"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- Search Input -->
    <input
      type="text"
      class="search-input"
      placeholder="Search users to invite..."
      v-model="searchQuery"
      @input="handleSearch"
    />

    <!-- Add new collaborators section -->
    <div class="add-collaborators-section">
      <!-- Search results -->
      <div v-if="showSearchResults && searchResults.length > 0" class="search-results">
        <div v-for="user in searchResults" :key="user.id" class="search-result-item">
          <div class="user-info">
            <div class="user-avatar small">
              <img 
                v-if="user.avatar_url" 
                :src="user.avatar_url" 
                :alt="user.display_name"
                referrerpolicy="no-referrer"
              >
              <div v-else class="avatar-placeholder">
                {{ user.display_name?.[0]?.toUpperCase() || '?' }}
              </div>
            </div>
            <div class="user-details">
              <span class="user-name">{{ user.display_name }}</span>
              <span class="user-email">{{ user.email }}</span>
            </div>
          </div>
          <button 
            type="button"
            class="add-btn"
            @click="addCollaborator(user)"
            :disabled="isAddingCollaborator(user.id)"
          >
            Add
          </button>
        </div>
      </div>

      <!-- New collaborators to be added -->
      <div v-if="newCollaborators.length > 0" class="new-collaborators">
        <h4>New Collaborators</h4>
        <div v-for="collab in newCollaborators" :key="collab.id" class="new-collab-item">
          <div class="user-info">
            <div class="user-avatar small">
              <img 
                v-if="collab.avatar_url" 
                :src="collab.avatar_url" 
                :alt="collab.display_name"
                referrerpolicy="no-referrer"
              >
              <div v-else class="avatar-placeholder">
                {{ collab.display_name?.[0]?.toUpperCase() || '?' }}
              </div>
            </div>
            <div class="user-details">
              <span class="user-name">{{ collab.display_name }}</span>
              <span class="user-email">{{ collab.email }}</span>
            </div>
          </div>
          <div class="collab-actions">
            <select 
              v-model="collab.role"
              class="role-select"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button 
              type="button" 
              class="remove-btn" 
              @click="removeNewCollaborator(collab.id)"
            >×</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div v-if="hasUnsavedChanges || newCollaborators.length > 0" class="action-buttons">
      <button 
        type="button" 
        class="cancel-btn"
        @click="cancelChanges"
      >
        Cancel
      </button>
      <button 
        type="button" 
        class="save-btn"
        @click="applyChanges"
        :disabled="isApplyingChanges"
      >
        Save Changes
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { collaboratorService } from '../services/collaboratorService'
import { supabase } from '../supabase/config'
import { useAuth } from '../composables/useAuth'

const TABLES = {
  PROJECT_COLLABORATORS: 'project_collaborators',
  USERS: 'users'
}

export default {
  name: 'CollaboratorManagement',
  props: {
    projectId: {
      type: String,
      required: true
    },
    ownerId: {
      type: String,
      required: true
    },
    collaborators: {
      type: Array,
      default: () => []
    },
    newCollaborators: {
      type: Array,
      default: () => []
    },
    isOwner: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
  },
  emits: ['collaborator-removed', 'role-updated', 'collaborators-added'],
  setup(props, { emit }) {
    const { user } = useAuth()
    const updatingRoleFor = ref(null)
    const removingCollaborator = ref(null)
    const error = ref(null)
    const hasUnsavedChanges = ref(false)
    const pendingRoleChanges = ref(new Map())
    const localRoles = ref(new Map())
    const searchQuery = ref('')
    const searchResults = ref([])
    const showSearchResults = ref(false)
    const newCollaborators = ref([])
    const isApplyingChanges = ref(false)

    // Initialize local roles when component mounts
    onMounted(() => {
      props.collaborators.forEach(collab => {
        localRoles.value.set(collab.user_id, collab.role)
      })
    })

    const isUpdatingRole = (userId) => {
      return updatingRoleFor.value === userId
    }

    const isAddingCollaborator = (userId) => {
      return newCollaborators.value.some(c => c.id === userId)
    }

    const onSearchInput = async () => {
      if (searchQuery.value.length < 2) {
        showSearchResults.value = false
        return
      }

      try {
        const { data, error } = await supabase
          .from(TABLES.USERS)
          .select('id, display_name, email, avatar_url')
          .ilike('display_name', `%${searchQuery.value}%`)
          .limit(5)

        if (error) throw error

        // Filter out existing collaborators and already added new collaborators
        searchResults.value = data.filter(user => 
          !props.collaborators.some(c => c.user_id === user.id) &&
          !newCollaborators.value.some(c => c.id === user.id)
        )
        showSearchResults.value = true
      } catch (err) {
        console.error('Error searching users:', err)
        error.value = 'Failed to search users'
      }
    }

    const addCollaborator = (user) => {
      newCollaborators.value.push({
        id: user.id,
        display_name: user.display_name,
        email: user.email,
        avatar_url: user.avatar_url,
        role: 'viewer'
      })
      showSearchResults.value = false
      searchQuery.value = ''
    }

    const removeNewCollaborator = (userId) => {
      newCollaborators.value = newCollaborators.value.filter(c => c.id !== userId)
    }

    const onRoleSelect = (collaborator, newRole) => {
      if (collaborator.role === newRole) return
      localRoles.value.set(collaborator.user_id, newRole)
      pendingRoleChanges.value.set(collaborator.user_id, newRole)
      hasUnsavedChanges.value = true
    }

    const getLocalRole = (userId) => {
      return localRoles.value.get(userId) || props.collaborators.find(c => c.user_id === userId)?.role
    }

    const onRemoveClick = (collaborator) => {
      emit('collaborator-removed', collaborator)
    }

    const cancelChanges = () => {
      // Reset all changes
      localRoles.value.clear()
      pendingRoleChanges.value.clear()
      newCollaborators.value = []
      hasUnsavedChanges.value = false
      searchQuery.value = ''
      showSearchResults.value = false
    }

    const applyChanges = async () => {
      if (pendingRoleChanges.value.size === 0 && newCollaborators.value.length === 0) return

      isApplyingChanges.value = true
      error.value = null

      try {
        // Apply role changes
        for (const [userId, newRole] of pendingRoleChanges.value) {
          updatingRoleFor.value = userId
          const result = await collaboratorService.updateRole(props.projectId, userId, newRole)
          if (!result) throw new Error(`Failed to update role for user ${userId}`)
          
          localRoles.value.set(userId, result.role)
          const collaborator = props.collaborators.find(c => c.user_id === userId)
          if (collaborator) {
            collaborator.role = result.role
          }

          emit('role-updated', {
            userId,
            newRole: result.role
          })
        }

        // Add new collaborators
        if (newCollaborators.value.length > 0) {
          const result = await collaboratorService.addCollaborators(props.projectId, newCollaborators.value)
          if (!result) throw new Error('Failed to add new collaborators')
          emit('collaborators-added', result)
        }

        // Clear all changes
        pendingRoleChanges.value.clear()
        newCollaborators.value = []
        hasUnsavedChanges.value = false
      } catch (err) {
        console.error('Error applying changes:', err)
        error.value = `Failed to apply changes: ${err.message}`
      } finally {
        isApplyingChanges.value = false
        updatingRoleFor.value = null
      }
    }

    const canManageRole = (collaborator) => {
      if (!user.value) return false
      if (props.isOwner) return true
      if (props.isAdmin && collaborator.role !== 'admin') return true
      return false
    }

    const canRemoveCollaborator = (collaborator) => {
      if (!user.value) return false
      if (props.isOwner) return true
      if (props.isAdmin && collaborator.role !== 'admin') return true
      return false
    }

    const handleRoleChange = async (collaborator) => {
      try {
        const result = await collaboratorService.updateRole(props.projectId, collaborator.user_id, collaborator.role)
        emit('role-updated', { userId: collaborator.user_id, newRole: collaborator.role })
      } catch (error) {
        console.error('Error updating role:', error)
        // Reset to original role
        collaborator.role = props.collaborators.find(c => c.user_id === collaborator.user_id)?.role
      }
    }

    const removeCollaborator = async (collaborator) => {
      try {
        await collaboratorService.removeCollaborator(props.projectId, collaborator.user_id)
        emit('collaborator-removed', collaborator.user_id)
      } catch (error) {
        console.error('Error removing collaborator:', error)
      }
    }

    const handleSearch = () => {
      // Implement search logic here
    }

    // Watch for collaborator changes to ensure UI is up to date
    watch(() => props.collaborators, (newCollaborators) => {
      // Update local state if needed
    }, { deep: true })

    return {
      updatingRoleFor,
      removingCollaborator,
      error,
      hasUnsavedChanges,
      isUpdatingRole,
      isAddingCollaborator,
      onRoleSelect,
      onRemoveClick,
      applyChanges,
      cancelChanges,
      getLocalRole,
      searchQuery,
      searchResults,
      showSearchResults,
      newCollaborators,
      isApplyingChanges,
      onSearchInput,
      addCollaborator,
      removeNewCollaborator,
      canManageRole,
      canRemoveCollaborator,
      handleRoleChange,
      removeCollaborator,
      handleSearch
    }
  }
}
</script>

<style scoped>
.collaborator-management {
  width: 100%;
}

.error-message {
  color: var(--error-color);
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: var(--error-bg);
  border: 1px solid var(--error-border);
  border-radius: 4px;
}

.collaborator-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.collaborator-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.collaborator-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 0.75rem;
}

.collaborator-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.collaborator-info {
  flex: 1;
}

.collaborator-name {
  font-weight: 500;
}

.collaborator-role {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.collaborator-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-select {
  padding: 0.25rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.remove-collaborator {
  padding: 0.25rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.remove-collaborator:hover {
  color: var(--error-color);
}

.add-collaborators-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: rgba(255, 255, 255, 0.08);
}

.search-results {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  margin-bottom: 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.search-result-item:last-child {
  border-bottom: none;
}

.add-btn {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.add-btn:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.add-btn:disabled {
  background: var(--disabled-color);
  cursor: not-allowed;
}

.new-collaborators {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.new-collab-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.new-collab-item:last-child {
  margin-bottom: 0;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.save-btn {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.save-btn:disabled {
  background: var(--disabled-color);
  cursor: not-allowed;
}

.save-btn:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style> 