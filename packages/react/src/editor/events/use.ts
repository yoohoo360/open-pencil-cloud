import { useEffect } from 'react'

import type { EditorEventName, EditorEvents } from '@open-pencil/core/editor'

import { useEditor } from '#react/editor/context'

export function useEditorEvent<K extends EditorEventName>(event: K, handler: EditorEvents[K]) {
  const editor = useEditor()

  useEffect(() => {
    return editor.onEditorEvent(event, handler)
  }, [editor, event, handler])
}
