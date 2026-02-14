<template>
    <div class="register-page">
        <div class="register-card">
            <h1 class="register-title">Create account</h1>
            <p class="register-subtitle">Sign up with email or Google.</p>

            <div class="register-form">
                <v-btn variant="outlined" size="large" :loading="loadingGoogle" class="register-google"
                    @click="handleGoogleRegister">
                    <v-icon start>mdi-google</v-icon>
                    Continue with Google
                </v-btn>

                <v-divider class="register-divider">or</v-divider>
            </div>

            <form @submit.prevent="handleRegister" class="register-form">
                <v-text-field v-model="email" label="Email" type="email" variant="outlined" density="comfortable"
                    :error-messages="emailError" @blur="emailError = ''" />
                <v-text-field v-model="password" label="Password" type="password" variant="outlined"
                    density="comfortable" :error-messages="passwordError" @blur="passwordError = ''" />

                <v-alert v-if="error" type="error" density="compact" class="register-alert">
                    {{ error }}
                </v-alert>

                <v-btn type="submit" color="primary" size="large" :loading="loading" class="register-submit">
                    Register
                </v-btn>
            </form>

            <p class="register-footer">
                Already have an account?
                <router-link to="/login" class="register-link">Sign in</router-link>
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerEmail } from '@/services/auth'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const emailError = ref('')
const passwordError = ref('')

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

async function handleRegister() {
    error.value = ''
    emailError.value = ''
    passwordError.value = ''

    if (!validate()) return

    loading.value = true
    try {
        await registerEmail(email.value.trim(), password.value)
        await router.push('/')
    } catch (err) {
        error.value = err.message || 'Registration failed'
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.register-page {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
}

.register-card {
    width: 100%;
    max-width: 420px;
    padding: 2rem;
    background: var(--color-white-10, rgba(255, 255, 255, 0.1));
    border-radius: var(--border-radius-large, 12px);
}

.register-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--equipt-orange);
    font-family: var(--font-mono), monospace;
    margin-bottom: 0.25rem;
}

.register-subtitle {
    font-size: 0.95rem;
    color: var(--color-text-secondary, rgba(255, 255, 255, 0.7));
    margin-bottom: 1.5rem;
}

.register-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.register-field {}

.register-alert {
    margin-top: 0.5rem;
}

.register-submit {
    margin-top: 1rem;
}

.register-footer {
    margin-top: 1.5rem;
    font-size: 0.9rem;
    color: var(--color-text-secondary, rgba(255, 255, 255, 0.7));
}

.register-link {
    color: var(--equipt-orange);
    text-decoration: none;
}

.register-link:hover {
    text-decoration: underline;
}
</style>