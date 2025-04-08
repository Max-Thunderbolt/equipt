import { ref } from 'vue'
import { supabase } from '../supabase/config'
import { useAuth } from './useAuth'

const TABLES = {
  PROJECTS: 'projects',
  PROJECT_COLLABORATORS: 'project_collaborators',
  PROJECT_FILES: 'project_files',
  PROJECT_UPDATES: 'project_updates'
}

export function useProjects() {
  const { user } = useAuth()
  const loading = ref(false)
  const error = ref(null)

  // Check if user has access to project
  const hasProjectAccess = async (projectId, userId) => {
    if (!projectId || !userId) return false

    try {
      // Check if user is owner
      const { data: project } = await supabase
        .from(TABLES.PROJECTS)
        .select('owner_id')
        .eq('id', projectId)
        .single()

      if (project?.owner_id === userId) return true

      // Check if user is collaborator
      const { data: collaboration } = await supabase
        .from(TABLES.PROJECT_COLLABORATORS)
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single()

      return !!collaboration
    } catch (err) {
      console.error('Error checking project access:', err)
      return false
    }
  }

  // Fetch projects for a user
  const fetchUserProjects = async (userId) => {
    if (!userId) {
      error.value = 'No user ID provided'
      return null
    }

    loading.value = true
    error.value = null

    try {
      // 1. First get all owned projects
      const { data: ownedProjects, error: ownedError } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .eq('owner_id', userId)

      if (ownedError) throw ownedError

      // 2. Get all collaborations for this user
      const { data: collaborations, error: collabError } = await supabase
        .from(TABLES.PROJECT_COLLABORATORS)
        .select('project_id, role')
        .eq('user_id', userId)

      if (collabError) throw collabError

      // 3. Get all collaborated projects in a separate query
      const collaboratedProjectIds = (collaborations || []).map(c => c.project_id)
      let collaboratedProjects = []
      
      if (collaboratedProjectIds.length > 0) {
        const { data: projects, error: projectsError } = await supabase
          .from(TABLES.PROJECTS)
          .select('*')
          .in('id', collaboratedProjectIds)

        if (projectsError) throw projectsError
        collaboratedProjects = projects || []
      }

      // 4. Get all project files in a separate query
      const allProjectIds = [
        ...(ownedProjects || []).map(p => p.id),
        ...collaboratedProjects.map(p => p.id)
      ]

      let projectFiles = []
      if (allProjectIds.length > 0) {
        const { data: files, error: filesError } = await supabase
          .from(TABLES.PROJECT_FILES)
          .select('*')
          .in('project_id', allProjectIds)

        if (filesError) throw filesError
        projectFiles = files || []
      }

      // 5. Combine all the data
      const allProjects = [
        ...(ownedProjects || []).map(p => ({
          ...p,
          role: 'owner',
          files: projectFiles.filter(f => f.project_id === p.id)
        })),
        ...collaboratedProjects.map(p => ({
          ...p,
          role: collaborations.find(c => c.project_id === p.id)?.role || 'viewer',
          files: projectFiles.filter(f => f.project_id === p.id)
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      return allProjects
    } catch (err) {
      console.error('Error fetching user projects:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Create a new project
  const createProject = async (projectData) => {
    if (!user.value) {
      error.value = 'You must be logged in to create a project'
      return null
    }

    loading.value = true
    error.value = null

    try {
      // Insert project with explicit field values
      const { data: project, error: projectError } = await supabase
        .from(TABLES.PROJECTS)
        .insert({
          name: projectData.name || 'Untitled Project',
          description: projectData.description || '',
          owner_id: user.value.id,
          is_public: projectData.is_public || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (projectError) {
        console.error('Project creation error:', projectError)
        throw projectError
      }

      console.log('Project created successfully:', project)

      // Add collaborators if any
      if (projectData.collaborators?.length > 0) {
        const collaborators = projectData.collaborators.map(c => ({
          project_id: project.id,
          user_id: c.id,
          role: c.role || 'viewer',
          created_at: new Date().toISOString()
        }))

        const { error: collabError } = await supabase
          .from(TABLES.PROJECT_COLLABORATORS)
          .insert(collaborators)

        if (collabError) {
          console.error('Collaborator addition error:', collabError)
          // Don't throw here, just log the error
          error.value = 'Project created but failed to add collaborators'
        }
      }

      return project
    } catch (err) {
      console.error('Error creating project:', err)
      error.value = err.message || 'Failed to create project'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchUserProjects,
    createProject,
    hasProjectAccess
  }
} 