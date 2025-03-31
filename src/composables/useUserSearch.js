import { ref } from 'vue'
import { supabase } from '../supabase/config'
import { useAuth } from './useAuth'

export function useUserSearch() {
  const { user } = useAuth()
  const searchResults = ref([])
  const loading = ref(false)
  const error = ref(null)

  const searchUsers = async (query) => {
    if (!query || query.length < 2) {
      searchResults.value = []
      return
    }

    try {
      loading.value = true
      error.value = null

      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', user.value?.id) // Exclude current user
        .limit(5)

      if (err) throw err

      searchResults.value = data || []
    } catch (err) {
      console.error('Error searching users:', err)
      error.value = 'Failed to search users'
    } finally {
      loading.value = false
    }
  }

  return {
    searchResults,
    loading,
    error,
    searchUsers
  }
} 