import { supabase } from '../supabase/config'

const TABLES = {
  PROJECT_COLLABORATORS: 'project_collaborators'
}

export const collaboratorService = {
  // Update a collaborator's role
  async updateRole(projectId, userId, newRole) {
    if (!projectId || !userId || !newRole) {
      console.error('Missing parameters:', { projectId, userId, newRole })
      throw new Error('Missing required parameters for role update')
    }

    console.log('Starting role update in service:', { projectId, userId, newRole })

    try {
      // First verify the collaborator exists
      const { data: existingCollab, error: checkError } = await supabase
        .from(TABLES.PROJECT_COLLABORATORS)
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single()

      if (checkError) {
        console.error('Error checking collaborator:', checkError)
        throw new Error(`Failed to verify collaborator: ${checkError.message}`)
      }

      if (!existingCollab) {
        console.error('Collaborator not found:', { projectId, userId })
        throw new Error('Collaborator not found')
      }

      console.log('Found existing collaborator:', existingCollab)

      // Update the role using upsert
      const { data: updatedData, error: updateError } = await supabase
        .from(TABLES.PROJECT_COLLABORATORS)
        .upsert({
          project_id: projectId,
          user_id: userId,
          role: newRole,
          updated_at: new Date().toISOString(),
          created_at: existingCollab.created_at // Preserve the original created_at
        })
        .select()

      if (updateError) {
        console.error('Error updating role:', updateError)
        throw updateError
      }

      if (!updatedData || updatedData.length === 0) {
        console.error('No data returned from update')
        throw new Error('No data returned from update')
      }

      console.log('Role update successful:', updatedData[0])
      return updatedData[0]
    } catch (error) {
      console.error('Error in updateRole:', error)
      throw error
    }
  },

  // Remove a collaborator
  async removeCollaborator(projectId, userId) {
    if (!projectId || !userId) {
      throw new Error('Missing required parameters for collaborator removal')
    }

    console.log('Starting collaborator removal:', { projectId, userId })

    try {
      // First verify the collaborator exists
      const { data: existingCollab, error: checkError } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single()

      if (checkError) {
        console.error('Error checking collaborator:', checkError)
        throw new Error(`Failed to verify collaborator: ${checkError.message}`)
      }

      if (!existingCollab) {
        throw new Error('Collaborator not found')
      }

      console.log('Found collaborator to remove:', existingCollab)

      // Remove the collaborator
      const { error: deleteError } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Error removing collaborator:', deleteError)
        throw new Error(`Failed to remove collaborator: ${deleteError.message}`)
      }

      console.log('Collaborator removed successfully')
      return true
    } catch (error) {
      console.error('Error in removeCollaborator:', error)
      throw error
    }
  },

  // Add new collaborators
  async addCollaborators(projectId, collaborators) {
    if (!projectId || !collaborators?.length) {
      throw new Error('Missing required parameters for adding collaborators')
    }

    console.log('Starting collaborator addition:', { projectId, collaboratorCount: collaborators.length })

    try {
      const collaboratorData = collaborators.map(collab => ({
        project_id: projectId,
        user_id: collab.id,
        role: collab.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('project_collaborators')
        .insert(collaboratorData)
        .select()

      if (error) {
        console.error('Error adding collaborators:', error)
        throw new Error(`Failed to add collaborators: ${error.message}`)
      }

      console.log('Collaborators added successfully:', data)
      return data
    } catch (error) {
      console.error('Error in addCollaborators:', error)
      throw error
    }
  },

  // Get project collaborators
  async getProjectCollaborators(projectId) {
    if (!projectId) {
      throw new Error('Missing project ID')
    }

    console.log('Fetching collaborators for project:', projectId)

    try {
      const { data, error } = await supabase
        .from('project_collaborators')
        .select(`
          *,
          user:users (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('project_id', projectId)

      if (error) {
        console.error('Error fetching collaborators:', error)
        throw new Error(`Failed to fetch collaborators: ${error.message}`)
      }

      console.log('Fetched collaborators:', data)
      return data
    } catch (error) {
      console.error('Error in getProjectCollaborators:', error)
      throw error
    }
  }
} 