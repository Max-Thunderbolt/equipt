
<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}
</script>

<template>
  <h1>Pinboard Feature Coming Soon</h1>
  <p>This feature is currently under development. Please check back soon for updates.</p>
  <button @click="goBack">Go Back</button>
</template>