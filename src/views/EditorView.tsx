import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useHead } from '@unhead/react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'

import type { Editor } from '@open-pencil/core/editor'
import { formatShortcut, useI18n, useViewportKind, EditorProvider } from '@open-pencil/react'
import { useKeyboard } from '@/app/shell/keyboard/use'
import { loadEditorLayout, saveEditorLayout } from '@/app/shell/layout-storage'
import { openFileFromPath, useMenu } from '@/app/shell/menu/use'
import { useCollab } from '@/app/collab/use'
import { CollabContext } from '@/app/collab/context'
import { connectAutomation } from '@/app/automation/bridge/server'
import { spawnMCPIfNeeded } from '@/app/automation/mcp/spawn'
import { isTauri } from '@/app/tauri/env'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import { createDemoShapes } from '@/app/demo/document'
import { useEditorStore } from '@/app/editor/active-store'
import { createTab, $activeTabId, getActiveStore, tabCount, activeTab } from '@/app/tabs'
import { useStore } from '@nanostores/react'

import CollabPanel from '@/components/CollabPanel/CollabPanel'
import EditorCanvas from '@/components/EditorCanvas'
import LayersPanel from '@/components/LayersPanel'
import MobileDrawer from '@/components/MobileDrawer'
import MobileHud from '@/components/MobileHud/MobileHud'
import PropertiesPanel from '@/components/PropertiesPanel'
import { SafariBanner } from '@/components/SafariBanner'
import { TabBar } from '@/components/TabBar'
import { Tip } from '@/components/ui/Tip'
import Toolbar from '@/components/Toolbar/Toolbar'

import IconLucideSidebar from '~icons/lucide/sidebar'

interface EditorViewProps {
  isDemo?: boolean
}

export function EditorView({ isDemo }: EditorViewProps) {
  const [searchParams] = useSearchParams()
  const showChrome = !searchParams.has('no-chrome')

  const store = useEditorStore()
  const { dialogs } = useI18n()
  const { isMobile } = useViewportKind()
  const activeTabId = useStore($activeTabId)

  useHead({ title: isDemo ? 'Demo' : undefined })

  // Create initial tab if needed (sync before first render)
  const tabCreatedRef = useRef(false)
  if (!tabCreatedRef.current) {
    tabCreatedRef.current = true
    const createdInitialTab = tabCount() === 0
    if (createdInitialTab) {
      const newTab = createTab()
      if (isDemo && !searchParams.has('test')) {
        createDemoShapes(newTab.store)
      }
    }
  }

  useKeyboard()
  useMenu()

  const collab = useCollab(getActiveStore)
  const currentStore = activeTab.get()?.store

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }
    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => document.removeEventListener('wheel', handleWheel)
  }, [])

  const mcpCleanupRef = useRef<(() => void) | null>(null)
  const automationCleanupRef = useRef<(() => void) | null>(null)
  const fileAssociationCleanupRef = useRef<(() => void) | null>(null)

  const initialEditorLayout = useRef(loadEditorLayout()).current

  const handleLayout = useCallback((layout: number[]) => {
    saveEditorLayout(layout)
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const mcp = await spawnMCPIfNeeded()
        mcpCleanupRef.current = mcp?.disconnect ?? null
        const tauri = isTauri()
        if (import.meta.env.DEV || tauri) {
          automationCleanupRef.current = connectAutomation(getActiveStore, mcp?.authToken ?? null).disconnect
        }
      } catch (e) {
        console.warn('[MCP]', e)
      }

      try {
        await bindAssociatedFileOpen()
      } catch (e) {
        console.error('[Open With]', e)
      }
    }

    void init()

    return () => {
      mcpCleanupRef.current?.()
      automationCleanupRef.current?.()
      fileAssociationCleanupRef.current?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openPendingAssociatedFiles() {
    const { invoke } = await import('@tauri-apps/api/core')
    const files = await invoke<{ path: string }[]>('take_pending_open')
    for (const file of files) {
      await openFileFromPath(file.path)
    }
  }

  async function bindAssociatedFileOpen() {
    if (!isTauri()) return
    const { listen } = await import('@tauri-apps/api/event')
    fileAssociationCleanupRef.current = await listen('open-associated-files', () => {
      void openPendingAssociatedFiles().catch((e) => console.error('[Open With]', e))
    })
    await openPendingAssociatedFiles()
  }

  if (!currentStore) return null

  return (
    <EditorProvider editor={currentStore as Editor}>
    <CollabContext.Provider value={collab}>
      <div data-test-id="editor-root" className="flex h-screen w-screen flex-col">
        <SafariBanner />
        <TabBar />

        {/* Desktop layout */}
        {!isMobile && showChrome && store.state.showUI && (
          <PanelGroup
            key={activeTabId}
            direction="horizontal"
            className="flex-1 overflow-hidden"
            onLayout={handleLayout}
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
        )}

        {/* Mobile layout */}
        {isMobile && showChrome && store.state.showUI && (
          <div key={`mobile-${activeTabId}`} className="flex flex-1 overflow-hidden">
            <div className="relative flex min-w-0 flex-1">
              <EditorCanvas />
              <MobileHud />
              <Toolbar />
            </div>
            <MobileDrawer />
          </div>
        )}

        {/* Collapsed UI (showUI=false) */}
        {!store.state.showUI && showChrome && (
          <div key={`collapsed-${activeTabId}`} className="flex flex-1 overflow-hidden">
            <div className="relative flex min-w-0 flex-1">
              <EditorCanvas />
              {!isMobile && (
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
                      }}
                    >
                      <IconLucideSidebar className="size-3.5" />
                    </button>
                  </Tip>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bare canvas (no chrome, e.g. ?no-chrome) */}
        {!showChrome && (
          <div key={`bare-${activeTabId}`} className="flex flex-1 overflow-hidden">
            <div className="relative flex min-w-0 flex-1">
              <EditorCanvas />
            </div>
          </div>
        )}
      </div>
    </CollabContext.Provider>
    </EditorProvider>
  )
}
