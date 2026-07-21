import IconSidebar from '~icons/lucide/sidebar'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { useLocation, useParams, useSearchParams } from 'react-router'

import { formatShortcut, useI18n, useViewportKind } from '@open-pencil/react'
import { connectAutomation } from '@/app/automation/bridge/server'
import { spawnMCPIfNeeded } from '@/app/automation/mcp/spawn'
import { CollabProvider, useCollab } from '@/app/collab/use'
import { createDemoShapes } from '@/app/demo/document'
import { useEditorStore } from '@/app/editor/active-store'
import { useKeyboard } from '@/app/shell/keyboard/use'
import { loadEditorLayout, saveEditorLayout } from '@/app/shell/layout-storage'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import { openFileFromPath, useMenu } from '@/app/shell/menu/use'
import { isTauri } from '@/app/tauri/env'
import { createTab, getActiveStore, getActiveTab, tabCount, useActiveTab } from '@/app/tabs'
import CollabPanel from '@/components/CollabPanel/CollabPanel'
import EditorCanvas from '@/components/EditorCanvas'
import LayersPanel from '@/components/LayersPanel'
import MobileDrawer from '@/components/MobileDrawer'
import MobileHud from '@/components/MobileHud/MobileHud'
import PropertiesPanel from '@/components/PropertiesPanel'
import SafariBanner from '@/components/SafariBanner'
import TabBar from '@/components/TabBar'
import Tip from '@/components/ui/Tip'
import Toolbar from '@/components/Toolbar/Toolbar'

export type EditorViewProps = {
  demo?: boolean
}

export const EditorView = memo(function EditorView({ demo = false }: EditorViewProps) {
  const location = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const showChrome = !searchParams.has('no-chrome')
  const isDemo = demo || location.pathname === '/demo'
  const activeTab = useActiveTab()

  const createdInitialTab = tabCount() === 0
  const firstTab = useMemo(
    () => (createdInitialTab ? createTab() : (getActiveTab() ?? createTab())),
    [createdInitialTab]
  )
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const { isMobile } = useViewportKind()
  const collab = useCollab(getActiveStore)

  useEffect(() => {
    if (createdInitialTab && isDemo && !searchParams.has('test')) {
      createDemoShapes(firstTab.store)
    }
  }, [createdInitialTab, firstTab.store, isDemo, searchParams])

  useEffect(() => {
    document.title = isDemo ? 'Demo — OpenPencil' : 'OpenPencil'
  }, [isDemo])

  useKeyboard()
  useMenu()

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }
    document.addEventListener('wheel', onWheel, { passive: false })
    return () => document.removeEventListener('wheel', onWheel)
  }, [])

  const automationCleanup = useRef<(() => void) | null>(null)
  const mcpCleanup = useRef<(() => void) | null>(null)
  const fileAssociationCleanup = useRef<(() => void) | null>(null)
  const initialEditorLayout = useMemo(() => loadEditorLayout(), [])
  const [showUI, setShowUI] = useState(() => store.state.showUI)

  useEffect(() => {
    setShowUI(store.state.showUI)
  }, [store.state.showUI, store.state.sceneVersion])

  useEffect(() => {
    let cancelled = false

    async function openPendingAssociatedFiles() {
      const { invoke } = await import('@tauri-apps/api/core')
      const files = await invoke<Array<{ path: string }>>('take_pending_open')
      for (const file of files) {
        await openFileFromPath(file.path)
      }
    }

    async function bindAssociatedFileOpen() {
      if (!isTauri()) return
      const { listen } = await import('@tauri-apps/api/event')
      fileAssociationCleanup.current = await listen('open-associated-files', () => {
        void openPendingAssociatedFiles().catch((e) => console.error('[Open With]', e))
      })
      await openPendingAssociatedFiles()
    }

    void (async () => {
      try {
        const mcp = await spawnMCPIfNeeded()
        if (cancelled) return
        mcpCleanup.current = mcp?.disconnect ?? null
        const tauri = isTauri()
        if (import.meta.env.DEV || tauri) {
          automationCleanup.current = connectAutomation(
            getActiveStore,
            mcp?.authToken ?? null
          ).disconnect
        }
      } catch (e) {
        console.warn('[MCP]', e)
      }

      try {
        await bindAssociatedFileOpen()
      } catch (e) {
        console.error('[Open With]', e)
      }
    })()

    return () => {
      cancelled = true
      mcpCleanup.current?.()
      automationCleanup.current?.()
      fileAssociationCleanup.current?.()
    }
  }, [])

  void params.roomId

  const tabKey = activeTab?.id ?? 'default'

  return (
    <CollabProvider value={collab}>
      <div data-test-id="editor-root" className="flex h-screen w-screen flex-col">
        <SafariBanner />
        <TabBar />

        {!isMobile && showChrome && showUI ? (
          <PanelGroup
            key={tabKey}
            orientation="horizontal"
            className="flex-1 overflow-hidden"
            onLayoutChange={(layout) => {
              const values = Object.values(layout)
              if (values.every((v) => typeof v === 'number')) {
                saveEditorLayout(values as number[])
              }
            }}
          >
            <Panel
              id="layers"
              defaultSize={initialEditorLayout[0]}
              minSize={10}
              maxSize={30}
              className="flex"
            >
              <LayersPanel />
            </Panel>
            <PanelResizeHandle
              data-test-id="left-splitter-handle"
              className="group relative z-10 -mx-1 w-2 cursor-col-resize"
            >
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
            </PanelResizeHandle>
            <Panel id="canvas" defaultSize={initialEditorLayout[1]} minSize={30} className="flex">
              <div className="relative flex min-w-0 flex-1">
                <EditorCanvas />
                <Toolbar />
              </div>
            </Panel>
            <PanelResizeHandle className="group relative z-10 -mx-1 w-2 cursor-col-resize">
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
            </PanelResizeHandle>
            <Panel
              id="properties"
              defaultSize={initialEditorLayout[2]}
              minSize={10}
              maxSize={30}
              className="flex flex-col"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border px-1.5 py-1.5">
                <CollabPanel />
              </div>
              <PropertiesPanel />
            </Panel>
          </PanelGroup>
        ) : null}

        {isMobile && showChrome && showUI ? (
          <div key={`mobile-${tabKey}`} className="flex flex-1 overflow-hidden">
            <div className="relative flex min-w-0 flex-1">
              <EditorCanvas />
              <MobileHud />
              <Toolbar />
            </div>
            <MobileDrawer />
          </div>
        ) : null}

        {showChrome && !(showUI && !isMobile) && !(showUI && isMobile) ? (
          <div key={`collapsed-${tabKey}`} className="flex flex-1 overflow-hidden">
            <div className="relative flex min-w-0 flex-1">
              <EditorCanvas />
              {!isMobile ? (
                <div className="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm">
                  <img src="/favicon-32.png" className="size-4" alt="OpenPencil" />
                  <span data-test-id="editor-document-name" className="text-xs text-surface">
                    {store.state.documentName}
                  </span>
                  <Tip
                    label={dialogs.showUI({
                      shortcut: formatShortcut(appMenuShortcut('toggle-ui')) ?? ''
                    })}
                  >
                    <button
                      data-test-id="editor-show-ui"
                      className="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
                      onClick={() => {
                        store.state.showUI = true
                        setShowUI(true)
                      }}
                    >
                      <IconSidebar className="size-3.5" />
                    </button>
                  </Tip>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {!showChrome ? (
          <div key={`bare-${tabKey}`} className="flex flex-1 overflow-hidden">
            <div className="relative flex min-w-0 flex-1">
              <EditorCanvas />
            </div>
          </div>
        ) : null}
      </div>
    </CollabProvider>
  )
})

EditorView.displayName = 'EditorView'
export default EditorView
