<template>
    <div class="projects-dropdown">
        <div class="projects-dropdown-caret"></div>
        <div class="projects-dropdown-menu">
            <button class="projects-dropdown-item projects-dropdown-item--highlight"
                @click="selectListItem(listItems[0])">
                Logout
            </button>

        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const listItems = ref([
    { id: 1, name: 'Create New Project' },
    { id: 2, name: 'My Projects' },
]);

const selectListItem = (listItem) => {
    console.log(listItem);
}


</script>

<style scoped>
.projects-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
}

.projects-dropdown-caret {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid white;
    filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.05));
}

.projects-dropdown-menu {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 0.5rem 0;
    min-width: 200px;
}

.projects-dropdown-item {
    font-family: var(--font-mono) !important;
    display: block;
    width: 100%;
    padding: 0.6rem 1rem;
    text-align: left;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.95rem;
    color: #000;
}

.projects-dropdown-item:hover,
.projects-dropdown-item--highlight:hover {
    background: var(--equipt-orange);
    color: white;
    transition: all 0.3s ease;
    border-radius: 0.5rem;
}

.projects-dropdown-divider {
    height: 1px;
    background: #e5e7eb;
    margin: 0.25rem 0;
}

.projects-dropdown-invites {
    font-family: var(--font-mono) !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    color: #374151;
}
</style>