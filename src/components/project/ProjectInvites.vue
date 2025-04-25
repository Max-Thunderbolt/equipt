<template>
  <div class="project-invites">
    <div v-if="loading" class="loading">
      Loading invites...
    </div>
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    <div v-else-if="invites.length === 0" class="no-invites">
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
                class="btn-primary"
                @click="acceptInvite(invite.id)"
                :disabled="processingInvite === invite.id"
              >
                Accept
              </button>
              <button 
                class="btn-secondary"
                @click="declineInvite(invite.id)"
                :disabled="processingInvite === invite.id"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useProjectInvites } from '../../composables/useProjectInvites'
import { useRouter } from 'vue-router'

const router = useRouter()
const { 
  invites, 
  loading, 
  error, 
  fetchUserInvites, 
  acceptInvite: acceptInviteAction, 
  declineInvite: declineInviteAction 
} = useProjectInvites()

const processingInvite = ref(null)

// Accept an invite
const acceptInvite = async (inviteId) => {
  if (processingInvite.value) return
  
  processingInvite.value = inviteId
  
  try {
    const success = await acceptInviteAction(inviteId)
    if (success) {
      // Find the project ID from the invite
      const invite = invites.value.find(i => i.id === inviteId)
      if (invite) {
        // Navigate to the project
        router.push(`/projects/${invite.project_id}`)
      }
    }
  } finally {
    processingInvite.value = null
  }
}

// Decline an invite
const declineInvite = async (inviteId) => {
  if (processingInvite.value) return
  
  processingInvite.value = inviteId
  
  try {
    await declineInviteAction(inviteId)
  } finally {
    processingInvite.value = null
  }
}

onMounted(() => {
  fetchUserInvites()
})
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
</style> 