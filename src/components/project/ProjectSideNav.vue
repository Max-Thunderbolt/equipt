<template>
  <div>
    <!-- Overlay for mobile nav -->
    <div v-if="isMobile && isMobileNavOpen" class="mobile-nav-overlay" @click="handleOverlayClick" aria-label="Close navigation" tabindex="0"></div>
    <nav :class="['project-side-nav', { 'mobile-open': isMobileNavOpen }]" :aria-hidden="isMobile && !isMobileNavOpen" :style="{ top: navBarHeight + 'px' }">
      <!-- Hamburger for mobile -->
      <button 
        class="mobile-nav-toggle" 
        @click="$emit('toggle-nav')" 
        aria-label="Open navigation" 
        v-if="isMobile && !isMobileNavOpen && !isNavigationMenuOpen" 
        :style="{ top: navBarHeight + 16 + 'px' }"
      >
        <img :src="blackArrow" alt="Open menu" style="width: 32px; height: 32px; object-fit: contain;" />
      </button>
      
      <div class="nav-section" v-show="!isMobile || isMobileNavOpen">
        <div class="nav-header">
          <router-link :to="{ name: 'Projects' }" class="back-link">
            ← Back to Projects
          </router-link>
          <h1 class="project-name">{{ projectName }}</h1>
          
          <!-- Project Description (Collapsible) -->
          <div class="project-description-container">
            <button 
              class="description-toggle" 
              @click="toggleDescription"
              :aria-expanded="isDescriptionExpanded"
            >
              <span>Description</span>
              <span class="toggle-icon">{{ isDescriptionExpanded ? '−' : '+' }}</span>
            </button>
            <div 
              v-if="isDescriptionExpanded" 
              class="project-description"
              :class="{ 'has-description': projectDescription }"
            >
              <p v-if="projectDescription">{{ projectDescription }}</p>
              <p v-else class="no-description">No description provided.</p>
            </div>
          </div>
        </div>
        
        <div class="nav-items">
          <button 
            class="nav-item"
            :class="{ active: activeSection === 'pinboard' }"
            @click="handleSectionClick('pinboard')"
          >
            <span class="icon">📌</span>
            <span>Pinboard</span>
            <span class="toggle" v-if="activeSection === 'pinboard'">−</span>
            <span class="toggle" v-else>+</span>
          </button>

          <button 
            class="nav-item"
            :class="{ active: activeSection === 'tasks' }"
            @click="handleSectionClick('tasks')"
          >
            <span class="icon">✅</span>
            <span>Tasks</span>
            <span class="toggle" v-if="activeSection === 'tasks'">−</span>
            <span class="toggle" v-else>+</span>
          </button>

          <button 
            class="nav-item"
            :class="{ active: activeSection === 'files' }"
            @click="handleSectionClick('files')"
          >
            <span class="icon">📁</span>
            <span>Files</span>
            <span class="toggle" v-if="activeSection === 'files'">−</span>
            <span class="toggle" v-else>+</span>
          </button>
          
          <button 
            class="nav-item"
            :class="{ active: activeSection === 'updates' }"
            @click="handleSectionClick('updates')"
          >
            <span class="icon">🔄</span>
            <span>Updates</span>
            <span class="toggle" v-if="activeSection === 'updates'">−</span>
            <span class="toggle" v-else>+</span>
          </button>
        </div>
      </div>

      <div class="nav-section">
        <div class="section-title">{{ projectName }} Members ({{ collaborators.length + 1 }})</div>
        <div class="team-section">
          <!-- Project Owner -->
          <div class="team-member owner">
            <div class="avatar">
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
            <div class="avatar">
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

          <!-- Invite Collaborator Button -->
          <button 
            v-if="canManageRoles"
            class="invite-collaborator-btn"
            @click="openInviteModal"
          >
            <span class="icon">+</span>
            <span>Invite Member</span>
          </button>
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
      <teleport to="body">
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
                    <span class="role-description"> Can edit project content</span>
                  </label>
                  <label class="role-option">
                    <input 
                      type="radio" 
                      v-model="newRole" 
                      value="admin"
                    >
                    <span>Admin</span>
                    <span class="role-description"> Can manage members</span>
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
      </teleport>

      <!-- Invite Collaborator Modal -->
      <teleport to="body">
        <div v-if="showInviteModal" class="modal">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>Invite Member</h3>
              <button class="close-button" @click="closeInviteModal">×</button>
            </div>
            <div class="modal-body">
              <div class="search-section">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search users..."
                  class="search-input"
                  @input="handleSearch"
                />
                <div v-if="showSearchResults" class="search-results">
                  <div
                    v-for="user in searchResults"
                    :key="user.id"
                    class="search-result-item"
                    @click="selectUser(user)"
                  >
                    <div class="user-avatar">
                      <img
                        v-if="user.avatar_url"
                        :src="user.avatar_url"
                        :alt="user.display_name"
                        referrerpolicy="no-referrer"
                      />
                      <span v-else class="avatar-placeholder">
                        {{ user.display_name?.[0] || '?' }}
                      </span>
                    </div>
                    <div class="user-info">
                      <div class="user-name">{{ user.display_name }}</div>
                      <div class="user-email">{{ user.email }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="selectedUser" class="selected-user">
                <div class="user-avatar">
                  <img
                    v-if="selectedUser.avatar_url"
                    :src="selectedUser.avatar_url"
                    :alt="selectedUser.display_name"
                    referrerpolicy="no-referrer"
                  />
                  <span v-else class="avatar-placeholder">
                    {{ selectedUser.display_name?.[0] || '?' }}
                  </span>
                </div>
                <div class="user-info">
                  <div class="user-name">{{ selectedUser.display_name }}</div>
                  <div class="user-email">{{ selectedUser.email }}</div>
                </div>
                <button class="remove-selection" @click="selectedUser = null">×</button>
              </div>

              <div class="role-selector">
                <label>Select role:</label>
                <div class="role-options">
                  <label class="role-option">
                    <input 
                      type="radio" 
                      v-model="selectedRole" 
                      value="viewer"
                    >
                    <span>Viewer </span>
                    <span class="role-description"> Can view project content</span>
                  </label>
                  <label class="role-option">
                    <input 
                      type="radio" 
                      v-model="selectedRole" 
                      value="editor"
                    >
                    <span>Editor</span>
                    <span class="role-description"> Can edit project content</span>
                  </label>
                  <label class="role-option">
                    <input 
                      type="radio" 
                      v-model="selectedRole" 
                      value="admin"
                    >
                    <span>Admin</span>
                    <span class="role-description"> Can manage collaborators</span>
                  </label>
                </div>
              </div>

              <div class="modal-actions">
                <button class="btn-secondary" @click="closeInviteModal">Cancel</button>
                <button 
                  class="btn-primary" 
                  @click="sendInvite"
                  :disabled="!selectedUser || !selectedRole || sendingInvite"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      </teleport>
    </nav>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useUserSearch } from '../../composables/useUserSearch'
import { useProjectInvites } from '../../composables/useProjectInvites'
import { supabase } from '../../supabase/config'
import blackArrow from '../../assets/black_arrow.svg'

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
  },
  projectDescription: {
    type: String,
    default: ''
  },
  isMobile: {
    type: Boolean,
    default: false
  },
  isMobileNavOpen: {
    type: Boolean,
    default: false
  },
  navBarHeight: {
    type: Number,
    default: 72
  },
  isNavigationMenuOpen: {
    type: Boolean,
    default: false
  }
})

// Description toggle state
const isDescriptionExpanded = ref(false)

// Toggle description visibility
const toggleDescription = () => {
  isDescriptionExpanded.value = !isDescriptionExpanded.value
}

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

// Utility to update modal classes
function updateModalClasses() {
  const nav = document.querySelector('.project-side-nav');
  if (showRoleModal.value || showInviteModal.value) {
    document.body.classList.add('modal-open');
    if (nav) nav.classList.add('modal-active');
  } else {
    document.body.classList.remove('modal-open');
    if (nav) nav.classList.remove('modal-active');
  }
}

// Open role modal
const openRoleModal = (collaborator) => {
  selectedCollaborator.value = collaborator
  newRole.value = collaborator.role
  showRoleModal.value = true
  updateModalClasses()
}

// Close role modal
const closeRoleModal = () => {
  showRoleModal.value = false
  selectedCollaborator.value = null
  newRole.value = ''
  updateModalClasses()
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

// Invite modal state
const showInviteModal = ref(false)
const selectedUser = ref(null)
const selectedRole = ref('viewer')
const sendingInvite = ref(false)

// User search
const { searchResults, loading: searchLoading, searchUsers } = useUserSearch()
const searchQuery = ref('')
const showSearchResults = ref(false)

// Project invites
const { createInvite } = useProjectInvites()

// Handle user search
const handleSearch = async () => {
  if (searchQuery.value.length < 2) {
    showSearchResults.value = false
    return
  }
  
  await searchUsers(searchQuery.value)
  showSearchResults.value = true
}

// Select user from search results
const selectUser = (user) => {
  selectedUser.value = user
  searchQuery.value = ''
  showSearchResults.value = false
}

// Open invite modal
const openInviteModal = () => {
  showInviteModal.value = true
  updateModalClasses()
}

// Close invite modal
const closeInviteModal = () => {
  showInviteModal.value = false
  selectedUser.value = null
  selectedRole.value = 'viewer'
  searchQuery.value = ''
  showSearchResults.value = false
  updateModalClasses()
}

// Send invite
const sendInvite = async () => {
  if (!selectedUser.value || !selectedRole.value || sendingInvite.value) return
  
  sendingInvite.value = true
  
  try {
    const invite = await createInvite(props.projectId, selectedUser.value.id, selectedRole.value)
    
    if (invite) {
      // Create project update for invite
      const updatePayload = {
        project_id: props.projectId,
        description: `Invited ${selectedUser.value.display_name} as ${selectedRole.value}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.value?.id
      }

      const { error: updateError } = await supabase
        .from('project_updates')
        .insert(updatePayload)

      if (updateError) console.error('Error creating update record:', updateError)
      
      // Create a notification for the invited user
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedUser.value.id,
          type: 'project_invite',
          title: 'New Project Invite',
          message: `You've been invited to join ${props.projectName} as ${selectedRole.value}`,
          data: {
            project_id: props.projectId,
            invite_id: invite.id
          }
        })

      if (notificationError) console.error('Error creating notification:', notificationError)
      
      // Close modal
      closeInviteModal()
    }
  } catch (err) {
    console.error('Error sending invite:', err)
  } finally {
    sendingInvite.value = false
  }
}

const emit = defineEmits(['section-change', 'delete-project', 'role-updated', 'toggle-nav'])

const handleSectionClick = (section) => {
  emit('section-change', section)
  if (props.isMobile) {
    emit('toggle-nav')
  }
}

const handleOverlayClick = () => {
  if (props.isMobile && props.isMobileNavOpen) {
    emit('toggle-nav')
  }
}
</script>

<style scoped>
.project-side-nav {
  width: 280px;
  height: calc(100vh - var(--navbar-height, 72px));
  background: var(--color-black-95);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px 16px;
  position: fixed;
  top: var(--navbar-height, 72px);
  left: 0;
  transition: left 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s;
  z-index: 1000;
}

/* Make team section scrollable */
.team-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
}

/* Add custom scrollbar styles */
.team-section::-webkit-scrollbar {
  width: 6px;
}

.team-section::-webkit-scrollbar-track {
  background: var(--color-black-90);
  border-radius: 3px;
}

.team-section::-webkit-scrollbar-thumb {
  background: var(--color-black-70);
  border-radius: 3px;
}

.team-section::-webkit-scrollbar-thumb:hover {
  background: var(--color-black-60);
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

.avatar {
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

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

/* Keep the delete button fixed at the bottom */
.delete-project-btn {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: red;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.delete-project-btn:hover {
  background: var(--color-danger);
  color: white;
}

/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: auto;
}

/* Prevent background scroll and interaction when modal is open */
body.modal-open {
  overflow: hidden !important;
}

/* When modal is open, prevent pointer events on nav except modal */
.project-side-nav.modal-active {
  pointer-events: none;
}
.project-side-nav .modal,
.project-side-nav .modal * {
  pointer-events: auto;
}

.modal-content {
  background: var(--color-black-100);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.modal-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-body {
  padding: 1.5rem;
}

/* Keep selected-user styles scoped for now as they are specific */
.selected-user {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-black-90);
  border-radius: var(--border-radius);
  margin-bottom: 1.5rem;
}

/* Keep user-avatar specific styles scoped for now */
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
  margin-bottom: 1.25rem;
  font-weight: 500;
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.role-option {
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-black-90);
}

.role-option:hover {
  background: var(--color-black-80);
  border-color: var(--color-border-hover);
}

.role-option input[type="radio"] {
  margin-bottom: 0.5rem;
  margin-right: 0.75rem;
}

.role-option span:first-of-type {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.role-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  background: var(--color-black-80);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-black-70);
  border-color: var(--color-border-hover);
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  background: var(--color-primary);
  border: none;
  color: white;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  background: var(--color-black-60);
  cursor: not-allowed;
}

.project-description-container {
  margin-top: 8px;
}

.description-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.description-toggle:hover {
  background: var(--color-black-90);
  color: var(--color-text);
}

.toggle-icon {
  font-size: 16px;
  opacity: 0.7;
}

.project-description {
  padding: 12px;
  margin-top: 4px;
  background: var(--color-black-90);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
  max-height: 200px;
  overflow-y: auto;
}

.project-description p {
  margin: 0;
}

.no-description {
  color: var(--color-text-secondary);
  font-style: italic;
}

.invite-collaborator-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-black-90);
  border: 1px dashed var(--color-border);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s ease;
}

.invite-collaborator-btn:hover {
  background: var(--color-black-85);
  color: var(--color-text);
  border-color: var(--color-primary);
}

.invite-collaborator-btn .icon {
  font-size: 16px;
  opacity: 0.8;
}

.search-section {
  position: relative;
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-black-90);
  color: var(--color-text);
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-black-95);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.search-result-item:hover {
  background: var(--color-black-90);
}

.remove-selection {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  margin-left: auto;
}

.remove-selection:hover {
  color: var(--color-text);
}

@media (max-width: 768px) {
  .project-side-nav {
    position: fixed;
    left: -100vw;
    top: 0;
    width: 80vw;
    max-width: 320px;
    height: 100vh;
    background: var(--color-black-95);
    box-shadow: 2px 0 16px rgba(0,0,0,0.4);
    padding: 24px 12px;
    transition: left 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s;
    z-index: 1000;
  }
  
  .team-section {
    max-height: 250px;
  }
  
  .nav-section {
    padding: 24px 12px;
  }
  
  .project-side-nav.mobile-open {
    left: 0;
  }
  .mobile-nav-toggle {
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 1100;
    background: var(--color-black-90);
    border: none;
    border-radius: 8px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    cursor: pointer;
  }
  .hamburger {
    width: 28px;
    height: 3px;
    background: var(--color-white);
    border-radius: 2px;
    position: relative;
    display: block;
  }
  .hamburger::before, .hamburger::after {
    content: '';
    position: absolute;
    left: 0;
    width: 28px;
    height: 3px;
    background: var(--color-white);
    border-radius: 2px;
    transition: 0.2s;
  }
  .hamburger::before {
    top: -9px;
  }
  .hamburger::after {
    top: 9px;
  }
  .mobile-nav-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.5);
    z-index: 1001;
    transition: opacity 0.2s;
  }
}
</style> 