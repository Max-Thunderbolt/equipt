import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  })
  throw new Error('Missing Supabase configuration')
}

console.log('Initializing Supabase client with:', {
  url: supabaseUrl,
  key: supabaseAnonKey.substring(0, 10) + '...'
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-v2'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Database schema types
export const TABLES = {
  PROFILES: 'profiles',
  PROJECTS: 'projects',
  PROJECT_FILES: 'project_files'
}

// Function to ensure the project-files storage bucket exists
export const ensureStorageBucket = async () => {
  try {
    // Check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return false
    }
    
    const projectFilesBucket = buckets.find(b => b.name === 'project-files')
    
    if (!projectFilesBucket) {
      console.log('Creating project-files bucket...')
      
      // Create the bucket
      const { data, error: createError } = await supabase.storage.createBucket('project-files', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['*/*']
      })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
        return false
      }
      
      console.log('Successfully created project-files bucket')
      return true
    }
    
    console.log('project-files bucket already exists')
    return true
  } catch (err) {
    console.error('Error ensuring storage bucket:', err)
    return false
  }
} 