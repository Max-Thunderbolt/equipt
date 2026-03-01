<template>
  <div class="task-list-view">
    <div class="task-list-header">
      <div class="header-cell title">Title</div>
      <div class="header-cell status">Status</div>
      <div class="header-cell assignee">Assignee</div>
    </div>
    <div class="task-list-body">
      <div v-for="task in tasks" :key="task.id" class="task-row">
        <div class="cell title">
          <span class="task-title-text">{{ task.title }}</span>
          <span class="task-desc-preview">{{ task.description }}</span>
        </div>
        <div class="cell status">
          <span class="status-badge" :class="task.status">{{ formatStatus(task.status) }}</span>
        </div>
        <div class="cell assignee">
          <div class="assignee-avatar">{{ task.assignee.charAt(0) }}</div>
          <span>{{ task.assignee }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  tasks: {
    type: Array,
    required: true
  }
})

const formatStatus = (status) => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
</script>

<style scoped>
.task-list-view {
  display: flex;
  flex-direction: column;
  /* height: calc(100% - 2rem);
  margin-bottom: 2rem; */
  background: var(--glass-gradient-grey);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 12px;
  overflow: hidden;
}

.task-list-header {
  display: grid;
  grid-template-columns: 3fr 1fr 1fr;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.task-row {
  display: grid;
  grid-template-columns: 3fr 1fr 1fr;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
  transition: all 0.2s;
  cursor: pointer;
  border-radius: 32px;
  border: var(--glass-border);
  margin: 1rem;
}

.task-row:hover {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.task-row:last-child {
  border-bottom: none;
}

.cell {
  font-family: var(--font-sans);
  color: var(--color-text);
  font-size: 0.9375rem;
}

.cell.title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.task-title-text {
  font-weight: 500;
}

.task-desc-preview {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.todo {
  background: rgba(128, 128, 128, 0.2);
  color: #ccc;
}

.status-badge.in_progress {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.status-badge.review {
  background: rgba(237, 150, 62, 0.2);
  color: #fbbf24;
}

.status-badge.done {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.cell.assignee {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.assignee-avatar {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: var(--equipt-orange);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
