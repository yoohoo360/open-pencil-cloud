<script setup lang="ts">
import { useObjectUrl } from '@vueuse/core'
import { computed, ref, shallowRef, watch } from 'vue'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
  DialogClose,
  DialogTitle
} from 'reka-ui'

import type { SceneNode } from '@open-pencil/scene-graph'
import { useI18n } from '@open-pencil/vue'

import { nodeIcon } from '@/app/editor/icons'
import { useEditorStore } from '@/app/editor/active-store'
import { openExternalLink } from '@/app/shell/ui'
import AssetThumbnail from '@/components/assets-panel/AssetThumbnail.vue'
import { findAssetPage } from '@/components/assets-panel/page'
import AppInput from '@/components/ui/AppInput.vue'
import AppPlaceholder from '@/components/ui/AppPlaceholder.vue'
import { useButtonUI } from '@/components/ui/button'
import { AppDialogRoot, useDialogUI } from '@/components/ui/dialog'
import { useMenuUI } from '@/components/ui/menu'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import Tip from '@/components/ui/Tip.vue'
import { ASSET_GRID_THUMBNAIL_SIZE, ASSET_LIST_THUMBNAIL_SIZE } from '@/constants'
import apiClient from '@/lib/client.ts'
import { readFigFile } from '#core/io'
import { useRoute } from 'vue-router'

type AssetView = 'grid' | 'list'

type LocalAsset = {
  id: string
  name: string
  node: SceneNode
  componentId: string | null
  variants: Array<{ name: string; values: string[] }>
  variantCount: number
  hasConflicts: boolean
  sourceLibraryKey: string | null
  description: string
  docsUrl: string | null
  pageId: string
  pageName: string
}

type AssetGroup = {
  pageId: string
  pageName: string
  assets: LocalAsset[]
}

const editor = useEditorStore()
const { panels, commands } = useI18n()
const query = ref('')
const assetView = ref<AssetView>('grid')
const detailsOpen = ref(false)

const selectedAssetId = ref<string | null>(null)
const previewBlob = shallowRef<Blob | null>(null)
const previewUrl = useObjectUrl(previewBlob)
const previewLoading = ref(false)
const canAddRemoteLibList = ref<{ key: string; name: string }[]>([])
const canAddRemoteLibLoading = ref(false)
const canAddRemoteLibModalOpen = ref(false)
let previewRequestId = 0
const insertButton = useButtonUI({ tone: 'ghost', size: 'iconSm' })
const primaryButton = useButtonUI({ tone: 'accent', size: 'md' })
const dialog = useDialogUI()
const contextMenu = useMenuUI({ content: 'min-w-44' })
const viewOptions = computed(() => [
  { value: 'grid', label: panels.value.gridView },
  { value: 'list', label: panels.value.listView }
])
const viewUI = { root: 'w-16', item: 'px-1' }
const route = useRoute()
const activeLibKey = ref('')
function componentSetVariantInfo(componentSetId: string) {
  return [...editor.collectVariantOptions(componentSetId)].map(([name, values]) => ({
    name,
    values: [...values].sort((a, b) => a.localeCompare(b))
  }))
}

const graphNodes = computed(() => {
  if (activeLibKey.value && activeLibKey.value !== 'default') {
    const lib = editor.graph.getLib(activeLibKey.value)
    const graph = lib?.graph
    if (graph) {
      return {
        sceneVersion: graph.sceneVersion,
        nodes: [...graph?.nodes.values()]
      }
    }
  }

  return {
    sceneVersion: editor.state.sceneVersion,
    nodes: [...editor.graph.nodes.values()]
  }
})

const assetNodes = computed(() =>
  graphNodes.value.nodes.filter(
    (node) => node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
  )
)

const pageByNodeId = computed(() => {
  const pages = new Map<string, { id: string; name: string }>()
  for (const node of assetNodes.value) {
    let graph = editor.graph
    if (activeLib?.value?.remote) {
      const lib = editor.graph.getLib(activeLib.value.key)
      graph = lib?.graph || editor.graph
    }
    const page = findAssetPage(node, graph)
    if (page) pages.set(node.id, { id: page.id, name: page.name })
  }
  return pages
})
const currentPageId = computed(() => editor.state.currentPageId)

const libList = ref([])

const calculateRemoteList = () => {
  const remoteLibs = editor.graph.getRemoteImports()
  const list = [...remoteLibs.values()].map((it) => ({
    key: it.source,
    name: it.name,
    remote: true
  }))
  libList.value = [
    { name: 'Created in this file', key: 'default', thumbnail: '', remote: false },
    ...list
  ]
}
watch(
  () => activeLibKey,
  () => {
    calculateRemoteList()
  }
)
calculateRemoteList()

const activeLib = computed(() => {
  if (!activeLibKey.value) return null
  return libList.value.find((lib) => lib.key === activeLibKey.value) ?? null
})
const assets = computed<LocalAsset[]>(() => {
  let graph = editor.graph
  if (activeLib?.value?.remote) {
    const lib = editor.graph.getLib(activeLib.value.key)
    graph = lib?.graph || editor.graph
  }
  return assetNodes.value
    .filter((node) => {
      if (node.type === 'COMPONENT_SET') return true

      const parent = node.parentId ? graph.getNode(node.parentId) : null
      return parent?.type !== 'COMPONENT_SET'
    })
    .map((node) => {
      const defaultVariant =
        node.type === 'COMPONENT_SET'
          ? editor.getDefaultVariantForComponentSet(node.id, graph)
          : node
      const conflicts =
        node.type === 'COMPONENT_SET' ? editor.getComponentSetVariantConflicts(node.id) : []
      const variants = node.type === 'COMPONENT_SET' ? componentSetVariantInfo(node.id) : []
      const page = pageByNodeId.value.get(node.id)
      return {
        id: node.id,
        name: node.name,
        node,
        componentId: defaultVariant?.id ?? null,
        variants,
        variantCount: node.type === 'COMPONENT_SET' ? node.childIds.length : 0,
        hasConflicts: conflicts.length > 0,
        sourceLibraryKey: node.sourceLibraryKey,
        description: node.symbolDescription,
        docsUrl: node.symbolLinks[0]?.uri ?? null,
        pageId: page?.id ?? editor.state.currentPageId,
        pageName: page?.name ?? panels.value.page
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredAssets = computed(() => {
  const normalized = query.value.trim().toLowerCase()
  if (!normalized) return assets.value
  return assets.value.filter((asset) => asset.name.toLowerCase().includes(normalized))
})

const assetGroups = computed<AssetGroup[]>(() => {
  const groups = new Map<string, AssetGroup>()
  for (const asset of filteredAssets.value) {
    const group = groups.get(asset.pageId) ?? {
      pageId: asset.pageId,
      pageName: asset.pageName,
      assets: []
    }
    group.assets.push(asset)
    groups.set(asset.pageId, group)
  }
  return [...groups.values()].sort((a, b) => a.pageName.localeCompare(b.pageName))
})

const selectedAsset = computed(
  () => assets.value.find((asset) => asset.id === selectedAssetId.value) ?? null
)
const selectedPreviewNodeId = computed(() => selectedAsset.value?.componentId ?? null)

function clearPreview() {
  previewBlob.value = null
}

async function updatePreview() {
  const requestId = ++previewRequestId
  const nodeId = selectedPreviewNodeId.value
  if (!detailsOpen.value || !nodeId) {
    clearPreview()
    return
  }

  const node = editor.getNode(nodeId)
  if (!node) {
    clearPreview()
    return
  }

  previewLoading.value = true
  try {
    const maxSize = Math.max(node.width, node.height, 1)
    const scale = Math.min(176 / maxSize, 2)
    const data = await editor.renderExportImage([nodeId], scale, 'PNG', selectedAsset.value?.pageId)
    if (requestId !== previewRequestId) return
    previewBlob.value = data ? new Blob([data], { type: 'image/png' }) : null
  } catch {
    if (requestId === previewRequestId) clearPreview()
  } finally {
    if (requestId === previewRequestId) previewLoading.value = false
  }
}

watch([detailsOpen, selectedPreviewNodeId, () => editor.state.sceneVersion], updatePreview, {
  flush: 'post'
})

function openDetails(asset: LocalAsset) {
  selectedAssetId.value = asset.id
  detailsOpen.value = true
}

function insertionPoint(component: SceneNode, parentId: string) {
  const canvasCenter = editor.viewportCanvasCenter()
  const center = editor.screenToCanvas(canvasCenter.x, canvasCenter.y)
  const parentOffset =
    parentId === editor.state.currentPageId
      ? { x: 0, y: 0 }
      : editor.graph.getAbsolutePosition(parentId)
  return {
    x: center.x - parentOffset.x - component.width / 2,
    y: center.y - parentOffset.y - component.height / 2
  }
}

function insertAsset(asset: LocalAsset) {
  if (!asset.componentId) return

  let graph = editor.graph
  if (activeLib?.value?.remote) {
    const lib = editor.graph.getLib(activeLib.value.key)
    graph = lib?.graph || editor.graph
  }
  const component = graph.getNode(asset.componentId)
  if (!component) return
  const parentId = editor.state.enteredContainerId ?? editor.state.currentPageId
  const point = insertionPoint(component, parentId)
  editor.createInstanceFromComponent(
    asset.componentId,
    point.x,
    point.y,
    parentId,
    activeLib?.value?.key
  )
  editor.requestRender()
}

function onDragStart(event: DragEvent, asset: LocalAsset) {
  if (!event.dataTransfer || !asset.componentId) return
  event.dataTransfer.setData('application/x-openpencil-component', asset.componentId)
  event.dataTransfer.effectAllowed = 'copy'
}

function focusAsset(asset: LocalAsset) {
  void editor.focusComponent(asset.id)
}

function onAssetKeydown(event: KeyboardEvent, asset: LocalAsset) {
  if ((event.metaKey || event.ctrlKey) && event.code === 'Enter') {
    event.preventDefault()
    openDetails(asset)
    return
  }
  if (event.code === 'Enter' || event.code === 'Space') {
    event.preventDefault()
    insertAsset(asset)
  }
}

function insertSelectedAsset() {
  if (!selectedAsset.value) return
  insertAsset(selectedAsset.value)
  detailsOpen.value = false
}

const fetchCanAddRemoteLib = async () => {
  canAddRemoteLibLoading.value = true
  const res = await apiClient.get('/api/libraries/list')
  canAddRemoteLibLoading.value = false
  canAddRemoteLibList.value = res.data
}

const changeActiveLib = (key: string) => {
  activeLibKey.value = key
}
const openCanAddRemoteLibModal = () => {
  fetchCanAddRemoteLib()
  canAddRemoteLibModalOpen.value = true
}

const addRemoteLibClick = async (item: any) => {
  const res = await apiClient.get<ArrayBuffer>(`/api/oss/download?path=${item.url}`, {
    responseType: 'arraybuffer' // 重要：指定响应类型为二进制
  })
  const bytes = new Uint8Array(res.data)

  const fileBytes = new Uint8Array(bytes.byteLength)
  fileBytes.set(bytes)
  const file = new File([fileBytes.buffer], `${item.key}.fig`, {
    type: 'application/octet-stream'
  })
  const imported = await readFigFile(file, { populate: 'first-page' })
  editor.graph.addLib(item.key, item.name, item.url, imported)
  const fileKey = route.params.fileKey

  await apiClient.put(`/api/document/${fileKey}/library`, {
    library_key: item.key,
    document_version: editor.state.documentVersion,
    library_version: item.version
  })

  calculateRemoteList()
  canAddRemoteLibModalOpen.value = false
}
</script>

<template>
  <section data-test-id="assets-panel" class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="flex shrink-0 items-center gap-2 px-2 py-2" v-if="activeLibKey">
      <AppInput
        v-model="query"
        type="search"
        data-test-id="assets-search"
        size="sm"
        class="min-w-0 flex-1"
        :placeholder="panels.searchLocalComponents"
      />
      <SegmentedControl
        v-model="assetView"
        data-test-id="assets-view-toggle"
        :options="viewOptions"
        :label="panels.assetView"
        :ui="viewUI"
      >
        <template #option="{ option }">
          <icon-lucide-layout-grid v-if="option.value === 'grid'" class="size-3" />
          <icon-lucide-list v-else class="size-3" />
        </template>
      </SegmentedControl>
    </div>

    <div v-if="activeLib" class="inline-flex items-center px-2 py-2 mb-4">
      <icon-lucide-chevron-left
        class="size-4 text-surface cursor-pointer"
        @click="() => changeActiveLib('')"
      />
      <span>{{ activeLib?.name }}</span>
    </div>

    <div class="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
      <div v-if="!activeLibKey" class="space-x-1">
        <div
          v-for="libItem in libList"
          :key="libItem.key"
          @click="() => changeActiveLib(libItem.key)"
        >
          <div>
            <AssetThumbnail
              :node-id="currentPageId"
              v-if="!activeLib?.remote"
              :alt="`${libItem.name} preview`"
              :size="assetView === 'grid' ? ASSET_GRID_THUMBNAIL_SIZE : ASSET_LIST_THUMBNAIL_SIZE"
            />

            <div
              v-if="activeLib?.remote"
              :node-id="currentPageId"
              remoteKey="activeLib?.key"
              :alt="`${libItem.name} preview`"
              :size="assetView === 'grid' ? ASSET_GRID_THUMBNAIL_SIZE : ASSET_LIST_THUMBNAIL_SIZE"
            />
          </div>
          <div>{{ libItem.name }}</div>
        </div>
        <div class="mt-4">
          <button
            @click="openCanAddRemoteLibModal"
            class="flex h-7 w-full cursor-pointer items-center justify-center rounded border border-border bg-transparent text-xs text-muted hover:bg-hover hover:text-surface"
          >
            Add more libraries
          </button>
        </div>
      </div>
      <section v-if="activeLibKey" v-for="group in assetGroups" :key="group.pageId" class="mb-3">
        <h2 class="mb-1 px-1 text-[10px] font-medium tracking-wide text-muted uppercase">
          {{ group.pageName }}
        </h2>
        <div :class="assetView === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-0.5'">
          <ContextMenuRoot v-for="asset in group.assets" :key="asset.id">
            <ContextMenuTrigger as-child>
              <div
                role="button"
                tabindex="0"
                data-test-id="asset-item"
                :data-asset-id="asset.id"
                :draggable="!!asset.componentId"
                :class="[
                  'group/asset rounded text-left text-xs text-surface outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-accent',
                  assetView === 'grid'
                    ? 'flex min-w-0 flex-col items-center gap-1 p-1.5'
                    : 'flex w-full items-center gap-2 px-1.5 py-1'
                ]"
                @click="openDetails(asset)"
                @keydown="onAssetKeydown($event, asset)"
                @dragstart="onDragStart($event, asset)"
              >
                <AssetThumbnail
                  v-if="asset.componentId && !activeLib?.remote"
                  :node-id="asset.componentId"
                  :alt="`${asset.name} preview`"
                  :size="
                    assetView === 'grid' ? ASSET_GRID_THUMBNAIL_SIZE : ASSET_LIST_THUMBNAIL_SIZE
                  "
                />
                <AssetRemoteThumbnail
                  v-if="asset.componentId && activeLib?.remote"
                  :node-id="asset.componentId"
                  :alt="`${asset.name} preview`"
                  :remote-key="activeLib?.key"
                  :size="
                    assetView === 'grid' ? ASSET_GRID_THUMBNAIL_SIZE : ASSET_LIST_THUMBNAIL_SIZE
                  "
                />
                <component
                  :is="nodeIcon(asset.node)"
                  v-else
                  class="size-4 shrink-0 text-component"
                  aria-hidden="true"
                />
                <span :class="assetView === 'grid' ? 'w-full min-w-0' : 'min-w-0 flex-1'">
                  <span class="flex min-w-0 items-center gap-1">
                    <span data-test-id="asset-name" class="truncate">{{ asset.name }}</span>
                    <span
                      v-if="asset.sourceLibraryKey"
                      data-test-id="asset-library-badge"
                      class="shrink-0 rounded bg-component/15 px-1 py-px text-[9px] font-medium text-component uppercase"
                    >
                      {{ panels.assetLibraryBadge }}
                    </span>
                  </span>
                  <span
                    v-if="assetView === 'list' && asset.variants.length > 0"
                    data-test-id="asset-variant-summary"
                    class="mt-0.5 block truncate text-[10px] text-muted"
                  >
                    {{
                      panels.assetVariantSummary({
                        count: asset.variantCount,
                        names: asset.variants.map((variant) => variant.name).join(', ')
                      })
                    }}
                  </span>
                  <span
                    v-if="assetView === 'list' && asset.description"
                    data-test-id="asset-description"
                    class="mt-0.5 block truncate text-[10px] text-muted"
                  >
                    {{ asset.description }}
                  </span>
                  <span
                    v-if="assetView === 'list' && asset.hasConflicts"
                    data-test-id="asset-variant-conflict"
                    class="mt-0.5 block truncate text-[10px] text-[var(--color-warning-text)]"
                  >
                    {{ panels.duplicateVariantValues }}
                  </span>
                </span>
                <div v-if="assetView === 'list'" class="flex shrink-0 items-center">
                  <Tip v-if="asset.docsUrl" :label="panels.openDocumentation">
                    <button
                      type="button"
                      :class="insertButton.base"
                      data-test-id="asset-docs"
                      @pointerdown.stop
                      @click.stop="asset.docsUrl ? openExternalLink(asset.docsUrl) : undefined"
                    >
                      <icon-lucide-book-open class="size-3" />
                    </button>
                  </Tip>
                  <Tip :label="commands.createInstance">
                    <button
                      type="button"
                      :class="insertButton.base"
                      data-test-id="asset-insert"
                      @pointerdown.stop
                      @click.stop="insertAsset(asset)"
                    >
                      <icon-lucide-plus class="size-3" />
                    </button>
                  </Tip>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuPortal>
              <ContextMenuContent :class="contextMenu.content">
                <ContextMenuItem
                  data-test-id="asset-context-go-to-main"
                  :class="contextMenu.item"
                  @select="focusAsset(asset)"
                >
                  {{ panels.goToMainComponent }}
                </ContextMenuItem>
                <ContextMenuItem
                  data-test-id="asset-context-view-details"
                  :class="contextMenu.item"
                  @select="openDetails(asset)"
                >
                  {{ panels.viewDetails }}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenuPortal>
          </ContextMenuRoot>
        </div>
      </section>

      <AppPlaceholder
        v-if="filteredAssets.length === 0"
        data-test-id="assets-empty"
        :label="panels.noLocalComponents"
        size="compact"
      >
        <template #icon>
          <icon-lucide-component class="size-4" />
        </template>
      </AppPlaceholder>
    </div>

    <AppDialogRoot
      v-model:open="canAddRemoteLibModalOpen"
      size="lg"
      data-test-id="asset-details-dialog"
    >
      <div class="border-b border-border px-4 py-3">
        <div class="flex justify-end w-full">
          <DialogClose
            data-test-id="asset-details-close"
            class="flex size-7 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted"
          >
            <icon-lucide-x class="size-4" />
          </DialogClose>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-3">
          <div
            v-for="item in canAddRemoteLibList"
            :key="item.id || item.key"
            @click="addRemoteLibClick(item)"
            class="rounded-lg overflow-hidden bg-transparent border border-border hover:shadow-md transition-all cursor-pointer hover:bg-hover"
          >
            <!-- 缩略图 - 更大 -->
            <div class="w-full aspect-video flex items-center justify-center overflow-hidden">
              <img
                v-if="item.thumbnail_url"
                :src="item.thumbnail_url"
                :alt="item.name"
                class="w-full h-full object-cover"
              />
              <svg
                v-else
                class="w-10 h-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <path d="M8 16l4-4 4 4" />
                <circle cx="8" cy="8" r="2" />
              </svg>
            </div>

            <!-- 内容 -->
            <div class="p-3">
              <div class="text-sm font-medium truncate">
                {{ item.name }}
              </div>
              <div class="text-muted flex justify-between">
                <div class="text-[10px] mt-1.5">v{{ item.version || '1.0.0' }}</div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div
            v-if="!canAddRemoteLibList || canAddRemoteLibList.length === 0"
            class="col-span-full"
          >
            <div class="text-center py-12 text-gray-400 text-sm">暂无远程库</div>
          </div>
        </div>
      </div>
    </AppDialogRoot>

    <AppDialogRoot
      v-if="selectedAsset"
      v-model:open="detailsOpen"
      size="lg"
      data-test-id="asset-details-dialog"
    >
      <div class="flex items-center justify-between border-b border-border px-4 py-3">
        <div class="flex min-w-0 items-center gap-2">
          <component :is="nodeIcon(selectedAsset.node)" class="size-4 shrink-0 text-component" />
          <div class="min-w-0">
            <DialogTitle :class="dialog.title" class="truncate">{{
              selectedAsset.name
            }}</DialogTitle>
            <p class="mt-0.5 text-[11px] text-muted">
              {{
                selectedAsset.node.type === 'COMPONENT_SET' ? panels.componentSet : panels.component
              }}
              <span v-if="selectedAsset.variantCount > 0">
                · {{ selectedAsset.variantCount }} variants</span
              >
            </p>
          </div>
        </div>
        <DialogClose
          data-test-id="asset-details-close"
          class="flex size-7 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
        >
          <icon-lucide-x class="size-4" />
        </DialogClose>
      </div>

      <div class="grid min-h-0 grid-cols-[260px_1fr] gap-0">
        <div class="border-r border-border p-4">
          <div
            data-test-id="asset-details-preview"
            class="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas/60"
          >
            <img
              v-if="previewUrl"
              data-test-id="asset-details-preview-image"
              :src="previewUrl"
              :alt="`${selectedAsset.name} preview`"
              class="max-h-[120px] max-w-[210px] object-contain"
            />
            <div v-else class="text-center">
              <icon-lucide-loader-2
                v-if="previewLoading"
                class="mx-auto size-5 animate-spin text-muted"
              />
              <component
                v-else
                :is="nodeIcon(selectedAsset.node)"
                class="mx-auto size-8 text-component"
              />
              <p class="mt-2 max-w-44 truncate text-xs font-medium text-surface">
                {{ selectedAsset.name }}
              </p>
            </div>
          </div>
          <button
            data-test-id="asset-details-insert"
            :class="primaryButton.base"
            class="mt-3 w-full"
            @click="insertSelectedAsset"
          >
            {{ panels.insertInstance }}
          </button>
        </div>

        <div class="min-w-0 p-4">
          <section v-if="selectedAsset.description" class="mb-4">
            <h3 class="text-[11px] font-medium tracking-wider text-muted uppercase">
              {{ panels.description }}
            </h3>
            <p data-test-id="asset-details-description" class="mt-1 text-xs leading-5 text-surface">
              {{ selectedAsset.description }}
            </p>
          </section>

          <section v-if="selectedAsset.sourceLibraryKey" class="mb-4">
            <h3 class="text-[11px] font-medium tracking-wider text-muted uppercase">
              {{ panels.assetLibraryBadge }}
            </h3>
            <p data-test-id="asset-details-library" class="mt-1 break-all text-xs text-muted">
              {{ selectedAsset.sourceLibraryKey }}
            </p>
          </section>

          <section v-if="selectedAsset.docsUrl" class="mb-4">
            <h3 class="text-[11px] font-medium tracking-wider text-muted uppercase">
              {{ panels.documentation }}
            </h3>
            <button
              data-test-id="asset-details-docs"
              class="mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-component hover:bg-component/10"
              @click="selectedAsset.docsUrl ? openExternalLink(selectedAsset.docsUrl) : undefined"
            >
              <icon-lucide-book-open class="size-3" />
              {{ panels.openDocs }}
            </button>
          </section>

          <section v-if="selectedAsset.variants.length > 0">
            <h3 class="text-[11px] font-medium tracking-wider text-muted uppercase">
              {{ panels.properties }}
            </h3>
            <div class="mt-2 flex flex-col gap-2">
              <div
                v-for="variant in selectedAsset.variants"
                :key="variant.name"
                data-test-id="asset-details-property"
                class="rounded border border-border bg-input/40 px-2 py-1.5"
              >
                <div class="text-xs font-medium text-surface">{{ variant.name }}</div>
                <div class="mt-1 text-[11px] text-muted">{{ variant.values.join(', ') }}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppDialogRoot>
  </section>
</template>
