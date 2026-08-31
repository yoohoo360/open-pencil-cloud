import { syncBuiltinContent } from '#react/controls/builtin-text/images'
import { markdownToBlocks } from '#react/controls/builtin-text/markdown'
import { readRichMarkdown, writeRichMarkdown } from '#react/controls/builtin-text/storage'
import { collectBuiltinTextLayers, isBuiltinInstance } from '#react/graph/builtin'

import type { Editor } from '@open-pencil/core/editor'

const DEFAULT_MARKDOWN = 'Write here'

function markdownForHost(editor: Editor, hostId: string): string {
  const host = editor.graph.getNode(hostId)
  if (!host) return DEFAULT_MARKDOWN
  const stored = readRichMarkdown(host.pluginData).trim()
  if (stored) return stored
  const fromLayers = collectBuiltinTextLayers(editor.graph, hostId)
    .map((node) => node.text.trim())
    .filter(Boolean)
    .join('\n\n')
  return fromLayers || DEFAULT_MARKDOWN
}

export function hydrateBuiltinInstance(editor: Editor, hostId: string): void {
  const host = editor.graph.getNode(hostId)
  if (!host || !isBuiltinInstance(host, editor.graph)) return
  const markdown = markdownForHost(editor, hostId)
  if (readRichMarkdown(host.pluginData) !== markdown) {
    editor.graph.updateNode(hostId, {
      pluginData: writeRichMarkdown(host.pluginData, markdown)
    })
  }
  syncBuiltinContent(editor, hostId, markdownToBlocks(markdown))
}

export function hydrateBuiltinInstances(editor: Editor): void {
  for (const node of editor.graph.getAllNodes()) {
    if (isBuiltinInstance(node, editor.graph)) hydrateBuiltinInstance(editor, node.id)
  }
}
