<template>
  <nav class="explore-side-nav">
    <div class="nav-section">
      <div class="nav-header">
        <h2>Filters</h2>
      </div>
      
      <div class="search-section">
        <input
          type="text"
          placeholder="Search projects..."
          v-model="searchQuery"
          class="search-input"
        />
      </div>

      <div class="filter-section">
        <h3>Categories</h3>
        <div class="category-options">
          <label 
            v-for="category in categories" 
            :key="category.value"
            class="category-option"
            :class="{ active: selectedCategory === category.value }"
          >
            <input
              type="radio"
              :value="category.value"
              v-model="selectedCategory"
              class="category-input"
            >
            <span class="category-label">{{ category.label }}</span>
          </label>
        </div>
      </div>

      <div class="filter-section">
        <h3>Sort By</h3>
        <div class="sort-options">
          <label 
            v-for="sort in sortOptions" 
            :key="sort.value"
            class="sort-option"
            :class="{ active: sortBy === sort.value }"
          >
            <input
              type="radio"
              :value="sort.value"
              v-model="sortBy"
              class="sort-input"
            >
            <span class="sort-label">{{ sort.label }}</span>
          </label>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  initialSearch: {
    type: String,
    default: ''
  },
  initialCategory: {
    type: String,
    default: ''
  },
  initialSort: {
    type: String,
    default: 'recent'
  }
})

const emit = defineEmits(['update:filters'])

const searchQuery = ref(props.initialSearch)
const selectedCategory = ref(props.initialCategory)
const sortBy = ref(props.initialSort)

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'web', label: 'Web Development' },
  { value: 'mobile', label: 'Mobile Development' },
  { value: 'design', label: 'Design' },
  { value: 'backend', label: 'Backend Development' },
  { value: 'frontend', label: 'Frontend Development' }
]

const sortOptions = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'trending', label: 'Trending' }
]

// Watch for changes and emit updates
watch([searchQuery, selectedCategory, sortBy], ([search, category, sort]) => {
  emit('update:filters', { search, category, sort })
}, { deep: true })
</script>

<style scoped>
.explore-side-nav {
  width: 280px;
  height: calc(100vh - var(--navbar-height, 72px));
  background: var(--color-black-95);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: fixed;
  top: var(--navbar-height, 72px);
  left: 0;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.nav-header {
  padding: 0 12px;
}

.nav-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.search-section {
  padding: 0 12px;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-black-90);
  color: var(--color-text);
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.filter-section {
  padding: 0 12px;
}

.filter-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 12px 0;
}

.category-options,
.sort-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-option,
.sort-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-option:hover,
.sort-option:hover {
  background: var(--color-black-90);
}

.category-option.active,
.sort-option.active {
  background: var(--color-black-85);
  color: var(--color-primary);
}

.category-input,
.sort-input {
  display: none;
}

.category-label,
.sort-label {
  font-size: 14px;
  color: var(--color-text);
}
</style> 