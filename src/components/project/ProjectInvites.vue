<template>
  <div class="project-invites">
    <div v-if="loading" class="loading">
      Loading invites...
    </div>
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    <div v-else-if="invites.length === 0" class="no-invites">
      <div class="empty-icon">📭</div>
      No pending invites
    </div>
    <div v-else class="invites-list">
      <div 
        v-for="invite in invites" 
        :key="invite.id" 
        class="invite-item"
      >
        <div class="invite-content">
          <div class="project-info">
            <h4 class="project-name">{{ invite.project.name }}</h4>
            <p class="project-description">{{ invite.project.description }}</p>
          </div>
          
          <div class="invite-details">
            <div class="inviter">
              <div class="avatar">
                <img 
                  v-if="invite.invited_by_user?.avatar_url" 
                  :src="invite.invited_by_user.avatar_url" 
                  :alt="invite.invited_by_user.display_name"
                  referrerpolicy="no-referrer"
                />
                <span v-else class="avatar-placeholder">
                  {{ invite.invited_by_user?.display_name?.[0] || '?' }}
                </span>
              </div>
              <span class="inviter-name">
                {{ invite.invited_by_user?.display_name || 'Unknown' }} invited you as {{ invite.role }}
              </span>
            </div>
            
            <div class="invite-actions">
              <button 
                class="btn btn-primary"
                @click="acceptInvite(invite.id)"
                :disabled="processingInvite === invite.id"
              >
                <span v-if="processingInvite === invite.id" class="spinner" aria-label="Processing">⏳</span>
                <span v-else>Accept</span>
              </button>
              <button 
                class="btn btn-secondary"
                @click="declineInvite(invite.id)"
                :disabled="processingInvite === invite.id"
              >
                <span v-if="processingInvite === invite.id" class="spinner" aria-label="Processing">⏳</span>
                <span v-else>Deny</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  invites: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['accept', 'decline'])
const router = useRouter()
const processingInvite = ref(null)

// Accept an invite
const acceptInvite = async (inviteId) => {
  if (processingInvite.value) return
  processingInvite.value = inviteId
  emit('accept', inviteId, () => {
    // Find the project ID from the invite
    const invite = props.invites.find(i => i.id === inviteId)
    if (invite) {
      router.push(`/projects/${invite.project_id}`)
    }
    processingInvite.value = null
  }, () => {
    processingInvite.value = null
  })
}

// Decline an invite
const declineInvite = async (inviteId) => {
  if (processingInvite.value) return
  processingInvite.value = inviteId
  emit('decline', inviteId, () => {
    processingInvite.value = null
  })
}
</script>

<style scoped>
.project-invites {
  padding: 1rem;
}

.loading, .error, .no-invites {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.error {
  color: var(--color-danger);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.6;
}

.invites-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.invite-item {
  background: var(--color-black-90);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.invite-content {
  padding: 1rem;
}

.project-info {
  margin-bottom: 1rem;
}

.project-name {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.project-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.invite-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.inviter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

.inviter-name {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.invite-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  border-radius: var(--border-radius-small);
  padding: 0.5rem 1.25rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.2s, color 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:disabled {
  background: var(--color-primary-80);
  color: #fff;
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-secondary {
  background: var(--color-black-80);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:disabled {
  background: var(--color-black-70);
  color: var(--color-text-secondary);
  cursor: not-allowed;
  opacity: 0.7;
}

.spinner {
  font-size: 1.1em;
  vertical-align: middle;
  margin-right: 0.25em;
}
</style> 