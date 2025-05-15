import { ref } from 'vue'
import { supabase } from '../supabase/config'
import { useFileStorage } from './useFileStorage'

export function usePinManagement(projectId) {
  const pins = ref([])
  const loading = ref(true)
  const error = ref(null)
  const { uploadFile, downloadFile, deleteFile, getFileUrl } = useFileStorage()

  const fetchPins = async () => {
    try {
      loading.value = true
      error.value = null

      const { data: pinsData, error: pinsError } = await supabase
        .from('project_pins')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (pinsError) throw pinsError

      if (pinsData && pinsData.length > 0) {
        const userIds = [...new Set(pinsData.map(pin => pin.user_id))]
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds)

        if (profilesError) throw profilesError

        pins.value = pinsData.map(pin => ({
          ...pin,
          creator: profiles.find(profile => profile.id === pin.user_id) || null
        }))
      } else {
        pins.value = []
      }
    } catch (err) {
      console.error('Error fetching pins:', err)
      error.value = err.message || 'Failed to load pins'
    } finally {
      loading.value = false
    }
  }

  const addPin = async (pinData) => {
    try {
      let fileData = null
      if (pinData.type === 'file' && pinData.file) {
        try {
          fileData = await uploadFile(pinData.file, projectId)
          if (!fileData) throw new Error('Failed to upload file')
        } catch (uploadErr) {
          console.error('File upload error:', uploadErr)
          error.value = 'Failed to upload file. Please try again.'
          return
        }
      }

      const { error: pinError } = await supabase
        .from('project_pins')
        .insert({
          project_id: projectId,
          user_id: pinData.user_id,
          type: pinData.type,
          title: pinData.title.trim(),
          content: pinData.type === 'link' ? pinData.link.trim() : pinData.content.trim(),
          file_data: fileData,
          position_x: pinData.position?.x || 0,
          position_y: pinData.position?.y || 0
        })

      if (pinError) throw pinError

      await fetchPins()
      return true
    } catch (err) {
      console.error('Error adding pin:', err)
      error.value = err.message || 'Failed to add pin'
      return false
    }
  }

  const editPin = async (pinData) => {
    try {
      const { error: updateError } = await supabase
        .from('project_pins')
        .update({
          title: pinData.title.trim(),
          content: pinData.content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', pinData.id)
        .eq('user_id', pinData.user_id)

      if (updateError) throw updateError

      await fetchPins()
      return true
    } catch (err) {
      console.error('Error updating pin:', err)
      error.value = err.message || 'Failed to update pin'
      return false
    }
  }

  const deletePin = async (pin) => {
    try {
      if (pin.type === 'file' && pin.file_data) {
        try {
          await deleteFile(pin.file_data.file_path, pin.file_data.id)
        } catch (fileErr) {
          console.error('Error deleting file:', fileErr)
        }
      }

      const { error: deleteError } = await supabase
        .from('project_pins')
        .delete()
        .eq('id', pin.id)
        .eq('user_id', pin.user_id)

      if (deleteError) throw deleteError

      pins.value = pins.value.filter(p => p.id !== pin.id)
      return true
    } catch (err) {
      console.error('Error deleting pin:', err)
      error.value = err.message || 'Failed to delete pin'
      return false
    }
  }

  const updatePinPosition = async (pin, x, y) => {
    try {
      const { error: updateError } = await supabase
        .from('project_pins')
        .update({
          position_x: x,
          position_y: y,
          updated_at: new Date().toISOString()
        })
        .eq('id', pin.id)

      if (updateError) throw updateError
      
      const pinIndex = pins.value.findIndex(p => p.id === pin.id)
      if (pinIndex !== -1) {
        pins.value[pinIndex].position_x = x
        pins.value[pinIndex].position_y = y
      }
      return true
    } catch (err) {
      console.error('Error updating pin position:', err)
      error.value = err.message || 'Failed to update pin position'
      return false
    }
  }

  return {
    pins,
    loading,
    error,
    fetchPins,
    addPin,
    editPin,
    deletePin,
    updatePinPosition
  }
} 