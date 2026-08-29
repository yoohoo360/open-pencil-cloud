import { useEffect } from 'react'

import type { EditorEventName, EditorEvents } from '@open-pencil/core/editor'

import { useEditor } from '#react/editor/context'

/**
 * Subscribes to an editor event for the lifetime of the current component.
 */
export function useEditorEvent<K extends EditorEventName>(event: K, handler: EditorEvents[K]) {
  const editor = useEditor()

  useEffect(() => {
    const stop = editor.onEditorEvent(event, handler)
    return stop
  }, [editor, event, handler])
}
