import { commitRichMarkdown } from '#react/controls/builtin-text/history'
import { hydrateImageSources, prepareRichImage } from '#react/controls/builtin-text/images'
import type { RichImage } from '#react/controls/builtin-text/lists'
import { markdownToHTML } from '#react/controls/builtin-text/markdown'
import { markdownContentWidth } from '#react/controls/builtin-text/panel-image-scale'
import {
  readRichImageMap,
  readRichMarkdown,
  type RichImageMap
} from '#react/controls/builtin-text/storage'
import { useEditor } from '#react/editor/context'
import { enclosingBuiltinInstance, isBuiltinInstance } from '#react/graph/builtin'
import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'

import type { Editor } from '@open-pencil/core/editor'
import type { SceneNode } from '@open-pencil/scene-graph'

function builtinHost(editor: Editor): SceneNode | null {
  const selected = editor.getSelectedNode()
  if (!selected) return null
  if (isBuiltinInstance(selected, editor.graph)) return selected
  return enclosingBuiltinInstance(editor.graph, selected.id)
}

function builtinContentKey(editor: Editor): string {
  const host = builtinHost(editor)
  const selected = [...editor.state.selectedIds].join(',')
  const markdown = host ? readRichMarkdown(host.pluginData) : ''
  const imageMap = host ? JSON.stringify(readRichImageMap(host.pluginData)) : ''
  const contentWidth = host ? markdownContentWidth(host) : 0
  return `${selected}:${host?.id ?? ''}:${markdown}:${imageMap}:${contentWidth}:${editor.graph.images.size}`
}

function subscribeBuiltinContent(editor: Editor, onChange: () => void) {
  const stops = [
    editor.onEditorEvent('selection:changed', onChange),
    editor.onEditorEvent('node:updated', onChange),
    editor.onEditorEvent('page:changed', onChange)
  ]
  return () => {
    for (const stop of stops) stop()
  }
}

export function useBuiltinText() {
  const editor = useEditor()
  const hostIdRef = useRef<string | undefined>(undefined)
  const snapshot = useSyncExternalStore(
    (onChange) => subscribeBuiltinContent(editor, onChange),
    () => builtinContentKey(editor),
    () => builtinContentKey(editor)
  )
  const host = useMemo(() => builtinHost(editor), [editor, snapshot])
  hostIdRef.current = host?.id
  const selectionId = useMemo(() => [...editor.state.selectedIds].join(','), [snapshot])
  const markdown = useMemo(() => (host ? readRichMarkdown(host.pluginData) : ''), [host, snapshot])
  const imageMap = useMemo(
    () => (host ? readRichImageMap(host.pluginData) : {}),
    [host, snapshot]
  )
  const imagesSize = editor.graph.images.size
  const html = useMemo(
    () =>
      host
        ? hydrateImageSources(
            markdownToHTML(markdown || 'Write here', imageMap),
            editor.graph
          )
        : '',
    [editor, host, markdown, imageMap, imagesSize]
  )

  const applyMarkdown = useCallback(
    (markdownValue: string, imageHashes: RichImageMap = {}) => {
      if (!host) return
      commitRichMarkdown(editor, host.id, markdownValue, imageHashes)
    },
    [editor, host]
  )

  const insertImage = useCallback(
    async (file: File): Promise<RichImage | null> => {
      if (!hostIdRef.current) return null
      return prepareRichImage(editor, file)
    },
    [editor]
  )

  const contentWidth = useMemo(
    () => (host ? markdownContentWidth(host) : 320),
    [host, snapshot]
  )

  return {
    host,
    selectionId,
    html,
    markdown,
    contentWidth,
    applyMarkdown,
    insertImage
  }
}
