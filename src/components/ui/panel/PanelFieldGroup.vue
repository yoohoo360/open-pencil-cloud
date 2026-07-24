<script lang="ts">
import type { VNode } from 'vue'
import type { ClassValue } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { PanelFieldGroupTheme } from '@/theme/panel/field-group'

export interface PanelFieldGroupProps {
  label?: string
  for?: string
  class?: ClassValue
  ui?: ComponentUI<PanelFieldGroupTheme>
}

export interface PanelFieldGroupSlots {
  default(): VNode[]
  actions?(): VNode[]
}
</script>

<script setup lang="ts">
import { tv } from 'tailwind-variants'

import theme from '@/theme/panel/field-group'

const { label, for: labelFor, class: className, ui } = defineProps<PanelFieldGroupProps>()
defineSlots<PanelFieldGroupSlots>()
const styles = tv(theme)()
</script>

<template>
  <div
    data-slot="root"
    data-panel-field-group
    :class="styles.root({ class: [ui?.root, className] })"
  >
    <div class="flex items-center justify-between">
      <label
        v-if="label"
        data-slot="label"
        :for="labelFor"
        :class="styles.label({ class: ui?.label })"
      >
        {{ label }}
      </label>
      <div
        v-if="$slots.actions"
        data-slot="actions"
        :class="styles.actions({ class: ui?.actions })"
      >
        <slot name="actions" />
      </div>
    </div>

    <div data-slot="container" :class="styles.container({ class: ui?.container })">
      <slot />
    </div>
  </div>
</template>
