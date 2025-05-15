<template>
  <div class="default-layout">
    <main class="main-content">
      <slot></slot>
    </main>
  </div>
</template>

<style scoped>
.default-layout {
  min-height: 100vh;
  width: 100%;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  width: 100%;
}
</style> 