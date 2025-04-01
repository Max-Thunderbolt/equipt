import { ref, computed } from 'vue'
import { supabase } from '../supabase/config'

const TABLES = {
  PROJECTS: 'projects',
  PROFILES: 'profiles',
  PROJECT_COLLABORATORS: 'project_collaborators',
  PROJECT_FILES: 'project_files',
  PROJECT_UPDATES: 'project_updates'
}

// Create a reactive cache for projects
const projectCache = ref(new Map())
const currentProject = ref(null)
const loading = ref(false)
const error = ref(null)

export const useProjectStore = () => {
  const getProject = async (projectId) => {
    // Check cache first
    if (projectCache.value.has(projectId)) {
      currentProject.value = projectCache.value.get(projectId)
      return currentProject.value
    }

    loading.value = true
    error.value = null

    try {
      // Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .from(TABLES.PROJECTS)
        .select(`
          *,
          ${TABLES.PROJECT_FILES}(*)
        `)
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      // Get owner information
      const { data: ownerData } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('id', projectData.owner_id)
        .single()

      // Get collaborators
      const { data: collaborators } = await supabase
        .from(TABLES.PROJECT_COLLABORATORS)
        .select('role, user_id')
        .eq('project_id', projectId)

      // Get collaborator profiles
      let userProfiles = []
      if (collaborators?.length > 0) {
        const { data: profiles } = await supabase
          .from(TABLES.PROFILES)
          .select('*')
          .in('id', collaborators.map(c => c.user_id))
        
        userProfiles = profiles || []
      }

      // Get project updates
      const { data: updates } = await supabase
        .from(TABLES.PROJECT_UPDATES)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      // Get update user profiles
      if (updates?.length > 0) {
        const { data: updateUserProfiles } = await supabase
          .from(TABLES.PROFILES)
          .select('id, display_name, avatar_url')
          .in('id', [...new Set(updates.map(u => u.user_id))])

        updates.forEach(update => {
          update.user = updateUserProfiles?.find(profile => profile.id === update.user_id) || null
        })
      }

      // Combine all data
      const fullProjectData = {
        ...projectData,
        owner: ownerData || null,
        collaborators: (collaborators || []).map(collab => ({
          ...collab,
          user: userProfiles.find(p => p.id === collab.user_id) || null
        })),
        files: projectData.project_files || [],
        updates: updates || []
      }

      // Update cache and current project
      projectCache.value.set(projectId, fullProjectData)
      currentProject.value = fullProjectData

      return fullProjectData
    } catch (err) {
      console.error('Error fetching project:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  const updateProject = async (projectId, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from(TABLES.PROJECTS)
        .update(updates)
        .eq('id', projectId)
        .select()
        .single()

      if (updateError) throw updateError

      // Update cache with new data
      if (projectCache.value.has(projectId)) {
        const cached = projectCache.value.get(projectId)
        projectCache.value.set(projectId, { ...cached, ...data })
      }

      // Refresh the project data to ensure consistency
      await getProject(projectId)
      
      return data
    } catch (err) {
      console.error('Error updating project:', err)
      throw err
    }
  }

  const clearCache = (projectId) => {
    if (projectId) {
      projectCache.value.delete(projectId)
    } else {
      projectCache.value.clear()
    }
  }

  return {
    currentProject: computed(() => currentProject.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    getProject,
    updateProject,
    clearCache
  }
} 