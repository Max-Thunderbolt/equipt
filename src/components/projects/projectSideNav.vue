<template>
    <div class="project-side-nav-container">
        <div class="project-side-nav">

            <!-- Back to projects -->
            <router-link to="/projects" class="sideNavBackToProjects">
                <span class="sideNavBackToProjectsButton">
                    <v-icon size="20">mdi-arrow-left</v-icon>
                </span>
                <span class="sideNavBackToProjectsText">Back to projects</span>
            </router-link>

            <!-- Header -->
            <div class="sideNavHeader">
                <h2 class="sideNavHeaderTitle">{{ project.name }}</h2>
                <div class="sideNavDescription">{{ project.description }}</div>
            </div>

            <!-- Overview -->
            <div class="sideNavSection">
                <h3 class="sideNavSectionTitle">Overview</h3>
                <div class="sideNavSectionContent">
                    <div class="sideNavSectionItem" @click="navigateToView('dashboard')">
                        <h4 class="sideNavSectionItemTitle"><v-icon size="18">mdi-view-dashboard</v-icon> Dashboard</h4>
                    </div>
                    <div class="sideNavSectionItem" @click="navigateToView('files')">
                        <h4 class="sideNavSectionItemTitle"><v-icon size="18">mdi-file</v-icon> Files</h4>
                    </div>
                    <div class="sideNavSectionItem" @click="navigateToView('assets')">
                        <h4 class="sideNavSectionItemTitle"><v-icon size="18">mdi-image</v-icon> Assets</h4>
                    </div>
                </div>
            </div>

            <!-- Collaborate -->
            <div class="sideNavSection">
                <h3 class="sideNavSectionTitle">Collaborate</h3>
                <div class="sideNavSectionContent">
                    <div class="sideNavSectionItem" @click="navigateToView('discussions')">
                        <h4 class="sideNavSectionItemTitle"><v-icon size="18">mdi-message</v-icon> Discussions</h4>
                    </div>
                    <div class="sideNavSectionItem" @click="navigateToView('tasks')">
                        <h4 class="sideNavSectionItemTitle"><v-icon size="18">mdi-check</v-icon> Tasks</h4>
                    </div>
                </div>
            </div>

            <!-- Manage -->
            <div class="sideNavSection">
                <h3 class="sideNavSectionTitle">Manage</h3>
                <div class="sideNavSectionContent">
                    <div class="sideNavSectionItem" @click="navigateToView('settings')">
                        <h4 class="sideNavSectionItemTitle"><v-icon size="18">mdi-cog</v-icon> Settings</h4>
                    </div>
                </div>
            </div>

            <!-- Team -->
            <div class="sideNavTeamSection">
                <div class="sideNavTeamSectionHeader">
                    <h3 class="sideNavTeamSectionTitle">Team</h3>
                    <button type="button" class="inviteTeamMemberButton">
                        <v-icon size="18">mdi-plus</v-icon>
                    </button>
                </div>
                <div class="sideNavTeamSearch">
                    <input type="text" placeholder="Search collaborators" />
                </div>
                <div class="sideNavTeamMembersList">
                    <div v-if="project.collaborators.length > 0">
                        <div v-for="collaborator in project.collaborators" :key="collaborator"
                            class="sideNavTeamMemberItem">
                            <div class="sideNavTeamMemberItemAvatar">{{ collaborator.avatar }}</div>
                            <div class="sideNavTeamMemberItemName">{{ collaborator.name }}</div>
                            <div class="sideNavTeamMemberItemRole">{{ collaborator.role }}</div>
                        </div>
                    </div>
                    <div v-else>
                        <div class="noTeamMembersContainer">
                            <p class="noTeamMembersText">No collaborators added yet</p>
                        </div>
                    </div>
                </div>

                <!-- Status -->
                <div class="sideNavStatusSection">
                    {{ status }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps({
    project: {
        type: Object,
        required: true
    }
})

const router = useRouter()
const route = useRoute()

const navigateToView = (viewName) => {
    router.push({ 
        path: `/projects/${props.project._id}`, 
        query: { view: viewName } 
    })
}

const status = computed(() => {
    return "Created " + formatDate(props.project.createdAt) + "\nLast Updated " + formatDate(props.project.updatedAt)
})

const formatDate = (date) => {
    // Return as MonthName, date, year
    return new Date(date).toLocaleDateString('en-ZA', { month: 'long', day: 'numeric', year: 'numeric' })
}

</script>

<style scoped>
.project-side-nav-container {
    padding: 0.25rem;
    background: var(--color-background);
}

.project-side-nav {
    width: 280px;
    max-width: 280px;
    min-height: 100vh;
    height: 100%;
    background: var(--glass-gradient-orange);
    border: 1px solid var(--glass-gradient-orange);
    border-radius: var(--border-radius);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 1.5rem;
    gap: 2rem;
    flex-shrink: 0;
    /* Hidden by default on mobile, shown via class or media query */
    display: none;
}

@media (min-width: 1024px) {
    .project-side-nav {
        display: flex;
    }
}

.project-side-nav--open {
    display: flex;
    position: fixed;
    top: 4rem;
    left: 0;
    bottom: 0;
    height: auto;
    min-height: calc(100vh - 4rem);
    z-index: 50;
    width: 100%;
    max-width: 320px;
    background: var(--color-background);
    border-right: 1px solid var(--color-border);
}

.sideNavBackToProjects {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: white;
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    font-weight: 500;
    transition: color 0.2s;
}

.sideNavBackToProjects:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--border-radius);
}

.sideNavBackToProjectsButton {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--color-text);
}

.sideNavBackToProjectsButton :deep(.v-icon) {
    color: inherit;
}

.sideNavBackToProjects:hover .sideNavBackToProjectsButton {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--border-radius);
}

.sideNavHeader {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-radius: var(--border-radius);
    padding: 1rem;
    background: rgba(237, 150, 62, 0.33);
    border: 1px solid rgba(237, 150, 62, 1);
}

.sideNavHeaderTitle {
    font-family: var(--font-sans);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
    line-height: 1.2;
}

.sideNavDescription {
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
}

.sideNavSection {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.sideNavSectionTitle {
    font-family: var(--font-sans);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    color: var(--color-text-tertiary);
    margin: 0;
}

.sideNavSectionContent {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.sideNavSectionItem {
    padding: 0.5rem 0.75rem;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background 0.2s;
    color: var(--color-text-secondary);
}

.sideNavSectionItem:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
}

.sideNavSectionItemTitle {
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    font-weight: 500;
    margin: 0;
}

.sideNavTeamSection {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.sideNavTeamSectionHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.sideNavTeamSectionTitle {
    font-family: var(--font-sans);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    color: var(--color-text-tertiary);
    margin: 0;
}

.inviteTeamMemberButton {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}

.inviteTeamMemberButton:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
}

.sideNavTeamSearch input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    color: var(--color-text);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    outline: none;
}

.sideNavTeamSearch input:focus {
    border-color: var(--color-text-secondary);
    background: rgba(255, 255, 255, 0.06);
}

.sideNavTeamMembersList {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.sideNavTeamMemberItem {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.sideNavTeamMemberItemAvatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--color-white-10);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    color: var(--color-text);
}

.sideNavTeamMemberItemName {
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    color: var(--color-text);
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sideNavTeamMemberItemRole {
    font-family: var(--font-sans);
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
}

.sideNavStatusSection {
    margin-top: auto;
    background: rgba(60, 60, 60, 0.5);
    border-radius: 28px;
    padding: 0.5rem 1rem;
    text-align: center;
    font-family: var(--font-sans);
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    white-space: pre-line;
    line-height: 1.5;
}

.noTeamMembersContainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.noTeamMembersText {
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    color: var(--color-text);
}

.noTeamMembersSubtext {
    font-family: var(--font-sans);
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}
</style>