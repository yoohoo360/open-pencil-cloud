import type { EditorCommandId } from '#react/editor/commands/types'
import type { useEditorCommands } from '#react/editor/commands/use'
import type { MenuActionNode, MenuEntry, MenuSeparatorNode } from '#react/editor/menu-model/types'
import type { useSelectionState } from '#react/editor/selection-state/use'

type CommandMenuItem = ReturnType<typeof useEditorCommands>['menuItem']
type SelectionState = ReturnType<typeof useSelectionState>

export type ContextMenuSource = 'canvas' | 'layers'

type CanvasMenuCommand =
  | EditorCommandId
  | 'selection.componentAction'
  | 'selection.componentSetAction'
  | 'selection.instanceActions'
  | 'selection.ungroupWhenGroup'
  | 'selection.moveToPageWhenAvailable'

type CanvasMenuGroup = readonly CanvasMenuCommand[]

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
}

const EDIT_GROUP = ['selection.duplicate', 'selection.delete'] as const
const ZOOM_SELECTION_GROUP = ['view.zoomSelection'] as const
const ARRANGE_GROUP = [
  'selection.moveToPageWhenAvailable',
  'selection.bringForward',
  'selection.bringToFront',
  'selection.sendBackward',
  'selection.sendToBack'
] as const
const OBJECT_GROUP = [
  'selection.group',
  'selection.frameSelection',
  'selection.ungroupWhenGroup',
  'selection.wrapInAutoLayout',
  'selection.toggleMask',
  'selection.flatten',
  'selection.outlineText',
  'selection.outlineStroke'
] as const
const TEXT_OBJECT_GROUP = [
  'selection.outlineText',
  'selection.group',
  'selection.frameSelection',
  'selection.ungroupWhenGroup',
  'selection.wrapInAutoLayout'
] as const
const COMPONENT_GROUP = [
  'selection.componentAction',
  'selection.componentSetAction',
  'selection.instanceActions'
] as const
const VISIBILITY_GROUP = ['selection.toggleVisibility', 'selection.toggleLock'] as const
const FLIP_GROUP = ['selection.flipHorizontal', 'selection.flipVertical'] as const

function objectGroupFor(selection: SelectionState): CanvasMenuGroup {
  if (selection.selectedNodeType === 'TEXT') return TEXT_OBJECT_GROUP
  return OBJECT_GROUP
}

/** Layer tree includes zoom-to-selection; canvas does not. Node type can reorder groups later. */
export function contextMenuGroups(
  source: ContextMenuSource,
  selection: SelectionState
): readonly CanvasMenuGroup[] {
  const groups: CanvasMenuGroup[] = [EDIT_GROUP]
  if (source === 'layers') groups.push(ZOOM_SELECTION_GROUP)
  groups.push(
    ARRANGE_GROUP,
    objectGroupFor(selection),
    COMPONENT_GROUP,
    VISIBILITY_GROUP,
    FLIP_GROUP
  )
  return groups
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

function conditionalCommand(command: CanvasMenuCommand, options: CanvasMenuOptions): MenuEntry[] {
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
      return [options.commandMenuItem(command)]
  }
}

export function buildCanvasContextMenu(options: CanvasMenuOptions): MenuEntry[] {
  const entries: MenuEntry[] = []
  for (const group of contextMenuGroups(options.source ?? 'canvas', options.selection)) {
    const groupEntries = group.flatMap((command) => conditionalCommand(command, options))
    if (groupEntries.length === 0) continue
    if (entries.length > 0) entries.push(separator())
    entries.push(...groupEntries)
  }
  return entries
}
