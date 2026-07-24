<script lang="ts">
import type { VNode } from 'vue'

export interface TextFieldProps {
  value: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  icon?: string
  label?: string
  suffix?: string
}

export interface TextFieldSlots {
  icon?(): VNode[]
  suffix?(): VNode[]
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<TextFieldProps>()

const emit = defineEmits<{
  change: [value: string]
  commit: [value: string, previous: string]
  'editing-change': [editing: boolean]
}>()

const editing = ref(false)
const draftValue = ref(props.value)
const initialValue = ref(props.value)

watch(
  () => props.value,
  (value) => {
    if (!editing.value) {
      draftValue.value = value
    }
  }
)

function onFocus() {
  editing.value = true
  initialValue.value = props.value
  draftValue.value = props.value
  emit('editing-change', true)
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  draftValue.value = value
  emit('change', value)
}

function onBlur() {
  editing.value = false
  emit('editing-change', false)
  emit('commit', draftValue.value, initialValue.value)
}

function onEnter(event: KeyboardEvent) {
  ;(event.target as HTMLInputElement).blur()
}
</script>

<template>
  <div
    class="w-full h-control rounded-panel border border-transparent bg-panel-field text-surface outline-none hover:bg-panel-field-hover focus-within:border-panel-focus focus-within:bg-panel-field-hover disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60 flex items-center justify-between min-w-0 px-1.5 text-xs"
  >
    <div
      v-if="$slots.icon || icon || label"
      class="mr-1 flex shrink-0 items-center gap-1 text-muted"
    >
      <slot name="icon">
        <span v-if="icon">{{ icon }}</span>
      </slot>
      <span v-if="label">{{ label }}</span>
    </div>

    <input
      :value="value"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      class="min-w-0 flex-1 bg-transparent text-surface outline-none placeholder:text-muted"
      @focus="onFocus"
      @input="onInput"
      @blur="onBlur"
      @keydown.enter="onEnter"
    />

    <div v-if="$slots.suffix || suffix" class="ml-1 flex shrink-0 items-center text-muted">
      <span v-if="suffix">{{ suffix }}</span>
      <slot name="suffix" />
    </div>
  </div>
</template>
