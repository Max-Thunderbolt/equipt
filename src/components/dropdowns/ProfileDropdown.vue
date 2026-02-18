<template>
  <div ref="dropdownRef" class="profile-dropdown">
    <div class="profile-dropdown-caret" />
    <div class="profile-dropdown-menu">
      <button type="button" class="profile-dropdown-item" @click="handleLogout">
        Logout
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { logout } from '@/services/auth'

defineProps({
  open: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])
const router = useRouter()
const dropdownRef = ref(null)

async function handleLogout() {
  emit('close')
  try {
    await logout()
    router.push('/login')
  } catch (err) {
    console.error('Logout failed', err)
  }
}

function onDocumentClick(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    emit('close')
  }
}

onMounted(() => {
  setTimeout(() => {
    document.addEventListener('click', onDocumentClick, true)
  }, 0)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick, true)
})
</script>

<style scoped>
.profile-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 1000;
}

.profile-dropdown-caret {
  position: absolute;
  top: -6px;
  right: 1rem;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(255, 255, 255, 0.95);
  filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.08));
}

.profile-dropdown-menu {
  background: var(--glass-gradient);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-card);
  padding: 0.5rem 0;
  min-width: 180px;
}

.profile-dropdown-item {
  font-family: var(--font-sans), sans-serif !important;
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: #fff;
}

.profile-dropdown-item:hover {
  border-radius: 9999px;
  background: linear-gradient(180deg,
      rgba(121, 121, 183, 0.35) 0%,
      rgba(242, 104, 55, 0.35) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  padding: 0.5rem 1rem;
}
</style>
