import { ref, watch, unref } from 'vue'
import Server from '@/services/server'

export function useProject(projectId) {
  const project = ref(null)
  const loading = ref(true)
  const error = ref('')

  async function fetchProject() {
    const id = unref(projectId)
    if (!id) {
      project.value = null
      loading.value = false
      error.value = ''
      return
    }
    loading.value = true
    error.value = ''
    try {
      project.value = await Server.getProject(id)
    } catch (err) {
      error.value = err?.response?.data?.error || err?.message || 'Failed to load project'
      project.value = null
    } finally {
      loading.value = false
    }
  }

  watch(
    () => unref(projectId),
    (id) => {
      fetchProject()
    },
    { immediate: true }
  )

  return {
    project,
    loading,
    error,
    fetchProject,
  }
}
