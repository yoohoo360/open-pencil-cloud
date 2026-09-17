import { bindOpenPencilTestImport } from '#react/app/document/test-import'
import { waitForPageRenderSettled, yieldToUI } from '#react/app/document/fig'
import { appPreferences } from '#react/app/settings/preferences'
import { hydrateBuiltinInstances } from '#react/controls/builtin-text/hydrate'
import { createCanvasPaneRegistry, type CanvasPaneRegistry } from '#react/editor/panes/registry'
import type { CanvasSplitNode, SplitDirection } from '#react/editor/panes/split-tree'
import { ensureBuiltinLibrary } from '#react/graph/builtin'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode
} from 'react'

import { IS_BROWSER } from '@open-pencil/core/constants'
import {
  createEditor,
  createDefaultEditorState,
  type Editor,
  type EditorState
} from '@open-pencil/core/editor'
import {
  getLazyFigImportContext,
  isLazyFigImportRootPopulated
} from '#core/kiwi/fig/lazy-import.override'
import '#react/app/editor/fonts'
import { SceneGraph } from '@open-pencil/scene-graph'

export type AppEditorState = EditorState & {
  loading: boolean
  showUI: boolean
  showRulers: boolean
  showRemoteCursors: boolean
  autosaveEnabled: boolean
  activeRibbonTab: 'panels' | 'code' | 'ai'
  panelMode: 'layers' | 'design'
  actionToast: string | null
  mobileDrawerSnap: 'closed' | 'half' | 'full'
  numberFieldFocused: boolean
  renameNodeId: string | null
  documentVersion: string
  documentFigURL: string
  documentKey: string
  historyPreviewId: string | null
}

export type EditorStore = Editor & {
  state: AppEditorState
  panes: CanvasPaneRegistry
  splitTree: CanvasSplitNode
  activePaneId: string
  visiblePaneCount: number
  getPaneRenderState: CanvasPaneRegistry['getPaneRenderState']
  setActivePane: CanvasPaneRegistry['setActivePane']
  splitPane: (
    paneId: string,
    direction: SplitDirection
  ) => ReturnType<CanvasPaneRegistry['splitPane']>
  closePane: CanvasPaneRegistry['closePane']
  resizePane: CanvasPaneRegistry['resizePane']
  setSplitSizes: CanvasPaneRegistry['setSplitSizes']
  subscribe: (onStoreChange: () => void) => () => void
  notify: () => void
  setShowUI: (value: boolean) => void
  setLoading: (value: boolean) => void
  prefetchRemainingLazyFigPages?: () => void
}

function createInitialAppEditorState(pageId: string): AppEditorState {
  const snapping = appPreferences.get().editing.snapping
  return {
    ...createDefaultEditorState(pageId),
    snappingPreferences: { ...snapping },
    loading: false,
    showUI: true,
    showRulers: true,
    showRemoteCursors: true,
    autosaveEnabled: false,
    activeRibbonTab: 'panels',
    panelMode: 'design',
    actionToast: null,
    mobileDrawerSnap: 'closed',
    numberFieldFocused: false,
    renameNodeId: null,
    documentVersion: '',
    documentFigURL: '',
    documentKey: '',
    historyPreviewId: null
  }
}

export function createEditorStore(initialGraph?: SceneGraph): EditorStore {
  const graph = initialGraph ?? new SceneGraph()
  const state = createInitialAppEditorState(graph.getPages()[0].id)
  const viewportSize = { width: 0, height: 0 }
  const editor = createEditor({
    graph,
    state,
    skipInitialGraphSetup: !!initialGraph,
    getViewportSize: () =>
      viewportSize.width > 0 && viewportSize.height > 0
        ? viewportSize
        : {
            width: IS_BROWSER ? window.innerWidth : 1920,
            height: IS_BROWSER ? window.innerHeight : 1080
          }
  })
  if (initialGraph) editor.subscribeToGraph()
  ensureBuiltinLibrary(editor.graph)
  hydrateBuiltinInstances(editor)
  editor.onEditorEvent('graph:replaced', (graph) => {
    ensureBuiltinLibrary(graph)
    hydrateBuiltinInstances(editor)
  })

  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) listener()
  }
  let loadingDepth = 0
  const setLoading = (value: boolean) => {
    if (value) loadingDepth += 1
    else loadingDepth = Math.max(0, loadingDepth - 1)
    const next = loadingDepth > 0
    if (state.loading === next) return
    state.loading = next
    notify()
  }
  const panes = createCanvasPaneRegistry(state, notify)

  editor.onEditorEvent('render:requested', notify)
  // repaint-only frames drive the canvas loop; notifying React here re-rendered
  // the whole shell on every pan/zoom/page-settle paint.
  editor.onEditorEvent('selection:changed', notify)
  editor.onEditorEvent('tool:changed', notify)
  editor.onEditorEvent('page:changed', notify)
  editor.onEditorEvent('viewport:changed', notify)

  const baseSwitchPage = editor.switchPage.bind(editor)
  const basePrefetchRemainingLazyFigPages = editor.prefetchRemainingLazyFigPages?.bind(editor)

  const store = Object.assign(editor, {
    state,
    panes,
    get splitTree() {
      return panes.splitTree
    },
    get activePaneId() {
      return panes.activePaneId
    },
    get visiblePaneCount() {
      return panes.visiblePaneCount
    },
    getPaneRenderState: panes.getPaneRenderState,
    setActivePane: panes.setActivePane,
    splitPane: panes.splitPane,
    closePane: panes.closePane,
    resizePane(paneId: string, width: number, height: number) {
      panes.resizePane(paneId, width, height)
      if (paneId === panes.activePaneId) {
        viewportSize.width = width
        viewportSize.height = height
      }
    },
    setSplitSizes: panes.setSplitSizes,
    subscribe(onStoreChange: () => void) {
      listeners.add(onStoreChange)
      return () => listeners.delete(onStoreChange)
    },
    notify,
    setShowUI(value: boolean) {
      state.showUI = value
      notify()
    },
    setLoading,
    prefetchRemainingLazyFigPages: () => {
      basePrefetchRemainingLazyFigPages?.()
    }
  }) satisfies EditorStore

  store.switchPage = async (pageId, options) => {
    const lazy = getLazyFigImportContext(store.graph)
    // Only cold (unpopulated) pages need the loading overlay. Warm switches are
    // camera commits and should stay instant.
    const needsLoading = !!lazy && !isLazyFigImportRootPopulated(store.graph, pageId)
    if (needsLoading) {
      store.setLoading(true)
      await yieldToUI()
    }
    try {
      await baseSwitchPage(pageId, options)
      if (needsLoading) {
        await waitForPageRenderSettled(store)
      }
    } finally {
      if (needsLoading) {
        store.setLoading(false)
      }
    }
  }

  return store
}

const EditorStoreContext = createContext<EditorStore | null>(null)

export function EditorStoreProvider({
  store,
  children
}: {
  store: EditorStore
  children?: ReactNode
}) {
  useEffect(() => bindOpenPencilTestImport(store), [store])
  return <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>
}

export function useOptionalEditorStore(): EditorStore | null {
  return useContext(EditorStoreContext)
}

export function useEditorStore(): EditorStore {
  const store = useContext(EditorStoreContext)
  if (!store) throw new Error('Editor store not provided')
  useSyncExternalStore(
    store.subscribe,
    () =>
      `${store.state.loading}:${store.state.showUI}:${store.state.sceneVersion}:${store.state.renderVersion}:${store.state.activeTool}:${store.state.editingTextId ?? ''}:${store.activePaneId}:${store.visiblePaneCount}:${store.state.mobileDrawerSnap}:${store.state.activeRibbonTab}:${store.state.panelMode}:${store.state.actionToast ?? ''}:${store.state.documentName}:${store.state.documentVersion}:${store.state.documentFigURL}:${store.state.documentKey}:${store.state.historyPreviewId ?? ''}:${store.state.zoom}:${store.state.currentPageId}:${[...store.state.selectedIds].join(',')}:${store.state.guides.selected?.guideId ?? ''}:${store.state.showRulers}:${store.state.showRemoteCursors}:${store.state.autosaveEnabled}:${store.state.snappingPreferences.geometry}:${store.state.snappingPreferences.objects}:${store.state.snappingPreferences.pixelGrid}:${store.renderer?.profiler.hudVisible ?? false}:${store.state.numberFieldFocused}:${store.state.renameNodeId ?? ''}`,
    () => 'ssr'
  )
  return store
}

export function useCreateEditorStore(initialGraph?: SceneGraph): EditorStore {
  const storeRef = useRef<EditorStore | null>(null)
  return useMemo(() => {
    storeRef.current ??= createEditorStore(initialGraph)
    return storeRef.current
  }, [initialGraph])
}
