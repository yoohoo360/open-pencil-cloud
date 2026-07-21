import type { EditorCommandId } from '#react/editor/commands/types'
import type { useEditorCommands } from '#react/editor/commands/use'
import {
  EDIT_MENU_COMMAND_GROUPS,
  OBJECT_MENU_COMMAND_GROUPS,
  VIEW_MENU_COMMANDS
} from '#react/editor/menu-model/command-groups'
import type { MenuEntry } from '#react/editor/menu-model/types'

type CommandMenuItem = ReturnType<typeof useEditorCommands>['menuItem']

function commandGroupEntries(
  commandMenuItem: CommandMenuItem,
  groups: ReadonlyArray<ReadonlyArray<EditorCommandId>>
): MenuEntry[] {
  const entries: MenuEntry[] = []
  for (const [index, group] of groups.entries()) {
    if (index > 0) entries.push({ separator: true })
    entries.push(...group.map((id) => commandMenuItem(id)))
  }
  return entries
}

export function buildEditMenu(commandMenuItem: CommandMenuItem): MenuEntry[] {
  return commandGroupEntries(commandMenuItem, EDIT_MENU_COMMAND_GROUPS)
}

export function buildViewMenu(commandMenuItem: CommandMenuItem): MenuEntry[] {
  return VIEW_MENU_COMMANDS.map((id) => commandMenuItem(id))
}

export function buildObjectMenu(commandMenuItem: CommandMenuItem): MenuEntry[] {
  return commandGroupEntries(commandMenuItem, OBJECT_MENU_COMMAND_GROUPS)
}
