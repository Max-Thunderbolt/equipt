import { ref, onMounted } from 'vue'
import { supabase } from '../supabase/config'
import { TABLES } from '../constants'

const user = ref(null)
const session = ref(null)
const loading = ref(false)
const error = ref(null)

// Initialize auth state
const initAuth = async () => {
  try {
    // Get initial session
    const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Error getting session:', sessionError)
      return
    }
    
    if (initialSession) {
      console.log('Initial session found:', {
        user: initialSession.user?.id,
        expires_at: initialSession.expires_at,
        access_token: initialSession.access_token ? 'present' : 'missing',
        refresh_token: initialSession.refresh_token ? 'present' : 'missing'
      })
      session.value = initialSession
      user.value = initialSession.user
      
      // Try to create/get profile immediately for initial session
      await ensureUserProfile(initialSession.user)
    } else {
      console.log('No initial session found')
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      console.log('Auth state changed:', event, {
        session: _session ? {
          user: _session.user?.id,
          expires_at: _session.expires_at,
          access_token: _session.access_token ? 'present' : 'missing',
          refresh_token: _session.refresh_token ? 'present' : 'missing'
        } : null
      })
      
      if (_session) {
        session.value = _session
        user.value = _session.user
        
        // Ensure profile exists on sign in
        if (event === 'SIGNED_IN') {
          await ensureUserProfile(_session.user)
        }
      } else {
        session.value = null
        user.value = null
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  } catch (err) {
    console.error('Error initializing auth:', err)
  }
}

// Helper function to ensure user profile exists
const ensureUserProfile = async (userData) => {
  if (!userData) {
    console.log('No user data provided to ensureUserProfile')
    return null
  }
  
  try {
    console.log('Checking for existing profile for user:', userData.id)
    const { data: profiles, error: profileCheckError } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userData.id)
    
    if (profileCheckError) {
      console.error('Error checking profile:', profileCheckError)
      if (profileCheckError.code === 'PGRST301') {
        console.error('This may be an RLS policy issue - please check your database policies')
      }
      return null
    }
    
    console.log('Profile check result:', profiles)
    
    // If no profile exists, create one
    if (!profiles || profiles.length === 0) {
      console.log('No existing profile found, creating new profile...')
      const profileData = {
        id: userData.id,
        display_name: userData.user_metadata?.full_name || userData.email?.split('@')[0],
        email: userData.email,
        avatar_url: userData.user_metadata?.avatar_url,
        bio: userData.user_metadata?.bio || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      console.log('Profile data to insert:', profileData)

      const { data: newProfile, error: insertError } = await supabase
        .from(TABLES.PROFILES)
        .insert([profileData])
        .select()
      
      if (insertError) {
        console.error('Error creating profile:', insertError)
        if (insertError.code === 'PGRST301') {
          console.error('This may be an RLS policy issue - please check your database policies')
        }
        return null
      }
      
      console.log('Profile created successfully:', newProfile)
      return newProfile[0]
    }
    
    console.log('Existing profile found:', profiles[0])
    return profiles[0]
  } catch (err) {
    console.error('Error ensuring user profile:', err)
    return null
  }
}

// Initialize auth on module load
initAuth()

export function useAuth() {
  const registerUser = async (email, password, displayName) => {
    loading.value = true
    error.value = null
    
    try {
      console.log('Starting user registration for:', email)
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signUpError) {
        console.error('Error during sign up:', signUpError)
        throw signUpError
      }

      if (!data.user) {
        console.error('No user data returned from sign up')
        throw new Error('Registration failed - no user data')
      }

      console.log('User registered successfully:', {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata,
        confirmation_sent_at: data.user.confirmation_sent_at
      })

      // Create profile record immediately after registration
      // Note: This profile will exist but won't be accessible until email verification
      console.log('Creating profile for new user:', data.user.id)
      const { error: profileError } = await supabase
        .from(TABLES.PROFILES)
        .insert([
          {
            id: data.user.id,
            display_name: displayName,
            email: email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Don't throw here - we want to show the verification message even if profile creation fails
        // The profile can be created later when they verify their email
      }

      // Check if email confirmation was sent
      if (data.user.confirmation_sent_at) {
        return {
          user: data.user,
          message: 'Please check your email for a verification link to complete your registration.'
        }
      }

      return {
        user: data.user,
        message: 'Registration successful! You can now sign in.'
      }
    } catch (err) {
      console.error('Registration process failed:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const loginWithEmail = async (email, password) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      return data.user
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const loginWithGoogle = async () => {
    loading.value = true
    error.value = null
    
    try {
      // Determine the redirect URL based on environment
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUrl = isLocalhost 
        ? window.location.origin 
        : 'https://equipt-d6408.firebaseapp.com';
      
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (signInError) throw signInError

      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    error.value = null
    
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      
      // Clear user and session
      user.value = null
      session.value = null

      // Clear any stored tokens
      localStorage.removeItem('provider_token')
      localStorage.removeItem('provider_refresh_token')

      // Reload the page to ensure clean state
      window.location.reload()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const resetPassword = async (email) => {
    loading.value = true
    error.value = null

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (resetError) throw resetError
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePassword = async (newPassword) => {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    session,
    error,
    loading,
    registerUser,
    loginWithEmail,
    loginWithGoogle,
    logout,
    resetPassword,
    updatePassword
  }
} 