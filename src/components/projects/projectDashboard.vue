<template>
    <div class="project-dashboard">
        <h1 class="project-dashboard-title">Dashboard</h1>
    </div>
</template>


<script setup>

const props = defineProps({
    project: {
        type: Object,
        required: true
    }
})

</script>

<style scoped>
.project-dashboard {
    width: 100%;
    height: 100%;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: 1rem;
    margin-top: 2rem;
    margin-left: 2rem;
    margin-right: 2rem;
    margin-bottom: 2rem;
}

.project-dashboard-title {
    font-family: var(--font-sans);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
}
</style>