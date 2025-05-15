<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  pinData: {
    type: Object,
    required: true
  },
  position: {
    type: Object,
    default: null
  },
  isEdit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

const formData = ref({
  type: 'note',
  title: '',
  content: '',
  file: null,
  link: ''
})

// Watch for changes in pinData prop
watch(() => props.pinData, (newData) => {
  if (newData) {
    formData.value = {
      type: newData.type || 'note',
      title: newData.title || '',
      content: newData.content || '',
      file: null,
      link: newData.type === 'link' ? newData.content : ''
    }
  }
}, { immediate: true })

const handleFileSelect = (event) => {
  formData.value.file = event.target.files[0]
}

const handleSubmit = () => {
  emit('submit', {
    ...formData.value,
    position: props.position
  })
}
</script>

<template>
  <div class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ isEdit ? 'Edit Pin' : 'Add Pin' }}</h2>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      <form @submit.prevent="handleSubmit">
        <!-- Pin Type Selection -->
        <div class="form-group">
          <label>Pin Type</label>
          <div class="pin-type-selector">
            <button 
              type="button"
              :class="{ active: formData.type === 'note' }"
              @click="formData.type = 'note'"
            >
              📝 Note
            </button>
            <button 
              type="button"
              :class="{ active: formData.type === 'file' }"
              @click="formData.type = 'file'"
            >
              📎 File
            </button>
            <button 
              type="button"
              :class="{ active: formData.type === 'link' }"
              @click="formData.type = 'link'"
            >
              🔗 Link
            </button>
          </div>
        </div>

        <!-- Title Field -->
        <div class="form-group">
          <label>Title</label>
          <input 
            v-model="formData.title"
            type="text"
            required
            placeholder="Enter pin title"
          >
        </div>

        <!-- Dynamic Content Field -->
        <div class="form-group">
          <template v-if="formData.type === 'note'">
            <label>Note</label>
            <textarea
              v-model="formData.content"
              rows="4"
              placeholder="Write your note..."
            ></textarea>
          </template>

          <template v-else-if="formData.type === 'file'">
            <label>File</label>
            <div class="file-upload-box">
              <input
                type="file"
                @change="handleFileSelect"
                :required="!isEdit"
              >
            </div>
          </template>

          <template v-else>
            <label>Link</label>
            <input
              v-model="formData.link"
              type="url"
              required
              placeholder="Enter URL..."
            >
          </template>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            {{ isEdit ? 'Save Changes' : 'Add Pin' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-black);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-heading);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text);
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-black-90);
  color: var(--color-text);
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.pin-type-selector {
  display: flex;
  gap: 8px;
}

.pin-type-selector button {
  flex: 1;
  padding: 8px;
  background: var(--color-black-90);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pin-type-selector button.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.file-upload-box {
  border: 2px dashed var(--color-border);
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  background: var(--color-black-90);
}

.file-upload-box input[type="file"] {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-secondary {
  background: var(--color-black-90);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-black-80);
}

.btn-primary {
  background: var(--color-primary);
  border: none;
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}
</style> 