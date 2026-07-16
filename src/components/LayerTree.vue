<script setup lang="ts">
import { ContextMenuPortal, ContextMenuRoot, ContextMenuTrigger } from 'reka-ui'
import { applyPureReactInVue } from 'veaury'

import CanvasMenu from '@/components/CanvasMenu.vue'
import { LayerTree as LayerTreeReact } from '@/react_app/layers/LayerTree'
import { useEditorStore } from '@/stores/editor'
import { activeTab } from '@/stores/tabs'

const store = useEditorStore()
const ReactTree = applyPureReactInVue(LayerTreeReact)

function onLayerRightClick(e: MouseEvent) {
  const row = (e.target as HTMLElement).closest<HTMLElement>('[data-node-id]')
  if (!row?.dataset.nodeId) return
  if (!store.state.selectedIds.has(row.dataset.nodeId)) store.select([row.dataset.nodeId])
}
</script>

<template>
  <ContextMenuRoot :modal="false">
    <ContextMenuTrigger as-child @contextmenu="onLayerRightClick">
      <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ReactTree v-if="activeTab" :key="activeTab.id" :editor="activeTab.store" />
      </div>
    </ContextMenuTrigger>
    <ContextMenuPortal>
      <CanvasMenu />
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
