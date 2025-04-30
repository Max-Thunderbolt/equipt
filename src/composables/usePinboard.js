import { ref } from 'vue'
import { supabase } from '../supabase/config'

// Pin types
const PIN_TYPES = {
  NOTE: 'note',
  FILE: 'file',
  LINK: 'link'
}

// Database tables
const TABLES = {
  PINS: 'project_pins',
  PROFILES: 'profiles'
}

export function usePinboard(projectId) {
  // State
  const pins = ref([])
  const loading = ref(true)
  const error = ref(null)

  // Methods
  const fetchPins = async () => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from(TABLES.PINS)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      pins.value = data || []
    } catch (err) {
      console.error('Error fetching pins:', err)
      error.value = err.message || 'Failed to load pins'
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    pins,
    loading,
    error,

    // Constants
    PIN_TYPES,

    // Methods
    fetchPins
  }
} 