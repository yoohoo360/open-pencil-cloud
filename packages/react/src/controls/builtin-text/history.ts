import { syncBuiltinContent } from '#react/controls/builtin-text/images'
import { markdownToBlocks } from '#react/controls/builtin-text/markdown'
import { readRichMarkdown, writeRichMarkdown } from '#react/controls/builtin-text/storage'

import type { Editor } from '@open-pencil/core/editor'
import type { PluginDataEntry } from '@open-pencil/scene-graph'

export function applyRichPluginData(
  editor: Editor,
  hostId: string,
  pluginData: PluginDataEntry[]
): void {
  const host = editor.graph.getNode(hostId)
  if (!host) return
  editor.graph.updateNode(hostId, { pluginData })
  syncBuiltinContent(editor, hostId, markdownToBlocks(readRichMarkdown(pluginData) || 'Write here'))
}

export function commitRichMarkdown(editor: Editor, hostId: string, markdown: string): boolean {
  const host = editor.graph.getNode(hostId)
  if (!host) return false
  const previous = structuredClone(host.pluginData ?? [])
  if (readRichMarkdown(previous) === markdown) return false
  applyRichPluginData(editor, hostId, writeRichMarkdown(previous, markdown))
  return true
}

export class MarkdownEditHistory {
  private past: string[] = []
  private future: string[] = []
  private current: string
  private open = false

  constructor(initial: string) {
    this.current = initial
  }

  get value(): string {
    return this.current
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  beginGroup(): void {
    this.open = false
  }

  record(next: string): boolean {
    if (next === this.current) return false
    if (!this.open) {
      this.past.push(this.current)
      this.future = []
      this.open = true
    }
    this.current = next
    return true
  }

  undo(): string | null {
    const previous = this.past.pop()
    if (previous == null) return null
    this.future.push(this.current)
    this.current = previous
    this.open = false
    return previous
  }

  redo(): string | null {
    const next = this.future.pop()
    if (next == null) return null
    this.past.push(this.current)
    this.current = next
    this.open = false
    return next
  }

  clear(value: string): void {
    this.past = []
    this.future = []
    this.current = value
    this.open = false
  }
}
