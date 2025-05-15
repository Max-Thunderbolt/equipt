import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { supabase } from '../supabase/config'

export const usePinboardStore = defineStore('pinboard', () => {
  // State
  const pins = ref([])
  const pinLinks = ref([])
  const selectedPinIds = ref(new Set())
  const viewport = reactive({ x: 0, y: 0, scale: 1 })
  const loading = ref(false)
  const error = ref(null)

  // Real-time sync
  let pinsChannel = null
  let pinLinksChannel = null

  // Fetch pins for a project
  async function fetchPins(projectId) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('project_pins')
        .select('*')
        .eq('project_id', projectId)
      if (fetchError) throw fetchError
      pins.value = data || []
    } catch (err) {
      error.value = err.message || 'Failed to load pins'
    } finally {
      loading.value = false
    }
  }

  // Fetch pin links for a project
  async function fetchPinLinks(projectId) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('project_pin_links')
        .select('*')
        .eq('project_id', projectId)
      if (fetchError) throw fetchError
      pinLinks.value = data || []
    } catch (err) {
      error.value = err.message || 'Failed to load pin links'
    } finally {
      loading.value = false
    }
  }

  // Selection helpers
  function selectPin(pinId) {
    selectedPinIds.value.add(pinId)
  }
  function deselectPin(pinId) {
    selectedPinIds.value.delete(pinId)
  }
  function clearSelection() {
    selectedPinIds.value.clear()
  }

  // Viewport helpers
  function setViewport(newViewport) {
    viewport.x = newViewport.x
    viewport.y = newViewport.y
    viewport.scale = newViewport.scale
  }

  // CRUD actions for pins
  async function createPin(pin) {
    loading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('project_pins')
        .insert([pin])
        .select()
        .single()
      if (insertError) throw insertError
      pins.value.push(data)
      return data
    } catch (err) {
      error.value = err.message || 'Failed to create pin'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updatePin(pinId, updates) {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('project_pins')
        .update(updates)
        .eq('id', pinId)
        .select()
        .single()
      if (updateError) throw updateError
      const idx = pins.value.findIndex(p => p.id === pinId)
      if (idx !== -1) pins.value[idx] = data
      return data
    } catch (err) {
      error.value = err.message || 'Failed to update pin'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deletePin(pinId) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('project_pins')
        .delete()
        .eq('id', pinId)
      if (deleteError) throw deleteError
      pins.value = pins.value.filter(p => p.id !== pinId)
      // Also remove any links associated with this pin
      pinLinks.value = pinLinks.value.filter(l => l.source_pin_id !== pinId && l.target_pin_id !== pinId)
      return true
    } catch (err) {
      error.value = err.message || 'Failed to delete pin'
      return false
    } finally {
      loading.value = false
    }
  }

  // CRUD actions for pin links
  async function createPinLink(link) {
    loading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('project_pin_links')
        .insert([link])
        .select()
        .single()
      if (insertError) throw insertError
      pinLinks.value.push(data)
      return data
    } catch (err) {
      error.value = err.message || 'Failed to create pin link'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deletePinLink(linkId) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('project_pin_links')
        .delete()
        .eq('id', linkId)
      if (deleteError) throw deleteError
      pinLinks.value = pinLinks.value.filter(l => l.id !== linkId)
      return true
    } catch (err) {
      error.value = err.message || 'Failed to delete pin link'
      return false
    } finally {
      loading.value = false
    }
  }

  function handlePinEvent(payload) {
    const { eventType, new: newPin, old: oldPin } = payload
    if (eventType === 'INSERT') {
      if (!pins.value.find(p => p.id === newPin.id)) pins.value.push(newPin)
    } else if (eventType === 'UPDATE') {
      const idx = pins.value.findIndex(p => p.id === newPin.id)
      if (idx !== -1) pins.value[idx] = newPin
    } else if (eventType === 'DELETE') {
      pins.value = pins.value.filter(p => p.id !== oldPin.id)
      pinLinks.value = pinLinks.value.filter(l => l.source_pin_id !== oldPin.id && l.target_pin_id !== oldPin.id)
    }
  }

  function handlePinLinkEvent(payload) {
    const { eventType, new: newLink, old: oldLink } = payload
    if (eventType === 'INSERT') {
      if (!pinLinks.value.find(l => l.id === newLink.id)) pinLinks.value.push(newLink)
    } else if (eventType === 'UPDATE') {
      const idx = pinLinks.value.findIndex(l => l.id === newLink.id)
      if (idx !== -1) pinLinks.value[idx] = newLink
    } else if (eventType === 'DELETE') {
      pinLinks.value = pinLinks.value.filter(l => l.id !== oldLink.id)
    }
  }

  async function subscribeToRealtime(projectId) {
    // Unsubscribe first if already subscribed
    await unsubscribeFromRealtime()
    // Pins
    pinsChannel = supabase.channel('realtime-pins-' + projectId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_pins',
        filter: `project_id=eq.${projectId}`
      }, handlePinEvent)
      .subscribe()
    // Pin Links
    pinLinksChannel = supabase.channel('realtime-pinlinks-' + projectId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_pin_links',
        filter: `project_id=eq.${projectId}`
      }, handlePinLinkEvent)
      .subscribe()
  }

  async function unsubscribeFromRealtime() {
    if (pinsChannel) {
      await supabase.removeChannel(pinsChannel)
      pinsChannel = null
    }
    if (pinLinksChannel) {
      await supabase.removeChannel(pinLinksChannel)
      pinLinksChannel = null
    }
  }

  return {
    pins,
    pinLinks,
    selectedPinIds,
    viewport,
    loading,
    error,
    fetchPins,
    fetchPinLinks,
    selectPin,
    deselectPin,
    clearSelection,
    setViewport,
    createPin,
    updatePin,
    deletePin,
    createPinLink,
    deletePinLink,
    subscribeToRealtime,
    unsubscribeFromRealtime
  }
}) 