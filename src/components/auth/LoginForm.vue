<template>
  <form class="auth-form" @submit.prevent="handleSubmit">
    <v-text-field v-model="email" label="Email" type="email" variant="outlined" density="comfortable" class="auth-field"
      :error-messages="emailError" @blur="emailError = ''" />
    <v-text-field v-model="password" label="Password" type="password" variant="outlined" density="comfortable"
      class="auth-field" :error-messages="passwordError" @blur="passwordError = ''" />
    <v-alert v-if="error" type="error" density="compact" class="auth-alert">
      {{ error }}
    </v-alert>
    <v-btn type="submit" color="primary" size="large" :loading="loading" class="auth-submit">
      Sign in with email
    </v-btn>
    <v-divider class="auth-divider">or</v-divider>
    <v-btn variant="outlined" size="large" :loading="loadingGoogle" class="auth-google" @click="emit('google')">
      <v-icon start>mdi-google</v-icon>
      Sign in with Google
    </v-btn>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  loadingGoogle: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'google'])

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')

watch(() => props.error, (v) => { if (!v) emailError.value = ''; passwordError.value = '' })

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

function handleSubmit() {
  if (!validate()) return
  emit('submit', { email: email.value.trim(), password: password.value })
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: var(--font-sans), sans-serif;
}

.auth-field {
  margin-bottom: 0.25rem;
}

.auth-field :deep(input),
.auth-field :deep(.v-field__input) {
  background: transparent !important;
  font-family: var(--font-sans), sans-serif;
}

.auth-field :deep(.v-field) {
  background: transparent !important;
  border-radius: 12px;
}

.auth-field :deep(.v-field__outline) {
  --v-border-opacity: 0.2;
  color: rgba(255, 255, 255, 0.4);
}

.auth-field :deep(.v-field--focused .v-field__outline),
.auth-field :deep(.v-field:hover .v-field__outline) {
  color: rgba(255, 255, 255, 0.5);
}

.auth-field :deep(.v-label) {
  color: rgba(255, 255, 255, 0.85);
}

.auth-field :deep(.v-field__input) {
  color: #fff;
}

.auth-field :deep(input:-webkit-autofill),
.auth-field :deep(input:-webkit-autofill:hover),
.auth-field :deep(input:-webkit-autofill:focus),
.auth-field :deep(input:-webkit-autofill:active) {
  -webkit-text-fill-color: #fff;
}

.auth-alert {
  margin-top: 0.5rem;
  font-family: var(--font-sans), sans-serif;
}

.auth-submit,
.auth-google {
  font-family: var(--font-sans), sans-serif;
  font-weight: 600;
  border-radius: 9999px;
  text-transform: none;
}

/* Primary button: match CTA pill (index glassmorphism) */
.auth-submit:deep(.v-btn) {
  color: #fff !important;
  background: linear-gradient(180deg,
      rgba(121, 121, 183, 0.35) 0%,
      rgba(242, 104, 55, 0.35) 100%) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  box-shadow: 0 4px 24px rgba(237, 150, 62, 0.35);
}

.auth-submit:deep(.v-btn:hover) {
  box-shadow: 0 4px 24px rgba(237, 150, 62, 0.35);
}

/* Outlined Google button: glass border */
.auth-google:deep(.v-btn) {
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(12px);
}

.auth-google:deep(.v-btn:hover) {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

.auth-divider {
  margin: 1rem 0;
}

.auth-google {
  margin-bottom: 0.5rem;
}
</style>
