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
  </nav>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue'
import { useAuth } from '../../composables/useAuth'

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
  }
})

const { user } = useAuth()

// Compute if current user is owner
const isOwner = computed(() => {
  return user.value?.id === props.owner?.id
})

defineEmits(['section-change', 'delete-project'])
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

.delete-project-btn {
  margin-top: auto;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-black-90);
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
</style> 