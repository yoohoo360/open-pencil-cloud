import type { Editor } from '@open-pencil/core/editor'

import type { useSelectionCapabilities } from '#react/editor/selection-capabilities/use'
import type { useSelectionState } from '#react/editor/selection-state/use'

export type CommandMessagesStore = Record<string, string>
export type SelectionState = ReturnType<typeof useSelectionState>
export type SelectionCapabilities = ReturnType<typeof useSelectionCapabilities>

export type EditorCommandMapOptions = {
  editor: Editor
  selection: SelectionState
  capabilities: SelectionCapabilities
  messages: CommandMessagesStore
  otherPages: Array<{ id: string }>
  moveSelectionToPage: (pageId: string) => void
  getOpacityTarget: () => { value: number; coalesceKey?: string }
}
