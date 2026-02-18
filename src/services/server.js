// Backend API client. Sends Firebase ID token in Authorization header for backend verification.
// Auth actions: use loginEmail, registerEmail, loginGoogle, logout from @/services/auth.
import axios from 'axios'
import { auth } from '@/config/firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Firebase ID token to requests when user is signed in
axiosInstance.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser
    if (user) {
      try {
        const token = await user.getIdToken()
        config.headers.Authorization = `Bearer ${token}`
      } catch (err) {
        console.warn('Failed to get auth token', err)
      }
    }
    return config
  },
  (err) => Promise.reject(err)
)

class Server {
    constructor() {
        this.server = axiosInstance;
    }

  async getUsers() {
    const response = await this.server.get('/users')
    return response.data
  }

  async createUser(userData) {
    const response = await this.server.post('/users', { userData })
    return response.data
  }
}

export default new Server()