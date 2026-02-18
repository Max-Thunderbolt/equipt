import { defineStore } from 'pinia'
import { authStateListener } from '@/services/auth'
import Server from '@/services/server'

function profileFromFirebaseUser(user) {
    return {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
    }
}

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
                if (user) {
                    this.ensureBackendProfile(user)
                }
            })
        },

        async ensureBackendProfile(firebaseUser) {
            const userData = profileFromFirebaseUser(firebaseUser)
            try {
                await Server.createUser(userData)
            } catch (err) {
                console.warn('Failed to sync profile to backend', err)
            }
        },

        // Call from app if you need to tear down (e.g. in tests)
        stopListening() {
            this._unsubscribe?.()
            this._unsubscribe = null
        },
    },
})