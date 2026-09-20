<script setup lang="ts">
const { label, description } = defineProps<{ label: string; description?: string }>()
</script>

<template>
  <div class="flex items-center justify-between gap-4 px-3 py-2.5" data-slot="settings-row">
    <div class="min-w-0">
      <p class="text-xs font-medium text-surface">{{ label }}</p>
      <p v-if="description" class="mt-1 text-xs leading-relaxed text-muted">{{ description }}</p>
      <slot name="description" />
    </div>
    <div class="shrink-0"><slot /></div>
  </div>
</template>
