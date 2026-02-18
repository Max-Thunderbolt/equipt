<template>
  <AuthCard
    title="Sign in"
    subtitle="Sign in to your equipt. account"
    footer-text="Don't have an account?"
    footer-link-text="Register"
    footer-link-to="/register"
  >
    <LoginForm
      :loading="loading"
      :loading-google="loadingGoogle"
      :error="error"
      @submit="handleLogin"
      @google="handleGoogleLogin"
    />
  </AuthCard>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loginEmail, loginGoogle } from '@/services/auth'
import AuthCard from '@/components/auth/AuthCard.vue'
import LoginForm from '@/components/auth/LoginForm.vue'

definePage({
  meta: {
    guest: true,
  },
})

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const loadingGoogle = ref(false)
const error = ref('')

const redirectPath = computed(() => route.query.redirect || '/')

async function handleLogin({ email, password }) {
  error.value = ''
  loading.value = true
  try {
    await loginEmail(email, password)
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
