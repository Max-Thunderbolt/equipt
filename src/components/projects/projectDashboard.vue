<template>
    <div class="project-dashboard">
        <header class="dashboard-header">
            <h1 class="dashboard-title">Dashboard</h1>
            <p class="dashboard-subtitle">Overview of your project activity and progress.</p>
        </header>

        <div class="dashboard-cards">
            <div class="dashboard-card">
                <span class="dashboard-card-label">Total Files</span>
                <span class="dashboard-card-value">{{ totalFiles }}</span>
                <span class="dashboard-card-meta">+{{ filesThisWeek }} this week</span>
            </div>
            <div class="dashboard-card">
                <span class="dashboard-card-label">Collaborators</span>
                <span class="dashboard-card-value">{{ collaboratorsCount }}</span>
                <span class="dashboard-card-meta">{{ collaboratorsOnline }} online</span>
            </div>
            <div class="dashboard-card">
                <span class="dashboard-card-label">Tasks</span>
                <span class="dashboard-card-value">{{ tasksCount }}</span>
                <span class="dashboard-card-meta">{{ tasksThisWeek }} this week</span>
            </div>
            <div class="dashboard-card">
                <span class="dashboard-card-label">Messages</span>
                <span class="dashboard-card-value">{{ messagesCount }}</span>
                <span class="dashboard-card-meta">Last updated {{ lastMessageUpdate }}</span>
            </div>
        </div>

        <section class="recent-activity">
            <h2 class="recent-activity-title">Recent Activity</h2>
            <ul class="recent-activity-list">
                <li v-for="(item, index) in recentActivity" :key="index" class="recent-activity-item">
                    <span class="recent-activity-description">{{ item.description }}</span>
                    <span class="recent-activity-time">{{ item.time }}</span>
                </li>
            </ul>
        </section>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    project: {
        type: Object,
        required: true,
    },
})

const collaboratorsCount = computed(() => (props.project.collaborators || []).length)

const totalFiles = 24
const filesThisWeek = 3
const collaboratorsOnline = 2
const messagesCount = 10
const lastMessageUpdate = '1 hour ago'
const tasksCount = 10
const tasksThisWeek = 3

const recentActivity = computed(() => [
    { description: 'Sam Chen uploaded 3 new files', time: '2 hours ago' },
    { description: 'Alex Morgan created a new board', time: '5 hours ago' },
    { description: 'Jordan Lee left a comment on Hero Banner v2', time: '1 day ago' },
    { description: 'Taylor Kim updated the brand guidelines', time: '2 days ago' },
])
</script>

<style scoped>
.project-dashboard {
    width: 100%;
    max-width: 100%;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.dashboard-header {
    margin-bottom: 0.25rem;
}

.dashboard-title {
    font-family: var(--font-sans);
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.25rem 0;
}

.dashboard-subtitle {
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.5;
}

.dashboard-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}

.dashboard-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--border-radius-large);
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.dashboard-card-label {
    font-family: var(--font-sans);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-secondary);
}

.dashboard-card-value {
    font-family: var(--font-sans);
    font-size: 2rem;
    font-weight: 700;
    color: var(--equipt-orange);
    line-height: 1.2;
}

.dashboard-card-meta {
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
}

.recent-activity {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--border-radius-large);
    padding: 1.5rem 1.5rem;
}

.recent-activity-title {
    font-family: var(--font-sans);
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 1rem 0;
}

.recent-activity-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.recent-activity-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-family: var(--font-sans);
}

.recent-activity-item:last-child {
    border-bottom: none;
}

.recent-activity-description {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
}

.recent-activity-time {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    flex-shrink: 0;
}

@media (max-width: 768px) {
    .dashboard-cards {
        grid-template-columns: 1fr;
    }
}
</style>
