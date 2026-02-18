import { defineStore } from 'pinia'
import { authStateListener } from '@/services/auth'

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null,
        authReady: false,
    }),

    getters: {
        isLoggedIn: (state) => !!state.user,
        uid: (state) => state.user?.uid ?? null,
        email: (state) => state.user?.email ?? null,
        photoURL: (state) => state.user?.photoURL ?? null,
    },

    actions: {
        init() {
            if (this._unsubscribe) return
            this._unsubscribe = authStateListener((user) => {
                this.user = user
                this.authReady = true
            })
        },

        // Call from app if you need to tear down (e.g. in tests)
        stopListening() {
            this._unsubscribe?.()
            this._unsubscribe = null
        },
    },
})