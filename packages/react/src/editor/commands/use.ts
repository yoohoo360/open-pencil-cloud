import { useMemo } from 'react'
import { useStore } from '@nanostores/react'

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

  const otherPages = useMemo(
    () => pages.filter((page) => page.id !== editor.state.currentPageId),
    [editor.state.currentPageId, pages]
  )

  function moveSelectionToPage(pageId: string) {
    if (!capabilities.canMoveToPage) return
    editor.moveToPage(pageId)
  }

  let opacityTarget: { value: number; coalesceKey?: string } = { value: 1 }
  function setOpacityTarget(value: number, coalesceKey?: string) {
    opacityTarget = coalesceKey ? { value, coalesceKey } : { value }
  }

  const commands = createEditorCommandMap({
    editor,
    selection,
    capabilities,
    messages: t,
    otherPages,
    moveSelectionToPage,
    getOpacityTarget: () => opacityTarget
  })

  return {
    commands,
    otherPages,
    moveSelectionToPage,
    setOpacityTarget,
    ...createEditorCommandActions(commands)
  }
}
