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
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--color-background);
  box-sizing: border-box;
}

/* Glassmorphism: match index create-card */
.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 2rem 2.5rem;
  background: linear-gradient(180deg,
      rgba(220, 190, 230, 0.4) 0%,
      rgba(180, 220, 230, 0.4) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-card);
}

.auth-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  font-family: var(--font-sans), sans-serif;
  margin: 0 0 0.25rem;
  line-height: 1.2;
}

.auth-subtitle {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1.5rem;
  font-family: var(--font-sans), sans-serif;
}

.auth-footer {
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  font-family: var(--font-sans), sans-serif;
}

.auth-link {
  color: var(--equipt-orange);
  text-decoration: none;
  font-weight: 500;
}

.auth-link:hover {
  color: var(--color-equipt-orange-90);
}
</style>
