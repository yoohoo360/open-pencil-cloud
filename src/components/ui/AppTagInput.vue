<script setup lang="ts">
defineOptions({
  name: 'AppTagInput'
})

import { ref } from 'vue'

const { value, placeholder = '' } = defineProps<{
  value?: string[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'change', value: string[]): void
}>()

const inputValue = ref('')

function update(next: string[]) {
  emit('change', next)
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function removeTag(index: number) {
  const next = [...(value || [])]
  next.splice(index, 1)
  update(next)
}

function commitInput() {
  if (!inputValue.value) return

  const parts = inputValue.value.split(',').map(normalize).filter(Boolean)

  if (!parts.length) {
    inputValue.value = ''
    return
  }

  const merged = [...(value || [])]

  for (const part of parts) {
    if (!merged.includes(part)) {
      merged.push(part)
    }
  }

  update(merged)
  inputValue.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commitInput()
    return
  }

  if (e.key === 'Backspace' && !inputValue.value && (value || []).length > 0) {
    e.preventDefault()
    removeTag((value || []).length - 1)
  }
}

function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!text) return

  if (text.includes(',') || text.includes('\n')) {
    e.preventDefault()

    const parts = text.split(/[,\n]/).map(normalize).filter(Boolean)
    const merged = [...(value || [])]

    for (const part of parts) {
      if (!merged.includes(part)) {
        merged.push(part)
      }
    }

    update(merged)
    inputValue.value = ''
  }
}
</script>

<template>
  <div
    class="flex w-full flex-wrap items-center gap-[4px] rounded-md border border-border bg-input px-2 py-1 transition-colors focus-within:border-accent"
  >
    <span
      v-for="(tag, index) in value || []"
      :key="tag"
      class="inline-flex h-6 items-center rounded bg-fill-secondary px-1.5 text-xs leading-6 text-surface"
    >
      <span class="max-w-[120px] truncate">
        {{ tag }}
      </span>

      <button
        type="button"
        class="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded text-muted transition-colors hover:bg-white/10 hover:text-white"
        @click="removeTag(index)"
      >
        ×
      </button>
    </span>

    <input
      v-model="inputValue"
      type="text"
      :placeholder="!(value || []).length ? placeholder : ''"
      class="h-6 min-w-[2ch] flex-1 bg-transparent p-0 text-xs leading-6 text-surface outline-none placeholder:text-muted"
      @keydown="onKeydown"
      @blur="commitInput"
      @paste="onPaste"
    />
  </div>
</template>
