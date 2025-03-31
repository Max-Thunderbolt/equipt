import { ref } from 'vue'
import { supabase } from '../supabase/config'
import { useAuth } from './useAuth'
import { TABLES } from '../constants'

export function useProfile() {
  const { user } = useAuth()
  const profile = ref(null)
  const projects = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchProfile = async (userId) => {
    if (!userId) {
      error.value = 'No user ID provided'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('id', userId)

      if (fetchError) {
        throw fetchError
      }

      return data[0]
    } catch (err) {
      console.error('Error fetching profile:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  const updateProfile = async (userId, updates) => {
    if (!userId) {
      error.value = 'No user ID provided'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from(TABLES.PROFILES)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      if (updateError) {
        throw updateError
      }

      return data[0]
    } catch (err) {
      console.error('Error updating profile:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchUserProjects = async () => {
    if (!user.value) return

    try {
      loading.value = true
      error.value = null
      console.log('Fetching projects for user:', user.value.id)

      // First, get projects where user is owner
      const { data: ownedProjects, error: ownedErr } = await supabase
        .from(TABLES.PROJECTS)
        .select(`
          *,
          ${TABLES.PROJECT_FILES} (
            id,
            name,
            file_type,
            size_bytes
          )
        `)
        .eq('owner_id', user.value.id)
        .order('created_at', { ascending: false })

      if (ownedErr) {
        console.error('Error fetching owned projects:', ownedErr)
        throw ownedErr
      }
      
      console.log('Owned projects:', ownedProjects)

      // Then, get projects where user is a collaborator
      const { data: collabProjects, error: collabErr } = await supabase
        .from(TABLES.PROJECT_COLLABORATORS)
        .select(`
          role,
          projects:project_id (
            *,
            ${TABLES.PROJECT_FILES} (
              id,
              name,
              file_type,
              size_bytes
            )
          )
        `)
        .eq('user_id', user.value.id)

      if (collabErr) {
        console.error('Error fetching collaborative projects:', collabErr)
        throw collabErr
      }
      
      console.log('Collaboration projects:', collabProjects)

      // Combine and format the results
      const collaboratedProjects = collabProjects
        ?.map(collab => {
          if (!collab.projects) return null
          return {
            ...collab.projects,
            role: collab.role
          }
        })
        .filter(Boolean) || []

      projects.value = [
        ...(ownedProjects || []).map(project => ({ ...project, role: 'owner' })),
        ...collaboratedProjects
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      console.log('Combined projects:', projects.value)

    } catch (err) {
      console.error('Error fetching user projects:', err)
      error.value = 'Failed to load projects'
    } finally {
      loading.value = false
    }
  }

  const uploadProjectFile = async (file, projectId) => {
    if (!user.value || !projectId) return null
    
    loading.value = true
    error.value = null
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user.value.id}/${projectId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Create file record in database
      const { error: fileRecordError } = await supabase
        .from('project_files')
        .insert([
          {
            project_id: projectId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.value.id
          }
        ])

      if (fileRecordError) throw fileRecordError

      return filePath
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteProjectFile = async (filePath) => {
    if (!user.value) return null
    
    loading.value = true
    error.value = null
    
    try {
      const { error: deleteError } = await supabase.storage
        .from('project-files')
        .remove([filePath])

      if (deleteError) throw deleteError

      // Delete file record from database
      const { error: recordDeleteError } = await supabase
        .from('project_files')
        .delete()
        .eq('file_path', filePath)

      if (recordDeleteError) throw recordDeleteError
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    profile,
    projects,
    loading,
    error,
    fetchProfile,
    updateProfile,
    fetchUserProjects,
    uploadProjectFile,
    deleteProjectFile
  }
} 