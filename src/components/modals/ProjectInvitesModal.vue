<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content project-invites-modal">
      <div class="modal-header">
        <h3>Pending Project Invites</h3>
        <button class="close-button" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="project-invites">
          <div v-if="loading" class="loading">
            Loading invites...
          </div>
          <div v-else-if="error" class="error">
            {{ error }}
          </div>
          <div v-else-if="invites.length === 0" class="no-invites">
            No pending invites found.
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
                      Invited by {{ invite.invited_by_user?.display_name || 'Unknown' }} as {{ invite.role }}
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue'
import { useProjectInvites } from '../../composables/useProjectInvites'
import { useRouter } from 'vue-router'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close'])

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

const closeModal = () => {
  emit('close')
}

// Fetch invites when the modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    console.log('ProjectInvitesModal opened, fetching invites...');
    fetchUserInvites()
  } else {
    // Optionally clear invites when closing, or let Navigation handle it
  }
}, { immediate: false }) // Don't run immediately, only when isOpen changes to true


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
        // Close modal and navigate to the project
        closeModal()
        router.push(`/projects/${invite.project_id}`)
      } else {
         // Invite might have been processed already, just close modal
         closeModal()
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
    // No need to close modal here, fetchUserInvites called by declineInviteAction
    // should update the list automatically. If the list becomes empty, 
    // the user might want to close the modal manually.
  } finally {
    processingInvite.value = null
  }
}

// No onMounted needed here as we use the watcher

</script>

<style scoped>
/* Use general modal styles + specific invite styles */
@import '../../styles/modals.css';

.project-invites-modal .modal-body {
  padding: 0; /* Remove default body padding if needed */
}

.project-invites {
  padding: 1rem; /* Add padding inside the body */
  max-height: 60vh;
  overflow-y: auto;
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
  flex-wrap: wrap; /* Allow wrapping on small screens */
}

.inviter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-grow: 1; /* Allow inviter info to take space */
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
  flex-shrink: 0; /* Prevent actions from shrinking too much */
}

/* Optional: Add media query for better layout on small screens */
@media (max-width: 500px) {
  .invite-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .invite-actions {
     width: 100%;
     justify-content: flex-end;
  }
}
</style> 