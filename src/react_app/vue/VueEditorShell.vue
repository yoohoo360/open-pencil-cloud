<script setup lang="ts">
/**
 * Vue shell mounted under the React root via applyVueInReact.
 * Restores provideEditor + hosts the existing EditorView until panels finish migrating.
 */
import { useHead } from '@unhead/vue'
import { provideEditor } from '@open-pencil/vue'

import { useEditorStore } from '@/stores/editor'
import EditorView from '@/views/EditorView.vue'

useHead({ titleTemplate: (title) => (title ? `${title} — OpenPencil` : 'OpenPencil') })

const store = useEditorStore()
provideEditor(store)
</script>

<template>
  <EditorView />
</template>
