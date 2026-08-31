import { appPreferences } from '#react/app/settings/preferences'
import { createCanvasPaneRegistry, type CanvasPaneRegistry } from '#react/editor/panes/registry'
import type { CanvasSplitNode, SplitDirection } from '#react/editor/panes/split-tree'
import {
  createContext,
  useContext,
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
import { SceneGraph } from '@open-pencil/scene-graph'
import '#react/app/editor/fonts'

export type AppEditorState = EditorState & {
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
}

function createInitialAppEditorState(pageId: string): AppEditorState {
  const snapping = appPreferences.get().editing.snapping
  return {
    ...createDefaultEditorState(pageId),
    snappingPreferences: { ...snapping },
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
    documentFigURL: ''
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

  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) listener()
  }
  const panes = createCanvasPaneRegistry(state, notify)

  editor.onEditorEvent('render:requested', notify)
  editor.onEditorEvent('repaint:requested', notify)
  editor.onEditorEvent('selection:changed', notify)
  editor.onEditorEvent('tool:changed', notify)
  editor.onEditorEvent('page:changed', notify)
  editor.onEditorEvent('viewport:changed', notify)

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
    }
  }) satisfies EditorStore

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
      `${store.state.showUI}:${store.state.sceneVersion}:${store.state.renderVersion}:${store.state.activeTool}:${store.state.editingTextId ?? ''}:${store.activePaneId}:${store.visiblePaneCount}:${store.state.mobileDrawerSnap}:${store.state.activeRibbonTab}:${store.state.panelMode}:${store.state.actionToast ?? ''}:${store.state.documentName}:${store.state.documentVersion}:${store.state.documentFigURL}:${store.state.zoom}:${store.state.currentPageId}:${[...store.state.selectedIds].join(',')}:${store.state.guides.selected?.guideId ?? ''}:${store.state.showRulers}:${store.state.showRemoteCursors}:${store.state.autosaveEnabled}:${store.state.snappingPreferences.geometry}:${store.state.snappingPreferences.objects}:${store.state.snappingPreferences.pixelGrid}:${store.renderer?.profiler.hudVisible ?? false}:${store.state.numberFieldFocused}:${store.state.renameNodeId ?? ''}`,
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
