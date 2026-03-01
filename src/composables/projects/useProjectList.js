import { ref } from 'vue'
import Server from '@/services/server'

export function useProjectList() {
  const projects = ref([])
  const loading = ref(true)

  async function fetchProjects() {
    loading.value = true
    try {
      projects.value = (await Server.getProjects()) || []
    } catch (err) {
      console.error('Failed to load projects', err)
      projects.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    projects,
    loading,
    fetchProjects,
  }
}
