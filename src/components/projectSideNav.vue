<template>
    <div class="project-side-nav">

        <!-- Back to projects -->
        <router-link to="/projects" class="sideNavBackToProjects">
            <button type="button" class="sideNavBackToProjectsButton"><i class="fa-solid fa-arrow-left"></i></button>
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
                <div class="sideNavSectionItem">
                    <h4 class="sideNavSectionItemTitle">Dashboard</h4>
                </div>
                <div class="sideNavSectionItem">
                    <h4 class="sideNavSectionItemTitle">Files</h4>
                </div>
                <div class="sideNavSectionItem">
                    <h4 class="sideNavSectionItemTitle">Assets</h4>
                </div>
            </div>
        </div>

        <!-- Collaborate -->
        <div class="sideNavSection">
            <h3 class="sideNavSectionTitle">Collaborate</h3>
            <div class="sideNavSectionContent">
                <div class="sideNavSectionItem">
                    <h4 class="sideNavSectionItemTitle">Discussions</h4>
                </div>
                <div class="sideNavSectionItem">
                    <h4 class="sideNavSectionItemTitle">Tasks</h4>
                </div>
            </div>
        </div>

        <!-- Manage -->
        <div class="sideNavSection">
            <h3 class="sideNavSectionTitle">Manage</h3>
            <div class="sideNavSectionContent">
                <div class="sideNavSectionItem">
                    <h4 class="sideNavSectionItemTitle">Settings</h4>
                </div>
            </div>
        </div>

        <!-- Team -->
        <div class="sideNavTeamSection">
            <div class="sideNavTeamSectionHeader">
                <h3 class="sideNavTeamSectionTitle">Team</h3>
                <button class="inviteTeamMemberButton"><i class="fa-solid fa-plus"></i></button>
            </div>
            <div class="sideNavTeamSearch">
                <input type="text" placeholder="Search team members" />
            </div>
            <div class="sideNavTeamMembersList">

                <div v-for="member in project.teamMembers" :key="member.id" class="sideNavTeamMemberItem">
                    <div class="sideNavTeamMemberItemAvatar">{{ member.avatar }}</div>
                    <div class="sideNavTeamMemberItemName">{{ member.name }}</div>
                    <div class="sideNavTeamMemberItemRole">{{ member.role }}</div>
                </div>
            </div>
        </div>

        <!-- Status -->
        <div class="sideNavStatusSection">
            {{ status }}
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    project: {
        type: Object,
        required: true
    }
})

const status = computed(() => {
    return "Created " + new Date(props.project.createdAt).toLocaleDateString() + "\nLast Updated " + new Date(props.project.updatedAt).toLocaleDateString()
})

</script>