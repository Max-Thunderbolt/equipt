import { ref } from 'vue'
import { supabase } from '../supabase/config'
import { TABLES } from '../constants'

export function useProjectInvites() {
  const invites = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Fetch invites for a project
  const fetchProjectInvites = async (projectId) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from(TABLES.PROJECT_INVITES)
        .select(`
          *,
          invited_user:invited_user_id (
            id,
            display_name,
            email,
            avatar_url
          ),
          invited_by_user:invited_by (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'pending')
      
      if (fetchError) throw fetchError
      
      invites.value = data || []
    } catch (err) {
      console.error('Error fetching project invites:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Fetch invites for the current user
const fetchUserInvites = async () => {
    loading.value = true
    error.value = null
    console.log('fetchUserInvites: Starting fetch...'); // <--- Add log
  
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser(); // <--- Capture potential getUserError
  
      if (getUserError) { // <--- Log and handle getUserError
        console.error('fetchUserInvites: Error getting user:', getUserError);
        throw getUserError;
      }
  
      if (!user) {
        console.log('fetchUserInvites: No authenticated user found.'); // <--- Existing log
        invites.value = []; // Ensure invites are cleared if no user
        return; // Exit early if no user
      }
      console.log('fetchUserInvites: Fetching invites for user ID:', user.id); // <--- Existing log
  
      const { data, error: fetchError } = await supabase
        .from(TABLES.PROJECT_INVITES)
        .select(`
          *,
          project:project_id (
            id,
            name,
            description,
            owner:owner_id (
              id,
              display_name,
              email,
              avatar_url
            )
          ),
          invited_by_user:invited_by (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
  
      if (fetchError) {
        console.error('fetchUserInvites: Error fetching invite data:', fetchError); // <--- Existing log
        throw fetchError;
      }
  
      console.log('fetchUserInvites: Raw data received:', data); // <--- Existing log
      invites.value = data || []
      console.log('fetchUserInvites: Invites state updated:', invites.value); // <--- Existing log
  
    } catch (err) {
      console.error('Error fetching user invites:', err) // <--- Existing log
      error.value = err.message || 'Failed to fetch invites'; // Provide default error message
    } finally {
      loading.value = false
      console.log('fetchUserInvites: Fetch finished.'); // <--- Add log
    }
  }

  // Create a new invite
  const createInvite = async (projectId, invitedUserId, role) => {
    loading.value = true
    error.value = null
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error: createError } = await supabase
        .from(TABLES.PROJECT_INVITES)
        .insert({
          project_id: projectId,
          invited_user_id: invitedUserId,
          invited_by: user.id,
          role,
          status: 'pending'
        })
        .select()
      
      if (createError) throw createError
      
      // Refresh invites
      await fetchProjectInvites(projectId)
      
      return data[0]
    } catch (err) {
      console.error('Error creating project invite:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Accept an invite
  const acceptInvite = async (inviteId) => {
    loading.value = true
    error.value = null
    
    try {
      // Start a transaction
      const { data: invite, error: fetchError } = await supabase
        .from(TABLES.PROJECT_INVITES)
        .select('*')
        .eq('id', inviteId)
        .single()
      
      if (fetchError) throw fetchError
      
      // Update invite status
      const { error: updateError } = await supabase
        .from(TABLES.PROJECT_INVITES)
        .update({ status: 'accepted' })
        .eq('id', inviteId)
      
      if (updateError) throw updateError
      
      // Add user as collaborator
      const { error: collabError } = await supabase
        .from(TABLES.PROJECT_COLLABORATORS)
        .insert({
          project_id: invite.project_id,
          user_id: invite.invited_user_id,
          role: invite.role
        })
      
      if (collabError) throw collabError
      
      // Refresh invites
      await fetchUserInvites()
      
      return true
    } catch (err) {
      console.error('Error accepting project invite:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Decline an invite
  const declineInvite = async (inviteId) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: updateError } = await supabase
        .from(TABLES.PROJECT_INVITES)
        .update({ status: 'declined' })
        .eq('id', inviteId)
      
      if (updateError) throw updateError
      
      // Refresh invites
      await fetchUserInvites()
      
      return true
    } catch (err) {
      console.error('Error declining project invite:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    invites,
    loading,
    error,
    fetchProjectInvites,
    fetchUserInvites,
    createInvite,
    acceptInvite,
    declineInvite
  }
} 