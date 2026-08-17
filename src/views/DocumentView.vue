<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useEventListener, useUrlSearchParams } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'

import { useViewportKind, formatShortcut, useI18n, useEditor } from '@open-pencil/vue'
import { useKeyboard } from '@/app/shell/keyboard/use'
import { loadEditorLayout, saveEditorLayout } from '@/app/shell/layout-storage'
import { openFileFromPath, useMenu } from '@/app/shell/menu/use'
import { useCollab, COLLAB_KEY } from '@/app/collab/use'
import { connectAutomation } from '@/app/automation/bridge/server'
import { spawnMCPIfNeeded } from '@/app/automation/mcp/spawn'
import { isTauri } from '@/app/tauri/env'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import { useEditorStore } from '@/app/editor/active-store'
import { createTab, activeTab, getActiveStore, tabCount, openHttpFileInNewTab } from '@/app/tabs'

import CollabPanel from '@/components/CollabPanel/CollabPanel.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import MobileHud from '@/components/MobileHud/MobileHud.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import RenameSelectionDialog from '@/components/selection/RenameSelectionDialog.vue'
import SafariBanner from '@/components/SafariBanner.vue'
import TabBar from '@/components/TabBar.vue'
import Tip from '@/components/ui/Tip.vue'
import Toolbar from '@/components/Toolbar/Toolbar.vue'
import apiClient from '@/lib/client.ts'
import { readFigFile } from '#core/io'
import { activeStorageProviderID } from '@/app/integrations/storage'

const route = useRoute()
const params = useUrlSearchParams('history')
const showChrome = !('no-chrome' in params)
const router = useRouter()
const editor = useEditor()
const createdInitialTab = tabCount() === 0
const firstTab = createdInitialTab ? createTab() : (activeTab.value ?? createTab())
const store = useEditorStore()
const { dialogs } = useI18n()
const { isMobile } = useViewportKind()

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
}

const loadFile = async (fileKey: string) => {
  let { data: documentMeta } = await apiClient.get('/api/document/' + fileKey)

  await openHttpFileInNewTab(fileKey, documentMeta, firstTab.store)

  const res = await apiClient.get(`/api/document/${fileKey}/library`, {
    params: {
      library_key: 'web_lib_button',
      document_version: editor.state.documentVersion,
      library_version: documentMeta?.version
    }
  })
  if (res.success) {
    addRemoteLibClick({
      key: res.data.key,
      name: res.data.name,
      url: res.data.url,
      version: res.data.url
    })
  }
}
if (createdInitialTab) {
  const fileKey = route.params.fileKey
  if (fileKey) {
    loadFile(fileKey)
  }
}

useHead({ title: route.meta.demo ? 'Demo' : undefined })
useKeyboard()
useMenu()

const collab = useCollab(getActiveStore)
provide(COLLAB_KEY, collab)

useEventListener(
  document,
  'wheel',
  (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault()
  },
  { passive: false }
)

const automationCleanup = ref<(() => void) | null>(null)
const mcpCleanup = ref<(() => void) | null>(null)
const fileAssociationCleanup = ref<(() => void) | null>(null)
const initialEditorLayout = loadEditorLayout()

type PendingOpenFile = {
  path: string
}

async function openPendingAssociatedFiles() {
  const { invoke } = await import('@tauri-apps/api/core')
  const files = await invoke<PendingOpenFile[]>('take_pending_open')
  for (const file of files) {
    await openFileFromPath(file.path)
  }
}

async function bindAssociatedFileOpen() {
  if (!isTauri()) return
  const { listen } = await import('@tauri-apps/api/event')
  fileAssociationCleanup.value = await listen('open-associated-files', () => {
    void openPendingAssociatedFiles().catch((e) => console.error('[Open With]', e))
  })
  await openPendingAssociatedFiles()
}

onMounted(async () => {
  try {
    const mcp = await spawnMCPIfNeeded()
    mcpCleanup.value = mcp?.disconnect ?? null
    const tauri = isTauri()
    if (import.meta.env.DEV || tauri) {
      automationCleanup.value = connectAutomation(getActiveStore, mcp?.authToken ?? null).disconnect
    }
  } catch (e) {
    console.warn('[MCP]', e)
  }

  try {
    await bindAssociatedFileOpen()
  } catch (e) {
    console.error('[Open With]', e)
  }
})

onUnmounted(() => {
  mcpCleanup.value?.()
  automationCleanup.value?.()
  fileAssociationCleanup.value?.()
})
</script>

<template>
  <div data-test-id="editor-root" class="flex h-screen w-screen flex-col">
    <SafariBanner />
    <RenameSelectionDialog />
    <TabBar />

    <!-- Desktop layout -->
    <SplitterGroup
      v-if="!isMobile && showChrome && store.state.showUI"
      :key="activeTab?.id"
      direction="horizontal"
      class="flex-1 overflow-hidden"
      @layout="saveEditorLayout"
    >
      <SplitterPanel
        id="layers"
        :default-size="initialEditorLayout[0]"
        :min-size="10"
        :max-size="30"
        class="flex"
      >
        <LayersPanel />
      </SplitterPanel>
      <SplitterResizeHandle
        data-test-id="left-splitter-handle"
        class="group relative z-10 -mx-1 w-2 cursor-col-resize"
      >
        <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      </SplitterResizeHandle>
      <SplitterPanel id="canvas" :default-size="initialEditorLayout[1]" :min-size="30" class="flex">
        <div class="relative flex min-w-0 flex-1">
          <EditorCanvas />
          <Toolbar />
        </div>
      </SplitterPanel>
      <SplitterResizeHandle class="group relative z-10 -mx-1 w-2 cursor-col-resize">
        <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      </SplitterResizeHandle>
      <SplitterPanel
        id="properties"
        :default-size="initialEditorLayout[2]"
        :min-size="10"
        :max-size="30"
        class="flex flex-col"
      >
        <div
          class="flex shrink-0 items-center justify-between border-b border-border px-1.5 py-1.5"
        >
          <CollabPanel />
        </div>
        <PropertiesPanel />
      </SplitterPanel>
    </SplitterGroup>

    <!-- Mobile layout -->
    <div
      v-else-if="isMobile && showChrome && store.state.showUI"
      :key="'mobile-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <MobileHud />
        <Toolbar />
      </div>
      <MobileDrawer />
    </div>

    <!-- Collapsed UI (showUI=false) -->
    <div
      v-else-if="showChrome"
      :key="'collapsed-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <div
          v-if="!isMobile"
          class="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm"
        >
          <img src="/favicon-32.png" class="size-4" alt="OpenPencil" />
          <span data-test-id="editor-document-name" class="text-xs text-surface">{{
            store.state.documentName
          }}</span>
          <Tip
            :label="
              dialogs.showUI({ shortcut: formatShortcut(appMenuShortcut('toggle-ui')) ?? '' })
            "
          >
            <button
              data-test-id="editor-show-ui"
              class="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="store.state.showUI = true"
            >
              <icon-lucide-sidebar class="size-3.5" />
            </button>
          </Tip>
        </div>
      </div>
    </div>

    <!-- Bare canvas (no chrome, e.g. ?no-chrome) -->
    <div v-else :key="'bare-' + activeTab?.id" class="flex flex-1 overflow-hidden">
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
      </div>
    </div>
  </div>
</template>
