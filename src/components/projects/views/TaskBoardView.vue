<template>
  <div class="task-board-view">
    <div v-for="status in statuses" :key="status.id" class="board-column" :class="status.id">
      <div class="column-header">
        <span class="column-title" :class="status.id">{{ status.label }}</span>
        <span class="column-count">{{ getTasksByStatus(status.id).length }}</span>
      </div>
      <div class="column-content">
        <div v-for="task in getTasksByStatus(status.id)" :key="task.id" class="board-card">
          <div class="card-header">
            <span class="task-id">#{{ task.id }}</span>
            <div class="assignee-avatar-small">{{ task.assignee.charAt(0) }}</div>
          </div>
          <h4 class="card-title">{{ task.title }}</h4>
          <p class="card-desc">{{ task.description }}</p>
          <div class="card-footer">
            <span class="status-dot" :class="status.id"></span>
            {{ status.label }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  tasks: {
    type: Array,
    required: true
  }
})

const statuses = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' }
]

const getTasksByStatus = (statusId) => {
  return props.tasks.filter(task => task.status === statusId)
}
</script>

<style scoped>
.task-board-view {
  display: flex;
  gap: 1rem;
  height: 100%;
  overflow-x: auto;
  padding-bottom: 1rem;
  align-items: flex-start;
}

.board-column {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-border);
  border-radius: 32px;
  max-height: 100%;
  border-top-width: 4px;
}

.board-column.todo {
  border-top-color: #ccc;
  background: linear-gradient(180deg, rgba(204, 204, 204, 0.5) 0%, rgba(204, 204, 204, 0.2) 100%);
}

.board-column.in_progress {
  border-top-color: #60a5fa;
  background: linear-gradient(180deg, rgba(96, 165, 250, 0.5) 0%, rgba(96, 165, 250, 0.2) 100%);
}

.board-column.review {
  border-top-color: #fbbf24;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.5) 0%, rgba(251, 191, 36, 0.2) 100%);
}

.board-column.done {
  border-top-color: #34d399;
  background: linear-gradient(180deg, rgba(52, 211, 153, 0.5) 0%, rgba(52, 211, 153, 0.2) 100%);
}

.column-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-title {
  font-family: var(--font-sans);
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9375rem;
}

.column-title.todo {
  color: #ccc;
}

.column-title.in_progress {
  color: #60a5fa;
}

.column-title.review {
  color: #fbbf24;
}

.column-title.done {
  color: #34d399;
}

.column-count {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.column-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.board-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-border);
  border-radius: 32px;
  padding: 1rem;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.board-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-id {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

.assignee-avatar-small {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: var(--equipt-orange);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 600;
}

.card-title {
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.25rem 0;
}

.card-desc {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.75rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.todo {
  background: #ccc;
}

.status-dot.in_progress {
  background: #60a5fa;
}

.status-dot.review {
  background: #fbbf24;
}

.status-dot.done {
  background: #34d399;
}
</style>
