<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">{{ title }}</h1>
      <p class="auth-subtitle">{{ subtitle }}</p>
      <slot />
      <p class="auth-footer">
        {{ footerText }}
        <router-link :to="footerLinkTo" class="auth-link">{{ footerLinkText }}</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  footerText: { type: String, required: true },
  footerLinkText: { type: String, required: true },
  footerLinkTo: { type: String, required: true },
})
</script>

<style scoped>
.auth-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 2rem;
  background: var(--color-white-10);
  border-radius: var(--border-radius-large);
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--equipt-orange);
  font-family: var(--font-mono), monospace;
  margin-bottom: 0.25rem;
}

.auth-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.auth-footer {
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.auth-link {
  color: var(--equipt-orange);
  text-decoration: none;
}

.auth-link:hover {
  text-decoration: underline;
}
</style>
