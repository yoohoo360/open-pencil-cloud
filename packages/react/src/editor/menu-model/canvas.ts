import {
  contextMenuGroupsFromOrder,
  contextMenuKindForNodeType,
  resolveContextMenuOrder,
  type ContextMenuItemId,
  type ContextMenuOrders
} from '#react/app/settings/context-menu'
import type { EditorCommandId } from '#react/editor/commands/types'
import type { useEditorCommands } from '#react/editor/commands/use'
import type { MenuActionNode, MenuEntry, MenuSeparatorNode } from '#react/editor/menu-model/types'
import type { useSelectionState } from '#react/editor/selection-state/use'

type CommandMenuItem = ReturnType<typeof useEditorCommands>['menuItem']
type SelectionState = ReturnType<typeof useSelectionState>

export type ContextMenuSource = 'canvas' | 'layers'

type CanvasMenuTranslations = {
  moveToPage: string
}

export type CanvasMenuOptions = {
  commandMenuItem: CommandMenuItem
  otherPages: { id: string; name: string }[]
  moveSelectionToPage: (pageId: string) => void
  selection: SelectionState
  t: CanvasMenuTranslations
  source?: ContextMenuSource
  menuOrders?: ContextMenuOrders
}

export function contextMenuGroups(
  source: ContextMenuSource,
  selection: SelectionState,
  menuOrders: ContextMenuOrders = {}
): readonly (readonly ContextMenuItemId[])[] {
  const kind = contextMenuKindForNodeType(selection.selectedNodeType)
  const order = resolveContextMenuOrder(kind, menuOrders)
  return contextMenuGroupsFromOrder(order, source)
}

function separator(): MenuSeparatorNode {
  return { separator: true }
}

function moveToPageItem({ otherPages, moveSelectionToPage, selection, t }: CanvasMenuOptions) {
  if (!selection.hasSelection || otherPages.length === 0) return []
  const sub = otherPages.map((page) => ({
    label: page.name,
    action: () => moveSelectionToPage(page.id)
  }))
  return [{ label: t.moveToPage, sub } satisfies MenuActionNode]
}

function componentItems({ commandMenuItem, selection }: CanvasMenuOptions): MenuEntry[] {
  return [
    selection.isComponent
      ? commandMenuItem('selection.createInstance')
      : commandMenuItem('selection.createComponent')
  ]
}

function componentSetItems({ commandMenuItem, selection }: CanvasMenuOptions): MenuEntry[] {
  return selection.canCreateComponentSet
    ? [commandMenuItem('selection.createComponentSet')]
    : []
}

function instanceItems({ commandMenuItem, selection }: CanvasMenuOptions): MenuEntry[] {
  return selection.isInstance
    ? [commandMenuItem('selection.goToMainComponent'), commandMenuItem('selection.detachInstance')]
    : []
}

function conditionalCommand(command: ContextMenuItemId, options: CanvasMenuOptions): MenuEntry[] {
  switch (command) {
    case 'selection.moveToPageWhenAvailable':
      return moveToPageItem(options)
    case 'selection.componentAction':
      return componentItems(options)
    case 'selection.componentSetAction':
      return componentSetItems(options)
    case 'selection.instanceActions':
      return instanceItems(options)
    case 'selection.ungroupWhenGroup':
      return options.selection.isGroup ? [options.commandMenuItem('selection.ungroup')] : []
    default:
      return [options.commandMenuItem(command as EditorCommandId)]
  }
}

export function buildCanvasContextMenu(options: CanvasMenuOptions): MenuEntry[] {
  const entries: MenuEntry[] = []
  for (const group of contextMenuGroups(
    options.source ?? 'canvas',
    options.selection,
    options.menuOrders
  )) {
    const groupEntries = group.flatMap((command) => conditionalCommand(command, options))
    if (groupEntries.length === 0) continue
    if (entries.length > 0) entries.push(separator())
    entries.push(...groupEntries)
  }
  return entries
}
