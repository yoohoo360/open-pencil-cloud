<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue'
import ColorInput from '@/components/ColorInput.vue'
import { sectionWrapper } from '@/components/ui/section'

import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()
const pageColor = computed(() => editor.state.pageColor)
const { panels } = useI18n()
</script>

<template>
  <div data-test-id="page-section" :class="sectionWrapper()">
    <label class="mb-1.5 block text-[11px] text-muted">{{ panels.page ?? 'Page' }}</label>
    <ColorInput :color="pageColor" editable @update="editor.setPageColor($event)" />
  </div>
</template>
