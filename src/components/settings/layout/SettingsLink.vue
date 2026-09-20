<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { IS_TAURI } from '@open-pencil/core/constants'

import { openExternalLink } from '@/app/shell/ui'
import settingsLinkTheme from '@/theme/settings/link'

const { href } = defineProps<{ href: string }>()
const styles = tv(settingsLinkTheme)

function navigate(event: MouseEvent) {
  if (!IS_TAURI) return
  event.preventDefault()
  void openExternalLink(href)
}
</script>

<template>
  <a :href="href" target="_blank" rel="noopener noreferrer" :class="styles()" @click="navigate">
    <slot />
    <icon-lucide-external-link class="size-3 shrink-0" aria-hidden="true" />
  </a>
</template>
