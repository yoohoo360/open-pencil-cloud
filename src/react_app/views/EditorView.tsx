import { Sidebar } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'

import { connectAutomation } from '@/automation/server'
import { spawnMCPIfNeeded } from '@/automation/spawn-mcp'
import { useCollab } from '@/composables/use-collab'
import { IS_BROWSER, IS_TAURI } from '@/constants'
import { createDemoShapes } from '@/demo'
import { EditorCanvas } from '@/react_app/canvas/EditorCanvas'
import { useEditorKeyboard } from '@/react_app/hooks/useEditorKeyboard'
import { useTauriMenu } from '@/react_app/hooks/useTauriMenu'
import { LayersPanel } from '@/react_app/layers/LayersPanel'
import { MobileDrawer } from '@/react_app/mobile/MobileDrawer'
import { MobileHud } from '@/react_app/mobile/MobileHud'
import { CollabPanel } from '@/react_app/panels/CollabPanel'
import { PropertiesPanel } from '@/react_app/properties/PropertiesPanel'
import { SafariBanner } from '@/react_app/shell/SafariBanner'
import { TabBar } from '@/react_app/shell/TabBar'
import { Toolbar } from '@/react_app/toolbar/Toolbar'
import { subscribeEditorUI, notifyEditorUI } from '@/stores/editor-notify'
import {
  createTab,
  getActiveStore,
  getActiveTab,
  getActiveTabId,
  subscribeTabs
} from '@/stores/tabs'
import { useViewportKind } from '@open-pencil/react'

const LEFT_DEFAULT = 18
const RIGHT_DEFAULT = 18

function readShowChrome(): boolean {
  if (!IS_BROWSER) return true
  return !new URLSearchParams(window.location.search).has('no-chrome')
}

function readIsTest(): boolean {
  if (!IS_BROWSER) return false
  return new URLSearchParams(window.location.search).has('test')
}

function subscribeEditorChrome(onStoreChange: () => void): () => void {
  const unsubTabs = subscribeTabs(onStoreChange)
  const unsubUI = subscribeEditorUI(onStoreChange)
  return () => {
    unsubTabs()
    unsubUI()
  }
}

/**
 * Pure React editor shell — layers / canvas / properties with CSS flex split panes.
 */
export function EditorView() {
  const location = useLocation()
  const { isMobile } = useViewportKind()
  const showChrome = readShowChrome()

  const initialTab = useMemo(() => getActiveTab() ?? createTab(), [])
  const collab = useMemo(() => useCollab(initialTab.store), [initialTab.store])

  const tabId = useSyncExternalStore(subscribeEditorChrome, getActiveTabId, () => initialTab.id)
  const active =
    useSyncExternalStore(subscribeEditorChrome, getActiveTab, () => initialTab) ?? initialTab
  const showUI = useSyncExternalStore(
    subscribeEditorChrome,
    () => getActiveTab()?.store.state.showUI ?? true,
    () => true
  )
  const documentName = useSyncExternalStore(
    subscribeEditorChrome,
    () => getActiveTab()?.store.state.documentName ?? 'Untitled',
    () => 'Untitled'
  )

  const [leftPct, setLeftPct] = useState(LEFT_DEFAULT)
  const [rightPct, setRightPct] = useState(RIGHT_DEFAULT)
  const dragSide = useRef<'left' | 'right' | null>(null)
  const layoutRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const isDemo = location.pathname === '/demo' || location.pathname.startsWith('/demo/')
    if (isDemo && !readIsTest()) {
      createDemoShapes(initialTab.store)
    }
    document.title = isDemo ? 'Demo — OpenPencil' : 'OpenPencil'
  }, [location.pathname, initialTab.store])

  useEditorKeyboard()
  useTauriMenu()

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }
    document.addEventListener('wheel', onWheel, { passive: false })
    return () => document.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    let automationCleanup: (() => void) | null = null
    let mcpCleanup: (() => void) | null = null
    let cancelled = false

    if (import.meta.env.DEV || IS_TAURI) {
      automationCleanup = connectAutomation(getActiveStore).disconnect
    }
    void spawnMCPIfNeeded()
      .then((cleanup) => {
        if (cancelled) {
          cleanup?.()
          return
        }
        mcpCleanup = cleanup
      })
      .catch((e) => console.error(e))

    return () => {
      cancelled = true
      mcpCleanup?.()
      automationCleanup?.()
      collab.disconnect()
    }
  }, [collab])

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const side = dragSide.current
      const el = layoutRef.current
      if (!side || !el) return
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      if (side === 'left') {
        setLeftPct(Math.min(30, Math.max(10, x)))
      } else {
        setRightPct(Math.min(30, Math.max(10, 100 - x)))
      }
    }
    function onPointerUp() {
      dragSide.current = null
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  const centerPct = Math.max(30, 100 - leftPct - rightPct)

  const canvasCollab = {
    updateCursor: collab.updateCursor,
    updateSelection: collab.updateSelection
  }

  return (
    <div data-test-id="editor-root" className="flex h-screen w-screen flex-col">
      <SafariBanner />
      <TabBar />

      {!isMobile && showChrome && showUI ? (
        <div key={tabId} ref={layoutRef} className="flex flex-1 overflow-hidden">
          <div className="flex overflow-hidden" style={{ width: `${leftPct}%`, minWidth: 0 }}>
            <LayersPanel editor={active.store} />
          </div>
          <div
            data-test-id="left-splitter-handle"
            className="group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize"
            onPointerDown={() => {
              dragSide.current = 'left'
            }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
          </div>
          <div
            className="relative flex min-w-0 flex-1 overflow-hidden"
            style={{ width: `${centerPct}%` }}
          >
            <EditorCanvas editor={active.store} collab={canvasCollab} />
            <Toolbar editor={active.store} />
          </div>
          <div
            className="group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize"
            onPointerDown={() => {
              dragSide.current = 'right'
            }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
          </div>
          <div
            className="flex flex-col overflow-hidden"
            style={{ width: `${rightPct}%`, minWidth: 0 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-1.5 py-1.5">
              <CollabPanel collab={collab} />
            </div>
            <PropertiesPanel editor={active.store} />
          </div>
        </div>
      ) : null}

      {isMobile && showChrome && showUI ? (
        <div key={`mobile-${tabId}`} className="flex flex-1 overflow-hidden">
          <div className="relative flex min-w-0 flex-1">
            <EditorCanvas editor={active.store} collab={canvasCollab} />
            <MobileHud editor={active.store} collab={collab} />
            <Toolbar editor={active.store} />
          </div>
          <MobileDrawer editor={active.store} />
        </div>
      ) : null}

      {showChrome && !showUI ? (
        <div key={`collapsed-${tabId}`} className="flex flex-1 overflow-hidden">
          <div className="relative flex min-w-0 flex-1">
            <EditorCanvas editor={active.store} collab={canvasCollab} />
            {!isMobile ? (
              <div className="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm">
                <img src="/favicon-32.png" className="size-4" alt="OpenPencil" />
                <span data-test-id="editor-document-name" className="text-xs text-surface">
                  {documentName}
                </span>
                <button
                  type="button"
                  data-test-id="editor-show-ui"
                  className="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
                  title="Show UI (⌘\\)"
                  onClick={() => {
                    active.store.state.showUI = true
                    active.store.requestRepaint()
                    notifyEditorUI()
                  }}
                >
                  <Sidebar className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!showChrome ? (
        <div key={`bare-${tabId}`} className="flex flex-1 overflow-hidden">
          <div className="relative flex min-w-0 flex-1">
            <EditorCanvas editor={active.store} collab={canvasCollab} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
