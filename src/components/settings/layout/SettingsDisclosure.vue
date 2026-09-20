<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'

import { settingsDisclosureMotion } from '@/theme/settings/disclosure'

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <CollapsibleRoot v-model:open="open">
    <CollapsibleTrigger
      class="group flex w-full items-center gap-2 py-3 text-left text-xs text-surface"
    >
      <icon-lucide-chevron-right
        class="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none"
      />
      <slot name="label" />
    </CollapsibleTrigger>
    <CollapsibleContent :class="settingsDisclosureMotion">
      <div class="pb-3"><slot /></div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
