<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])

const { loginWithEmail, loginWithGoogle, registerUser, error, loading } = useAuth()

const isRegistering = ref(false)
const email = ref('')
const password = ref('')
const displayName = ref('')
const authError = ref('')

const handleSubmit = async () => {
  authError.value = ''
  
  try {
    if (isRegistering.value) {
      const response = await registerUser(email.value, password.value, displayName.value)
      if (response.message) {
        // Show success message and keep modal open
        authError.value = response.message
        return
      }
    } else {
      await loginWithEmail(email.value, password.value)
    }
    emit('close')
  } catch (err) {
    authError.value = err.message
  }
}

const handleGoogleLogin = async () => {
  authError.value = ''
  
  try {
    await loginWithGoogle()
    emit('close')
  } catch (err) {
    authError.value = err.message
  }
}

const toggleMode = () => {
  isRegistering.value = !isRegistering.value
  authError.value = ''
  email.value = ''
  password.value = ''
  displayName.value = ''
}

const closeModal = () => {
  email.value = ''
  password.value = ''
  displayName.value = ''
  authError.value = ''
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content card" @click.stop>
      <div class="modal-header">
        <h2>{{ isRegistering ? 'Create Account' : 'Sign In' }}</h2>
        <button class="close-button" @click="closeModal">×</button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="authError" class="error-message">
          {{ authError }}
        </div>

        <div v-if="isRegistering" class="form-group">
          <label for="display-name">Display Name</label>
          <input
            id="display-name"
            v-model="displayName"
            type="text"
            required
            placeholder="Enter your name"
          >
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="Enter your email"
          >
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Enter your password"
          >
        </div>

        <div class="form-actions">
          <button 
            type="submit" 
            class="btn btn-primary" 
            :disabled="loading"
          >
            {{ isRegistering ? 'Create Account' : 'Sign In' }}
          </button>
        </div>

        <div class="divider">
          <span>or</span>
        </div>

        <button 
          type="button" 
          class="btn btn-google" 
          @click="handleGoogleLogin"
          :disabled="loading"
        >
          Continue with Google
        </button>

        <p class="toggle-mode">
          {{ isRegistering ? 'Already have an account?' : "Don't have an account?" }}
          <button 
            type="button" 
            class="toggle-button" 
            @click="toggleMode"
          >
            {{ isRegistering ? 'Sign In' : 'Create one' }}
          </button>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-width: 400px;
  background: var(--secondary-dark);
  padding: 2rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.close-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
}

.close-button:hover {
  color: var(--text-primary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  color: var(--text-primary);
  font-weight: 500;
}

input {
  background: var(--primary-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  color: var(--text-primary);
  font-size: 1rem;
}

input:focus {
  border-color: var(--accent-blue);
  outline: none;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  justify-content: center;
}

.form-actions .btn {
  width: 100%;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.divider span {
  padding: 0 1rem;
}

.btn-google {
  width: 100%;
  background: #fff;
  color: #000;
}

.btn-google:hover {
  background: #f8f9fa;
}

.toggle-mode {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.toggle-button {
  background: none;
  border: none;
  color: var(--accent-blue);
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
}

.toggle-button:hover {
  text-decoration: underline;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style> 