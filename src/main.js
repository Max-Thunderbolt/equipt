/**
 * main.js
 *
 * Bootstraps plugins and mounts the App. Firebase is initialized via @/config/firebase
 * (used by services/auth and stores/user).
 */

import { createApp } from 'vue'
import { registerPlugins } from '@/plugins'
import { useUserStore } from '@/stores'
import App from './App.vue'

import 'unfonts.css'
import '/src/styles/styles.css'

const app = createApp(App)
registerPlugins(app)

const userStore = useUserStore()
userStore.init()

app.mount('#app')
