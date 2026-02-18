<template>
  <div class="auth-form-wrapper">
    <v-btn variant="outlined" size="large" :loading="loadingGoogle" class="auth-google" @click="emit('google')">
      <v-icon start>mdi-google</v-icon>
      Continue with Google
    </v-btn>
    <v-divider class="auth-divider">or</v-divider>
    <form class="auth-form" @submit.prevent="handleSubmit">
      <v-text-field v-model="email" label="Email" type="email" variant="outlined" density="comfortable"
        class="auth-field" :error-messages="emailError" @blur="emailError = ''" />
      <v-text-field v-model="password" label="Password" type="password" variant="outlined" density="comfortable"
        class="auth-field" :error-messages="passwordError" @blur="passwordError = ''" />
      <v-alert v-if="error" type="error" density="compact" class="auth-alert">
        {{ error }}
      </v-alert>
      <v-btn type="submit" color="primary" size="large" :loading="loading" class="auth-submit">
        Register
      </v-btn>
    </form>
  </div>
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

watch(() => props.error, (v) => {
  if (!v) {
    emailError.value = ''
    passwordError.value = ''
  }
})

function validate() {
  let valid = true
  if (!email.value.trim()) {
    emailError.value = 'Email is required'
    valid = false
  }
  if (!password.value || password.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
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
.auth-form-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: var(--font-sans), sans-serif;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  -webkit-box-shadow: 0 0 0 30px transparent inset !important;
  box-shadow: 0 0 0 30px transparent inset !important;
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
}

.auth-divider {
  margin: 1rem 0;
}

.auth-google {
  margin-bottom: 0.5rem;
}
</style>
