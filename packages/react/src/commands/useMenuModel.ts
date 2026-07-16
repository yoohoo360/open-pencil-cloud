import { useEditor } from '../context/editorContext'
import { useI18n } from '../i18n'
import { useSelectionState } from '../selection/useSelectionState'
import { useEditorCommands } from './useEditorCommands'

/**
 * Action entry used by menu models returned from {@link useMenuModel}.
 */
export interface MenuActionNode {
  separator?: false
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  sub?: MenuEntry[]
}

export interface MenuSeparatorNode {
  separator: true
}

export type MenuEntry = MenuActionNode | MenuSeparatorNode

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
  const { hasSelection, isGroup, isInstance, isComponent, canCreateComponentSet, selectedNode } =
    useSelectionState()
  const { menu: t } = useI18n()

  const editMenu: MenuEntry[] = [
    commandMenuItem('edit.undo'),
    commandMenuItem('edit.redo'),
    { separator: true },
    commandMenuItem('selection.duplicate'),
    commandMenuItem('selection.delete'),
    { separator: true },
    commandMenuItem('selection.selectAll')
  ]

  const viewMenu: MenuEntry[] = [
    commandMenuItem('view.zoom100'),
    commandMenuItem('view.zoomFit'),
    commandMenuItem('view.zoomSelection')
  ]

  const objectMenu: MenuEntry[] = [
    commandMenuItem('selection.group'),
    commandMenuItem('selection.ungroup'),
    { separator: true },
    commandMenuItem('selection.createComponent'),
    commandMenuItem('selection.createComponentSet'),
    commandMenuItem('selection.detachInstance'),
    { separator: true },
    commandMenuItem('selection.bringToFront'),
    commandMenuItem('selection.sendToBack')
  ]

  const arrangeMenu: MenuEntry[] = [commandMenuItem('selection.wrapInAutoLayout')]

  const appMenu = [
    { label: t.edit, items: editMenu },
    { label: t.view, items: viewMenu },
    { label: t.object, items: objectMenu },
    { label: t.arrange, items: arrangeMenu }
  ]

  const moveToPageSubmenu: MenuEntry[] = otherPages.map((page) => ({
    label: page.name,
    action: () => moveSelectionToPage(page.id)
  }))

  const canvasMenu: MenuEntry[] = [
    commandMenuItem('selection.duplicate', '⌘D'),
    commandMenuItem('selection.delete', '⌫'),
    { separator: true },
    ...(moveToPageSubmenu.length > 0 && hasSelection
      ? [{ label: t.moveToPage, sub: moveToPageSubmenu } satisfies MenuActionNode]
      : []),
    commandMenuItem('selection.bringToFront', ']'),
    commandMenuItem('selection.sendToBack', '['),
    { separator: true },
    commandMenuItem('selection.group', '⌘G'),
    ...(isGroup ? [commandMenuItem('selection.ungroup', '⇧⌘G')] : []),
    ...(hasSelection ? [commandMenuItem('selection.wrapInAutoLayout', '⇧A')] : []),
    { separator: true },
    commandMenuItem('selection.createComponent', '⌥⌘K'),
    ...(canCreateComponentSet ? [commandMenuItem('selection.createComponentSet', '⇧⌘K')] : []),
    ...(isComponent && selectedNode
      ? [
          {
            label: t.createInstance,
            action: () => commandMenuItem('selection.createInstance').action?.(),
            disabled: commandMenuItem('selection.createInstance').disabled
          } satisfies MenuActionNode
        ]
      : []),
    ...(isInstance ? [commandMenuItem('selection.goToMainComponent')] : []),
    ...(isInstance ? [commandMenuItem('selection.detachInstance', '⌥⌘B')] : []),
    ...(hasSelection
      ? [
          { separator: true } as MenuSeparatorNode,
          commandMenuItem('selection.toggleVisibility', '⇧⌘H'),
          commandMenuItem('selection.toggleLock', '⇧⌘L')
        ]
      : [])
  ]

  const selectionLabelMenu = {
    visibility: (editor.getSelectedNode()?.visible ?? true) ? t.hide : t.show,
    lock: (editor.getSelectedNode()?.locked ?? false) ? t.unlock : t.lock
  }

  return {
    appMenu,
    canvasMenu,
    selectionLabelMenu
  }
}
