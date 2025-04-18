<template>
  <nav class="project-side-nav">
    <div class="nav-section">
      <div class="nav-header">
        <router-link :to="{ name: 'projects' }" class="back-link">
          ← Back to Projects
        </router-link>
        <h1 class="project-name">{{ projectName }}</h1>
      </div>
      
      <div class="nav-items">
        <button 
          class="nav-item"
          :class="{ active: activeSection === 'pinboard' }"
          @click="$emit('section-change', 'pinboard')"
        >
          <span class="icon">📌</span>
          <span>Pinboard</span>
          <span class="toggle" v-if="activeSection === 'pinboard'">−</span>
          <span class="toggle" v-else>+</span>
        </button>

        <button 
          class="nav-item"
          :class="{ active: activeSection === 'files' }"
          @click="$emit('section-change', 'files')"
        >
          <span class="icon">📁</span>
          <span>Files</span>
          <span class="toggle" v-if="activeSection === 'files'">−</span>
          <span class="toggle" v-else>+</span>
        </button>
        
        <button 
          class="nav-item"
          :class="{ active: activeSection === 'updates' }"
          @click="$emit('section-change', 'updates')"
        >
          <span class="icon">🔄</span>
          <span>Updates</span>
          <span class="toggle" v-if="activeSection === 'updates'">−</span>
          <span class="toggle" v-else>+</span>
        </button>
      </div>
    </div>

    <div class="nav-section">
      <div class="section-title">Project Team</div>
      <div class="team-section">
        <!-- Project Owner -->
        <div class="team-member owner">
          <div class="member-avatar">
            <img 
              v-if="owner?.avatar_url" 
              :src="owner.avatar_url" 
              :alt="owner.display_name"
              referrerpolicy="no-referrer"
            />
            <span v-else class="avatar-placeholder">
              {{ owner?.display_name?.[0] || '?' }}
            </span>
          </div>
          <div class="member-info">
            <span class="member-name">{{ owner?.display_name || 'Unknown' }}</span>
            <span class="member-role">Owner</span>
          </div>
        </div>

        <!-- Collaborators -->
        <div 
          v-for="collab in collaborators" 
          :key="collab.user_id" 
          class="team-member"
        >
          <div class="member-avatar">
            <img 
              v-if="collab.user?.avatar_url" 
              :src="collab.user.avatar_url" 
              :alt="collab.user.display_name"
              referrerpolicy="no-referrer"
            />
            <span v-else class="avatar-placeholder">
              {{ collab.user?.display_name?.[0] || '?' }}
            </span>
          </div>
          <div class="member-info">
            <span class="member-name">{{ collab.user?.display_name || 'Unknown' }}</span>
            <span class="member-role">{{ collab.role }}</span>
          </div>
          <!-- Add role management button for admins and owners -->
          <button 
            v-if="canManageRoles && collab.user_id !== user?.id"
            class="role-manage-btn"
            @click="openRoleModal(collab)"
            title="Change role"
          >
            <span class="icon">👤</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Project Button (for owners only) -->
    <button 
      v-if="isOwner"
      class="delete-project-btn"
      @click="$emit('delete-project')"
    >
      Delete Project
    </button>
    
    <!-- Role Assignment Modal -->
    <div v-if="showRoleModal" class="modal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Change Role</h3>
          <button class="close-button" @click="closeRoleModal">×</button>
        </div>
        <div class="modal-body">
          <div class="selected-user">
            <div class="user-avatar">
              <img 
                v-if="selectedCollaborator?.user?.avatar_url" 
                :src="selectedCollaborator.user.avatar_url" 
                :alt="selectedCollaborator.user.display_name"
              />
              <span v-else class="avatar-placeholder">
                {{ selectedCollaborator?.user?.display_name?.[0] || '?' }}
              </span>
            </div>
            <div class="user-info">
              <div class="user-name">{{ selectedCollaborator?.user?.display_name || 'Unknown' }}</div>
              <div class="current-role">Current role: {{ selectedCollaborator?.role || 'None' }}</div>
            </div>
          </div>
          
          <div class="role-selector">
            <label>Select new role:</label>
            <div class="role-options">
              <label class="role-option">
                <input 
                  type="radio" 
                  v-model="newRole" 
                  value="viewer"
                >
                <span>Viewer</span>
                <span class="role-description">Can view project content</span>
              </label>
              <label class="role-option">
                <input 
                  type="radio" 
                  v-model="newRole" 
                  value="editor"
                >
                <span>Editor</span>
                <span class="role-description">Can edit project content</span>
              </label>
              <label class="role-option">
                <input 
                  type="radio" 
                  v-model="newRole" 
                  value="admin"
                >
                <span>Admin</span>
                <span class="role-description">Can manage collaborators</span>
              </label>
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn-secondary" @click="closeRoleModal">Cancel</button>
            <button 
              class="btn-primary" 
              @click="updateRole"
              :disabled="!newRole || newRole === selectedCollaborator?.role"
            >
              Update Role
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { supabase } from '../../supabase/config'

const props = defineProps({
  projectName: {
    type: String,
    required: true
  },
  owner: {
    type: Object,
    required: true
  },
  collaborators: {
    type: Array,
    default: () => []
  },
  activeSection: {
    type: String,
    default: 'files'
  },
  projectId: {
    type: String,
    required: true
  }
})

const { user } = useAuth()

// Compute if current user is owner
const isOwner = computed(() => {
  return user.value?.id === props.owner?.id
})

// Compute if current user can manage roles (owner or admin)
const canManageRoles = computed(() => {
  if (isOwner.value) return true
  
  // Check if user is an admin
  const userCollab = props.collaborators.find(c => c.user_id === user.value?.id)
  return userCollab?.role === 'admin'
})

// Role management modal state
const showRoleModal = ref(false)
const selectedCollaborator = ref(null)
const newRole = ref('')
const updatingRole = ref(false)

// Open role modal
const openRoleModal = (collaborator) => {
  selectedCollaborator.value = collaborator
  newRole.value = collaborator.role
  showRoleModal.value = true
}

// Close role modal
const closeRoleModal = () => {
  showRoleModal.value = false
  selectedCollaborator.value = null
  newRole.value = ''
}

// Update collaborator role
const updateRole = async () => {
  if (!selectedCollaborator.value || !newRole.value || updatingRole.value) return
  
  updatingRole.value = true
  
  try {
    const { error } = await supabase
      .from('project_collaborators')
      .update({ role: newRole.value })
      .eq('project_id', props.projectId)
      .eq('user_id', selectedCollaborator.value.user_id)
    
    if (error) throw error
    
    // Emit event to parent to refresh collaborators
    emit('role-updated', {
      userId: selectedCollaborator.value.user_id,
      newRole: newRole.value
    })
    
    // Close modal
    closeRoleModal()
  } catch (error) {
    console.error('Error updating role:', error)
  } finally {
    updatingRole.value = false
  }
}

const emit = defineEmits(['section-change', 'delete-project', 'role-updated'])
</script>

<style scoped>
.project-side-nav {
  width: 280px;
  height: calc(100vh - 64px);
  background: var(--color-black-95); /* Primary color (60%) */
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px 16px;
  position: fixed;
  top: 64px;
  left: 0;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nav-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px;
}

.back-link {
  color: var(--color-text-secondary); /* Secondary color (30%) */
  text-decoration: none;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: var(--color-primary); /* Accent color (10%) */
}

.project-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  line-height: 1.4;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: var(--color-black-90);
  color: var(--color-text);
}

.nav-item.active {
  background: var(--color-black-85);
  color: var(--color-primary);
}

.nav-item .icon {
  font-size: 16px;
  opacity: 0.8;
}

.nav-item .toggle {
  margin-left: auto;
  font-size: 16px;
  opacity: 0.7;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 12px;
  margin-bottom: 8px;
}

.team-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.team-member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.team-member:hover {
  background: var(--color-black-90);
}

.member-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-black-80);
  flex-shrink: 0;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.role-manage-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.role-manage-btn:hover {
  background: var(--color-black-80);
  color: var(--color-primary);
}

.delete-project-btn {
  margin-top: auto;
  padding: 12px;
  border-radius: 8px;
  background: red;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-project-btn:hover {
  background: var(--color-danger);
  color: white;
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
  background: var(--gradient-winter);
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

.selected-user {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-black-90);
  border-radius: var(--border-radius);
  margin-bottom: 1.5rem;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-black-80);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name {
  font-weight: 600;
  font-size: 1rem;
}

.current-role {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.role-selector {
  margin-bottom: 1.5rem;
}

.role-selector label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.role-option {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-option:hover {
  background: var(--color-black-90);
}

.role-option input {
  margin-right: 0.5rem;
}

.role-option span:first-of-type {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.role-description {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-primary, .btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-black-90);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-black-80);
}
</style> 