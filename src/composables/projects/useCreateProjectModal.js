import { ref, watch } from 'vue'
import Server from '@/services/server'
import { useUserStore } from '@/stores'

const defaultForm = () => ({
  name: '',
  description: '',
  isPublic: false,
})

export function useCreateProjectModal({ onClose, onCreated }) {
  const userStore = useUserStore()

  const form = ref(defaultForm())
  const searchQuery = ref('')
  const searchResults = ref([])
  const showSearchResults = ref(false)
  const selectedCollaborators = ref([])
  const saving = ref(false)
  const error = ref('')

  let searchTimeout = null

  function resetForm() {
    form.value = defaultForm()
    searchQuery.value = ''
    searchResults.value = []
    selectedCollaborators.value = []
    showSearchResults.value = false
    error.value = ''
  }

  watch(searchQuery, (q) => {
    clearTimeout(searchTimeout)
    if (!q || q.length < 2) {
      searchResults.value = []
      return
    }
    searchTimeout = setTimeout(async () => {
      try {
        const list = await Server.searchUsers(q)
        const ids = new Set(selectedCollaborators.value.map((u) => u._id))
        searchResults.value = (list || []).filter(
          (u) => !ids.has(u._id) && u._id !== userStore.uid
        )
      } catch (err) {
        searchResults.value = []
      }
    }, 300)
  })

  function addCollaborator(user) {
    if (selectedCollaborators.value.some((u) => u._id === user._id)) return
    selectedCollaborators.value = [...selectedCollaborators.value, user]
    searchQuery.value = ''
    searchResults.value = []
    showSearchResults.value = false
  }

  function removeCollaborator(user) {
    selectedCollaborators.value = selectedCollaborators.value.filter(
      (u) => u._id !== user._id
    )
  }

  function handleClose() {
    onClose?.()
  }

  async function onSubmit() {
    if (!form.value.name.trim()) return
    saving.value = true
    error.value = ''
    try {
      const project = await Server.createProject({
        name: form.value.name.trim(),
        description: (form.value.description || '').trim(),
        collaborators: selectedCollaborators.value.map((u) => u._id),
        isPublic: form.value.isPublic,
      })
      onCreated?.(project)
      handleClose()
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create project. Please try again.'
      error.value = message
      console.error('Create project failed', err)
    } finally {
      saving.value = false
    }
  }

  return {
    form,
    searchQuery,
    searchResults,
    showSearchResults,
    selectedCollaborators,
    saving,
    error,
    resetForm,
    addCollaborator,
    removeCollaborator,
    handleClose,
    onSubmit,
  }
}
