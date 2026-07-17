import { useCallback, useRef, useSyncExternalStore } from 'react'

import type { Editor, EditorEventName } from '@open-pencil/core/editor'

import { useEditor } from '#react/editor/context'

/** Events that indicate scene-graph / selection data may have changed. */
const SCENE_EVENTS: EditorEventName[] = [
  'selection:changed',
  'page:changed',
  'tool:changed',
  'render:requested'
]

/** Events that indicate viewport / overlay repaint-only changes. */
const REPAINT_EVENTS: EditorEventName[] = [
  'repaint:requested',
  'viewport:changed',
  'render:requested'
]

function subscribeEditor(editor: Editor, events: readonly EditorEventName[], onChange: () => void) {
  const unsubs = events.map((event) => editor.onEditorEvent(event, onChange as never))
  return () => {
    for (const off of unsubs) off()
  }
}

/**
 * Subscribe to editor state with a selector.
 *
 * Performance notes:
 * - Select the narrowest slice you need (ids, versions, derived props).
 * - Prefer {@link useSceneSnapshot} for property panels so pan/zoom repaints
 *   do not re-render React trees.
 * - During drag/scrub, keep transient geometry in refs / the canvas RAF path;
 *   only commit React-visible state when the selector result actually changes.
 */
export function useEditorStore<T>(
  selector: (editor: Editor) => T,
  options?: {
    events?: readonly EditorEventName[]
    isEqual?: (a: T, b: T) => boolean
  }
): T {
  const editor = useEditor()
  const events = options?.events ?? SCENE_EVENTS
  const isEqual = options?.isEqual ?? Object.is
  const cacheRef = useRef<{ editor: Editor; value: T } | null>(null)

  const subscribe = useCallback(
    (onChange: () => void) => subscribeEditor(editor, events, onChange),
    [editor, events]
  )

  const getSnapshot = () => {
    const next = selector(editor)
    const cache = cacheRef.current
    if (cache && cache.editor === editor && isEqual(cache.value, next)) {
      return cache.value
    }
    cacheRef.current = { editor, value: next }
    return next
  }

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Scene/selection-backed snapshot. Ignores pure repaint ticks when possible by
 * keying on sceneVersion + selection + page.
 */
export function useSceneSnapshot<T>(selector: (editor: Editor) => T): T {
  return useEditorStore(
    (editor) => {
      void editor.state.sceneVersion
      void editor.state.selectedIds
      void editor.state.currentPageId
      return selector(editor)
    },
    {
      events: SCENE_EVENTS,
      isEqual: Object.is
    }
  )
}

/**
 * Viewport / overlay snapshot (pan, zoom, hover). Use sparingly — high frequency.
 */
export function useRepaintSnapshot<T>(selector: (editor: Editor) => T): T {
  return useEditorStore(
    (editor) => {
      void editor.state.renderVersion
      return selector(editor)
    },
    { events: REPAINT_EVENTS }
  )
}

/** Stable version counters for memo / effect deps without reading full state. */
export function useSceneVersion(): number {
  return useEditorStore((editor) => editor.state.sceneVersion, { events: SCENE_EVENTS })
}

export function useRenderVersion(): number {
  return useEditorStore((editor) => editor.state.renderVersion, { events: REPAINT_EVENTS })
}

export function useSelectedIds(): ReadonlySet<string> {
  return useEditorStore((editor) => editor.state.selectedIds, {
    events: ['selection:changed', 'render:requested'],
    isEqual: (a, b) => a === b
  })
}
