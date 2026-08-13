<script lang="ts">
import type { VNode } from 'vue'
import type { ComponentUI } from '@/components/ui/types.ts'
import type { PanelSectionTheme } from '@/theme/panel/section.ts'

interface PanelSectionContentSlots {
  default(): VNode[]
}

export interface PanelContentProps {
  ui?: ComponentUI<PanelSectionTheme>
}
</script>

<script setup lang="ts">
import { tv } from 'tailwind-variants'

import theme from '@/theme/panel/section'
import { computed } from 'vue'
const { ui } = defineProps<PanelContentProps>()
const slots = defineSlots<PanelSectionContentSlots>()
const styles = computed(() =>
  tv(theme)({
    actions: false
  })
)
</script>

<template>
  <div :class="styles.body({ class: ui?.body })">
    <slot />
  </div>
</template>
