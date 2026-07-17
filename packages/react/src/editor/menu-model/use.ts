import { useStore } from '@nanostores/react'
import { computed } from '#react/internal/reactive'
import { useEditorCommands } from '#react/editor/commands/use'
import { useEditor } from '#react/editor/context'
import { buildEditMenu, buildObjectMenu, buildViewMenu } from '#react/editor/menu-model/builders'
import { buildCanvasContextMenu } from '#react/editor/menu-model/canvas'
import { useSelectionState } from '#react/editor/selection-state/use'
import { menuMessages } from '#react/i18n'

export type { MenuActionNode, MenuEntry, MenuSeparatorNode } from '#react/editor/menu-model/types'

import type { MenuEntry } from '#react/editor/menu-model/types'

/**
 * Returns ready-to-render menu models derived from the current editor state.
 *
 * This is a higher-level API than {@link useEditorCommands}: it groups
 * commands into app and canvas menu structures and computes context-sensitive
 * labels like Hide/Show and Lock/Unlock.
 */
export function useMenuModel() {
  const editor = useEditor()
  const { menuItem: commandMenuItem, otherPages, moveSelectionToPage } = useEditorCommands()
  const selection = useSelectionState()

  const t = useStore(menuMessages)

  const editMenu = computed<MenuEntry[]>(() => buildEditMenu(commandMenuItem))

  const viewMenu = computed<MenuEntry[]>(() => buildViewMenu(commandMenuItem))

  const objectMenu = computed<MenuEntry[]>(() => buildObjectMenu(commandMenuItem))

  const arrangeMenu = computed<MenuEntry[]>(() => [commandMenuItem('selection.wrapInAutoLayout')])

  const appMenu = computed(() => [
    { label: t.edit, items: editMenu.value },
    { label: t.view, items: viewMenu.value },
    { label: t.object, items: objectMenu.value },
    { label: t.arrange, items: arrangeMenu.value }
  ])

  const canvasMenu = computed<MenuEntry[]>(() =>
    buildCanvasContextMenu({
      commandMenuItem,
      otherPages: otherPages.value,
      moveSelectionToPage,
      selection,
      t: t
    })
  )

  const selectionLabelMenu = computed(() => ({
    visibility: (editor.getSelectedNode()?.visible ?? true) ? t.hide : t.show,
    lock: (editor.getSelectedNode()?.locked ?? false) ? t.unlock : t.lock
  }))

  return {
    appMenu,
    canvasMenu,
    selectionLabelMenu
  }
}
