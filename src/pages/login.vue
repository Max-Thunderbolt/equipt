<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">Sign in</h1>
      <p class="login-subtitle">Sign in to your equipt. account</p>

      <form @submit.prevent="handleLogin" class="login-form">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          variant="outlined"
          density="comfortable"
          class="login-field"
          :error-messages="emailError"
          @blur="emailError = ''"
        />
        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          variant="outlined"
          density="comfortable"
          class="login-field"
          :error-messages="passwordError"
          @blur="passwordError = ''"
        />

        <v-alert v-if="error" type="error" density="compact" class="login-alert">
          {{ error }}
        </v-alert>

        <v-btn
          type="submit"
          color="primary"
          size="large"
          :loading="loading"
          class="login-submit"
        >
          Sign in with email
        </v-btn>

        <v-divider class="login-divider">or</v-divider>

        <v-btn
          variant="outlined"
          size="large"
          :loading="loadingGoogle"
          class="login-google"
          @click="handleGoogleLogin"
        >
          <v-icon start>mdi-google</v-icon>
          Sign in with Google
        </v-btn>
      </form>

      <p class="login-footer">
        Don't have an account?
        <router-link to="/register" class="login-link">Register</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loginEmail, loginGoogle } from '@/services/auth'

definePage({
  meta: {
    guest: true,
  },
})

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const loadingGoogle = ref(false)
const error = ref('')
const emailError = ref('')
const passwordError = ref('')

const redirectPath = computed(() => route.query.redirect || '/')

function validate() {
  let valid = true
  if (!email.value.trim()) {
    emailError.value = 'Email is required'
    valid = false
  }
  if (!password.value) {
    passwordError.value = 'Password is required'
    valid = false
  }
  return valid
}

async function handleLogin() {
  error.value = ''
  emailError.value = ''
  passwordError.value = ''

  if (!validate()) return

  loading.value = true
  try {
    await loginEmail(email.value.trim(), password.value)
    await router.push(redirectPath.value)
  } catch (err) {
    error.value = err.message || 'Sign in failed'
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin() {
  error.value = ''
  loadingGoogle.value = true
  try {
    await loginGoogle()
    await router.push(redirectPath.value)
  } catch (err) {
    error.value = err.message || 'Google sign in failed'
  } finally {
    loadingGoogle.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 2rem;
  background: var(--color-white-10, rgba(255, 255, 255, 0.1));
  border-radius: var(--border-radius-large, 12px);
}

.login-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--equipt-orange);
  font-family: var(--font-mono), monospace;
  margin-bottom: 0.25rem;
}

.login-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary, rgba(255, 255, 255, 0.7));
  margin-bottom: 1.5rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-field {
  margin-bottom: 0.25rem;
}

/* Remove yellow autofill background from email/password inputs */
.login-field :deep(input),
.login-field :deep(.v-field__input) {
  background: transparent;
}

.login-field :deep(input:-webkit-autofill),
.login-field :deep(input:-webkit-autofill:hover),
.login-field :deep(input:-webkit-autofill:focus),
.login-field :deep(input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.05) inset !important;
  box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.05) inset !important;
}

.login-alert {
  margin-top: 0.5rem;
}

.login-submit {
  margin-top: 1rem;
}

.login-divider {
  margin: 1rem 0;
}

.login-google {
  margin-bottom: 0.5rem;
}

.login-footer {
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary, rgba(255, 255, 255, 0.7));
}

.login-link {
  color: var(--equipt-orange);
  text-decoration: none;
}

.login-link:hover {
  text-decoration: underline;
}
</style>
