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