import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/',  // Use absolute paths for assets
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    strictPort: true, // Fail if port is already in use
  },
  // Ensure environment variables are properly handled
  define: {
    'process.env': {}
  }
})
