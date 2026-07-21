<script setup lang="ts">
import { openExternalLink } from '@/app/shell/ui'
import AppTextButton from '@/components/ui/AppTextButton.vue'

const { href } = defineProps<{ href: string }>()
</script>

<template>
  <AppTextButton size="xs" underline @click="openExternalLink(href)">
    <slot />
  </AppTextButton>
</template>
