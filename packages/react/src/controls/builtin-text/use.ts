import {
  hydrateImageSources,
  prepareRichImage,
  syncBuiltinContent
} from '#react/controls/builtin-text/images'
import type { RichImage } from '#react/controls/builtin-text/lists'
import { htmlToMarkdown, markdownToHTML } from '#react/controls/builtin-text/markdown'
import { parseRichHTML } from '#react/controls/builtin-text/model'
import { readRichMarkdown, writeRichMarkdown } from '#react/controls/builtin-text/storage'
import { useEditor } from '#react/editor/context'
import { enclosingBuiltinInstance, isBuiltinInstance } from '#react/graph/builtin'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { useRef } from 'react'

import type { PluginDataEntry } from '@open-pencil/scene-graph'

export function useBuiltinText() {
  const editor = useEditor()
  const snapshots = useRef(new Map<string, PluginDataEntry[]>())
  const host = useSceneComputed(() => {
    const selected = editor.getSelectedNode()
    if (!selected) return null
    if (isBuiltinInstance(selected, editor.graph)) return selected
    return enclosingBuiltinInstance(editor.graph, selected.id)
  })
  const html = useSceneComputed(() => {
    if (!host) return ''
    const markdown = readRichMarkdown(host.pluginData)
    return hydrateImageSources(markdownToHTML(markdown || 'Write here'), editor.graph)
  })

  function preview(htmlValue: string) {
    if (!host) return
    const parsed = parseRichHTML(htmlValue)
    editor.updateNode(host.id, {
      pluginData: writeRichMarkdown(host.pluginData, htmlToMarkdown(htmlValue))
    })
    syncBuiltinContent(editor, host.id, parsed.blocks)
  }

  async function insertImage(file: File): Promise<RichImage | null> {
    if (!host) return null
    beginEdit()
    return prepareRichImage(editor, file)
  }

  function beginEdit() {
    if (!host) return
    snapshots.current.set(host.id, structuredClone(host.pluginData))
  }

  function commit() {
    if (!host) return
    const previous = snapshots.current.get(host.id)
    if (!previous) return
    if (JSON.stringify(host.pluginData) === JSON.stringify(previous)) return
    editor.commitNodeUpdate(host.id, { pluginData: previous }, 'Edit text')
  }

  return { host, html, preview, beginEdit, commit, insertImage }
}
