<template>
  <div class="task-list-view">
    <CollapsibleTable
      v-for="group in taskGroups"
      :key="group.id"
      :title="group.title"
      :items="group.tasks"
      :headers="headers"
      :grid-style="{ gridTemplateColumns: '3fr 1fr 1fr' }"
      :color="group.color"
    >
      <template #row="{ item: task }">
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
      </template>
    </CollapsibleTable>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CollapsibleTable from '@/components/tables/CollapsibleTable.vue'

const props = defineProps({
  tasks: {
    type: Array,
    required: true
  }
})

const headers = [
  { label: 'Title', key: 'title' },
  { label: 'Status', key: 'status' },
  { label: 'Assignee', key: 'assignee' }
]

const taskGroups = computed(() => {
  const groups = {
    todo: [],
    in_progress: [],
    review: [],
    done: []
  }
  
  // Group tasks by status
  props.tasks.forEach(task => {
    const status = task.status || 'todo'
    if (groups[status]) {
      groups[status].push(task)
    } else {
      // If status is not one of the predefined ones, add it to todo or handle dynamically
      // For now, let's just add to todo as fallback
      groups.todo.push(task)
    }
  })

  return [
    { id: 'todo', title: 'To Do', color: '#ccc', tasks: groups.todo },
    { id: 'in_progress', title: 'In Progress', color: '#60a5fa', tasks: groups.in_progress },
    { id: 'review', title: 'Review', color: '#fbbf24', tasks: groups.review },
    { id: 'done', title: 'Done', color: '#34d399', tasks: groups.done }
  ].filter(g => g.tasks.length > 0)
})

const formatStatus = (status) => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
</script>

<style scoped>
.task-list-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 2rem;
}

/* Scrollbar styling */
.task-list-view::-webkit-scrollbar {
  width: 6px;
}

.task-list-view::-webkit-scrollbar-track {
  background: transparent;
}

.task-list-view::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.task-list-view::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
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
