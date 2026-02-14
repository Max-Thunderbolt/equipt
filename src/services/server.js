// Backend API client. Authentication is handled by Firebase (email/password or Google)
// via src/services/auth.js — use loginEmail, registerEmail, loginGoogle, logout there.
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

class Server {
    constructor() {
        this.server = axiosInstance;
    }

    async getUsers() {
        const response = await this.server.get('/users');
        return response.data;
    }

    // Sync user profile to backend after Firebase signup (e.g. uid, email, displayName).
    async createUser(userData) {
        const response = await this.server.post('/users', { userData });
        return response.data;
    }
}

export default new Server();