<script setup lang="ts">
import { computed } from 'vue'
import { applyPureReactInVue } from 'veaury'

import { EditorCanvas as EditorCanvasReact } from '@/react_app/canvas/EditorCanvas'
import { useCollabInjected } from '@/composables/use-collab'
import { activeTab } from '@/stores/tabs'

const EditorCanvas = applyPureReactInVue(EditorCanvasReact)
const collab = useCollabInjected()

const collabBridge = computed(() =>
  collab
    ? {
        updateCursor: (cx: number, cy: number, pageId: string) =>
          collab.updateCursor(cx, cy, pageId),
        updateSelection: (ids: string[]) => collab.updateSelection(ids)
      }
    : null
)
</script>

<template>
  <EditorCanvas
    v-if="activeTab"
    :key="'canvas-' + activeTab.id"
    :editor="activeTab.store"
    :collab="collabBridge"
  />
</template>
