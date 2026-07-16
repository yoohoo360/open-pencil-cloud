import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode
} from 'react'

import type { Editor } from '@open-pencil/core/editor'

type Listener = () => void

export interface EditorStore {
  editor: Editor
  subscribe: (listener: Listener) => () => void
  getVersion: () => number
  notify: () => void
}

const EditorContext = createContext<EditorStore | null>(null)
EditorContext.displayName = 'OpenPencilEditor'

/**
 * Wrap an editor so React can subscribe to render/scene revisions.
 * Patches requestRender/requestRepaint to notify listeners.
 */
const STORE_FLAG = Symbol.for('open-pencil.react.editorStore')

type EditorWithStoreFlag = Editor & { [STORE_FLAG]?: EditorStore }

export function createEditorStore(editor: Editor): EditorStore {
  const tagged = editor as EditorWithStoreFlag
  const existing = tagged[STORE_FLAG]
  if (existing) return existing

  const listeners = new Set<Listener>()
  let version = editor.state.sceneVersion + editor.state.renderVersion * 1_000_000_000

  const notify = () => {
    version = editor.state.sceneVersion + editor.state.renderVersion * 1_000_000_000
    for (const listener of listeners) listener()
  }

  const originalRequestRender = editor.requestRender.bind(editor)
  const originalRequestRepaint = editor.requestRepaint.bind(editor)

  editor.requestRender = () => {
    originalRequestRender()
    notify()
  }
  editor.requestRepaint = () => {
    originalRequestRepaint()
    notify()
  }

  const store: EditorStore = {
    editor,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getVersion: () => version,
    notify
  }
  tagged[STORE_FLAG] = store
  return store
}

/**
 * Provides an OpenPencil editor instance to the current React subtree.
 * Accepts either a raw Editor or an EditorStore from {@link createEditorStore}.
 */
export function EditorProvider({
  editor,
  store,
  children
}: {
  editor?: Editor
  store?: EditorStore
  children: ReactNode
}) {
  const storeRef = useRef<EditorStore | null>(store ?? null)
  if (!storeRef.current) {
    if (store) storeRef.current = store
    else if (editor) storeRef.current = createEditorStore(editor)
    else throw new Error('[open-pencil] EditorProvider requires editor or store')
  }
  return <EditorContext.Provider value={storeRef.current}>{children}</EditorContext.Provider>
}

function useEditorStore(): EditorStore {
  const store = useContext(EditorContext)
  if (!store) {
    throw new Error(
      '[open-pencil] useEditor() called without an editor. ' +
        'Wrap your tree in <EditorProvider editor={editor}> first.'
    )
  }
  return store
}

/**
 * Returns the current OpenPencil editor from context.
 */
export function useEditor(): Editor {
  return useEditorStore().editor
}

/**
 * Subscribe to editor state revisions (scene + render versions).
 */
export function useEditorVersion(): number {
  const store = useEditorStore()
  return useSyncExternalStore(store.subscribe, store.getVersion, () => 0)
}

/**
 * Force a React notification after an imperative editor mutation that
 * may not have gone through requestRender (e.g. direct state writes).
 */
export function useEditorNotify(): () => void {
  return useEditorStore().notify
}

/**
 * Derive a value from the editor, re-computing when scene/selection changes.
 */
export function useEditorSelector<T>(selector: (editor: Editor) => T): T {
  const editor = useEditor()
  const version = useEditorVersion()
  const selectorRef = useRef(selector)
  selectorRef.current = selector
  // eslint-disable-next-line react-hooks/exhaustive-deps -- version drives recompute
  return useMemo(() => {
    void version
    return selectorRef.current(editor)
  }, [editor, version])
}

/**
 * Subscribe to a specific editor/graph event-like callback schedule.
 * Re-runs `effect` whenever the editor version changes.
 */
export function useEditorEvent(effect: (editor: Editor) => void | (() => void)): void {
  const editor = useEditor()
  const version = useEditorVersion()
  const effectRef = useRef(effect)
  effectRef.current = effect
  useMemo(() => {
    void version
    return effectRef.current(editor)
  }, [editor, version])
}

/** Stable empty selector helper. */
export function useStableCallback<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: never[]) => ref.current(...args), []) as T
}

/** @deprecated Prefer EditorProvider — naming parity with Vue SDK. */
export const EDITOR_KEY = EditorContext
export { EditorContext }
