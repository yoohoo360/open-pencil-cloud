import { useEditorCommands } from '#react/editor/commands/use'
import { buildCanvasContextMenu } from '#react/editor/menu-model/canvas'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export type { MenuActionNode, MenuEntry, MenuSeparatorNode } from '#react/editor/menu-model/types'

export function useMenuModel() {
  const { menuItem, otherPages, moveSelectionToPage } = useEditorCommands()
  const selection = useSelectionState()
  const { menu: t } = useI18n()

  const canvasMenu = useSceneComputed(() =>
    buildCanvasContextMenu({
      commandMenuItem: menuItem,
      otherPages,
      moveSelectionToPage,
      selection,
      t
    })
  )

  return { canvasMenu }
}
