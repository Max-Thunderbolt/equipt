import { ref, watch } from 'vue'

/**
 * Shared email/password form state and validation for login and register.
 *
 * @param {Object} options
 * @param {'login' | 'register'} options.mode - Validation mode: 'login' requires non-empty password; 'register' adds min 6 chars
 * @param {import('vue').Ref<string>} [options.error] - External error ref (e.g. from parent); when it becomes falsy, field errors are cleared
 * @param {(payload: { email: string, password: string }) => void} [options.onSubmit] - Called with trimmed email and password when form is valid and submitted
 */
export function useAuthForm({ mode, error, onSubmit }) {
  const email = ref('')
  const password = ref('')
  const emailError = ref('')
  const passwordError = ref('')

  if (error) {
    watch(error, (v) => {
      if (!v) {
        emailError.value = ''
        passwordError.value = ''
      }
    })
  }

  function validate() {
    let valid = true
    if (!email.value.trim()) {
      emailError.value = 'Email is required'
      valid = false
    }
    if (!password.value) {
      passwordError.value = 'Password is required'
      valid = false
    } else if (mode === 'register' && password.value.length < 6) {
      passwordError.value = 'Password must be at least 6 characters'
      valid = false
    }
    return valid
  }

  function handleSubmit() {
    if (!validate()) return
    onSubmit?.({ email: email.value.trim(), password: password.value })
  }

  function clearEmailError() {
    emailError.value = ''
  }

  function clearPasswordError() {
    passwordError.value = ''
  }

  return {
    email,
    password,
    emailError,
    passwordError,
    validate,
    handleSubmit,
    clearEmailError,
    clearPasswordError,
  }
}
