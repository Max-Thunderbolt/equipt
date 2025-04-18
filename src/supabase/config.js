import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Export supabase client as both default and named export
export { supabase }

// Function to ensure storage bucket exists
export async function ensureStorageBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      throw listError
    }
    
    // Check if project-files bucket exists
    const projectFilesBucket = buckets.find(bucket => bucket.name === 'project-files')
    
    if (!projectFilesBucket) {
      // Create bucket if it doesn't exist
      const { data, error: createError } = await supabase
        .storage
        .createBucket('project-files', {
          public: false,
          fileSizeLimit: 52428800 // 50MB
        })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
        throw createError
      }
      
      console.log('Created project-files bucket:', data)
    }
  } catch (error) {
    console.error('Error in ensureStorageBucket:', error)
    throw error
  }
}

// Database schema types
export const TABLES = {
  PROFILES: 'profiles',
  PROJECTS: 'projects',
  PROJECT_FILES: 'project_files'
}

export default supabase 