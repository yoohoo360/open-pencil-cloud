import { useStore } from '@nanostores/react'
import { computed } from '#react/internal/reactive'
import { createEditorCommandActions } from '#react/editor/commands/actions'
import { createEditorCommandMap } from '#react/editor/commands/definitions'
import { useEditor } from '#react/editor/context'
import { useSelectionCapabilities } from '#react/editor/selection-capabilities/use'
import { useSelectionState } from '#react/editor/selection-state/use'
import { commandMessages } from '#react/i18n'
import { usePageList } from '#react/primitives/PageList/usePageList'

export type {
  EditorCommand,
  EditorCommandId,
  EditorCommandMenuEntry,
  EditorCommandMenuItem,
  EditorCommandMenuSeparator
} from './types'

/**
 * Builds a command-oriented interface on top of the current editor.
 *
 * Use this composable when building menus, toolbars, keyboard handlers, or
 * any other UI that should talk in terms of commands instead of raw editor
 * method calls.
 */
export function useEditorCommands() {
  const editor = useEditor()
  const selection = useSelectionState()
  const capabilities = useSelectionCapabilities()
  const { pages } = usePageList()

  const t = useStore(commandMessages)

  const otherPages = computed(() =>
    pages.filter((page) => page.id !== editor.state.currentPageId)
  )

  function moveSelectionToPage(pageId: string) {
    if (!capabilities.canMoveToPage.value) return
    editor.moveToPage(pageId)
  }

  const commands = createEditorCommandMap({
    editor,
    selection,
    capabilities,
    messages: { value: t },
    otherPages,
    moveSelectionToPage
  })

  return {
    commands,
    otherPages,
    moveSelectionToPage,
    ...createEditorCommandActions(commands)
  }
}
