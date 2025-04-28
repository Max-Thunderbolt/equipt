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
          invited_user_id,
          invited_by
        `)
        .eq('project_id', projectId)
        .eq('status', 'pending')
      
      if (fetchError) throw fetchError
      
      // If we have data, fetch the user details
      if (data && data.length > 0) {
        // Get unique user IDs (both invited users and inviters)
        const invitedUserIds = [...new Set(data.map(invite => invite.invited_user_id).filter(Boolean))];
        const inviterIds = [...new Set(data.map(invite => invite.invited_by).filter(Boolean))];
        
        // Fetch invited user details from profiles table
        const { data: invitedUserData, error: invitedUserError } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url, bio, created_at, updated_at')
          .in('id', invitedUserIds);
          
        if (invitedUserError) {
          console.error('Error fetching invited user details:', invitedUserError);
        }
        
        // Fetch inviter details from profiles table
        const { data: inviterData, error: inviterError } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url, bio, created_at, updated_at')
          .in('id', inviterIds);
          
        if (inviterError) {
          console.error('Error fetching inviter details:', inviterError);
        }
        
        // Create maps for user details
        const invitedUserMap = {};
        if (invitedUserData) {
          invitedUserData.forEach(user => {
            invitedUserMap[user.id] = user;
          });
        }
        
        const inviterMap = {};
        if (inviterData) {
          inviterData.forEach(user => {
            inviterMap[user.id] = user;
          });
        }
        
        // Attach user details to each invite
        data.forEach(invite => {
          if (invite.invited_user_id) {
            invite.invited_user = invitedUserMap[invite.invited_user_id] || null;
          }
          if (invite.invited_by) {
            invite.invited_by_user = inviterMap[invite.invited_by] || null;
          }
        });
      }
      
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
    console.log('fetchUserInvites: Starting fetch...');
  
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
  
      if (getUserError) {
        console.error('fetchUserInvites: Error getting user:', getUserError);
        throw getUserError;
      }
  
      if (!user) {
        console.log('fetchUserInvites: No authenticated user found.');
        invites.value = [];
        return;
      }
      console.log('fetchUserInvites: Fetching invites for user ID:', user.id);
  
      const { data, error: fetchError } = await supabase
        .from(TABLES.PROJECT_INVITES)
        .select(`
          *,
          project:project_id (
            id,
            name,
            description,
            owner_id
          )
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
  
      if (fetchError) {
        console.error('fetchUserInvites: Error fetching invite data:', fetchError);
        throw fetchError;
      }
  
      // If we have data, fetch the owner and inviter details
      if (data && data.length > 0) {
        // Get unique owner IDs and inviter IDs
        const ownerIds = [...new Set(data.map(invite => invite.project?.owner_id).filter(Boolean))];
        const inviterIds = [...new Set(data.map(invite => invite.invited_by).filter(Boolean))];
        
        // Fetch owner details from profiles table
        const { data: ownerData, error: ownerError } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url, bio, created_at, updated_at')
          .in('id', ownerIds);
          
        if (ownerError) {
          console.error('Error fetching owner details:', ownerError);
        }
        
        // Fetch inviter details from profiles table
        const { data: inviterData, error: inviterError } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url, bio, created_at, updated_at')
          .in('id', inviterIds);
          
        if (inviterError) {
          console.error('Error fetching inviter details:', inviterError);
        }
        
        // Create maps for owner and inviter details
        const ownerMap = {};
        if (ownerData) {
          ownerData.forEach(owner => {
            ownerMap[owner.id] = owner;
          });
        }
        
        const inviterMap = {};
        if (inviterData) {
          inviterData.forEach(inviter => {
            inviterMap[inviter.id] = inviter;
          });
        }
        
        // Attach owner and inviter details to each invite
        data.forEach(invite => {
          if (invite.project && invite.project.owner_id) {
            invite.project.owner = ownerMap[invite.project.owner_id] || null;
          }
          if (invite.invited_by) {
            invite.invited_by_user = inviterMap[invite.invited_by] || null;
          }
        });
      }
  
      console.log('fetchUserInvites: Raw data received:', data);
      invites.value = data || []
      console.log('fetchUserInvites: Invites state updated:', invites.value);
  
    } catch (err) {
      console.error('Error fetching user invites:', err)
      error.value = err.message || 'Failed to fetch invites';
    } finally {
      loading.value = false
      console.log('fetchUserInvites: Fetch finished.');
    }
  }

  // Create a new invite
  const createInvite = async (projectId, invitedUserId, role) => {
    loading.value = true
    error.value = null
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Check for existing pending invite
      const { data: existingInvites, error: checkError } = await supabase
        .from(TABLES.PROJECT_INVITES)
        .select('id, status')
        .eq('project_id', projectId)
        .eq('invited_user_id', invitedUserId)
        // Optionally, only prevent if invite is 'pending'
        // .eq('status', 'pending') 
      
      if (checkError) {
        console.error('Error checking for existing invites:', checkError)
        throw checkError // Rethrow the error to be caught below
      }

      if (existingInvites && existingInvites.length > 0) {
        // Check if any of the existing invites are pending
        const pendingInvite = existingInvites.find(invite => invite.status === 'pending');
        if (pendingInvite) {
          console.warn(`Pending invite already exists for user ${invitedUserId} in project ${projectId}`);
          throw new Error('An invitation for this user is already pending.')
        } 
        // You could add logic here to handle non-pending invites, e.g., re-inviting if declined
        // For now, we just prevent duplicates if *any* invite exists, 
        // but prioritizing the 'pending' check.
        if (!pendingInvite && existingInvites.length > 0) {
           console.warn(`Invite already exists (status not pending) for user ${invitedUserId} in project ${projectId}`);
           throw new Error('An invitation for this user already exists.')
        }
      }

      // No existing invite found, proceed with insertion
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
        .select('*, project:project_id (id, name)')
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
      
      // Create a notification for the project owner
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: invite.invited_by,
          type: 'invite_accepted',
          title: 'Invite Accepted',
          message: `Your invite to join ${invite.project.name} has been accepted`,
          data: {
            project_id: invite.project_id
          }
        })

      if (notificationError) console.error('Error creating notification:', notificationError)
      
      // Refresh invites
      await fetchUserInvites()
      
      return {
        success: true,
        projectId: invite.project_id
      }
    } catch (err) {
      console.error('Error accepting project invite:', err)
      error.value = err.message
      return {
        success: false,
        projectId: null
      }
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