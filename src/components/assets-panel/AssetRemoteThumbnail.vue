<script setup lang="ts">
import { useElementVisibility, useObjectUrl } from '@vueuse/core'
import { computed, shallowRef, useTemplateRef, watch } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import { ASSET_GRID_THUMBNAIL_SIZE, ASSET_THUMBNAIL_RENDER_SCALE } from '@/constants'
import { renderRemoteExportImage } from '@/app/document/export/files.ts'

const { nodeId, alt, remoteKey, size } = defineProps<{
  nodeId: string
  alt: string
  remoteKey: string
  size: number
}>()

const editor = useEditorStore()
const isGridThumbnail = computed(() => size === ASSET_GRID_THUMBNAIL_SIZE)
const thumbnail = useTemplateRef<HTMLElement>('thumbnail')
const isVisible = useElementVisibility(thumbnail)
const previewBlob = shallowRef<Blob | null>(null)
const previewUrl = useObjectUrl(previewBlob)
let requestId = 0

async function updatePreview() {
  const currentRequest = ++requestId
  const lib = editor.graph.getLib(remoteKey)
  const graph = lib?.graph

  const node = graph?.getNode(nodeId)
  if (!node || !graph) {
    previewBlob.value = null
    return
  }
  const pageId = graph?.getPages()[0]?.id
  const maxDimension = Math.max(node.width, node.height, 1)
  const scale = (size * ASSET_THUMBNAIL_RENDER_SCALE) / maxDimension
  try {
    const data = await renderRemoteExportImage(editor, graph, [nodeId], pageId, scale, 'PNG')
    if (currentRequest !== requestId) return
    previewBlob.value = data ? new Blob([data], { type: 'image/png' }) : null
  } catch {
    if (currentRequest === requestId) previewBlob.value = null
  }
}

watch(
  () => [nodeId, size, remoteKey, isVisible.value],
  ([, , , visible]) => {
    if (visible) void updatePreview()
  },
  { immediate: true, flush: 'post' }
)
</script>

<template>
  <div
    ref="thumbnail"
    data-slot="asset-thumbnail"
    :class="[
      'flex shrink-0 items-center justify-center overflow-hidden rounded bg-canvas/60',
      isGridThumbnail ? 'size-24' : 'size-10'
    ]"
  >
    <img
      v-if="previewUrl"
      :src="previewUrl"
      :alt="alt"
      class="max-h-full max-w-full object-contain"
      draggable="false"
    />
    <icon-lucide-component v-else class="size-4 text-component" aria-hidden="true" />
  </div>
</template>
