<template>
  <AuthCard
    title="Create account"
    subtitle="Sign up with email or Google."
    footer-text="Already have an account?"
    footer-link-text="Sign in"
    footer-link-to="/login"
  >
    <RegisterForm
      :loading="loading"
      :loading-google="loadingGoogle"
      :error="error"
      @submit="handleRegister"
      @google="handleGoogleRegister"
    />
  </AuthCard>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerEmail, loginGoogle } from '@/services/auth'
import AuthCard from '@/components/auth/AuthCard.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'

const router = useRouter()

const loading = ref(false)
const loadingGoogle = ref(false)
const error = ref('')

async function handleRegister({ email, password }) {
  error.value = ''
  loading.value = true
  try {
    await registerEmail(email, password)
    await router.push('/')
  } catch (err) {
    error.value = err.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}

async function handleGoogleRegister() {
  error.value = ''
  loadingGoogle.value = true
  try {
    await loginGoogle()
    await router.push('/')
  } catch (err) {
    error.value = err.message || 'Registration failed'
  } finally {
    loadingGoogle.value = false
  }
}
</script>
