import type { ReactiveRef as ComputedRef } from '#react/internal/reactive'
import type { Editor } from '@open-pencil/core/editor'

import type { useSelectionCapabilities } from '#react/editor/selection-capabilities/use'
import type { useSelectionState } from '#react/editor/selection-state/use'

export type CommandMessagesStore = { value: Record<string, string> }
export type SelectionState = ReturnType<typeof useSelectionState>
export type SelectionCapabilities = ReturnType<typeof useSelectionCapabilities>

export type EditorCommandMapOptions = {
  editor: Editor
  selection: SelectionState
  capabilities: SelectionCapabilities
  messages: CommandMessagesStore
  otherPages: ComputedRef<Array<{ id: string }>>
  moveSelectionToPage: (pageId: string) => void
}
