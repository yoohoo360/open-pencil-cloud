import {
  ArrowDownToLine,
  ArrowUpToLine,
  Clipboard,
  Copy,
  CopyPlus,
  Group,
  Lock,
  Scissors,
  Trash2,
  Ungroup
} from 'lucide-react'

import {
  copyEditorSelection,
  cutEditorSelection,
  pasteEditorClipboard
} from '#react/app/editor/clipboard'
import type { EditorStore } from '#react/app/editor/store'
import type { ToolbarActionItem } from '#react/components/Toolbar/types'
import type { useEditorCommands } from '#react/editor/commands/use'
import type { useI18n } from '#react/i18n'

type ToolbarActionOptions = {
  store: EditorStore
  getCommand: ReturnType<typeof useEditorCommands>['getCommand']
  menu: ReturnType<typeof useI18n>['menu']
}

export function useToolbarActions({ store, getCommand, menu }: ToolbarActionOptions) {
  const editActions: ToolbarActionItem[] = [
    { icon: Copy, label: menu.copy, action: () => void copyEditorSelection(store) },
    { icon: Clipboard, label: menu.paste, action: () => void pasteEditorClipboard(store) },
    { icon: Scissors, label: menu.cut, action: () => void cutEditorSelection(store) },
    {
      icon: CopyPlus,
      label: getCommand('selection.duplicate').label,
      action: () => getCommand('selection.duplicate').run()
    },
    {
      icon: Trash2,
      label: getCommand('selection.delete').label,
      action: () => getCommand('selection.delete').run()
    }
  ]

  const arrangeActions: ToolbarActionItem[] = [
    {
      icon: ArrowUpToLine,
      label: menu.front,
      action: () => getCommand('selection.bringToFront').run()
    },
    {
      icon: ArrowDownToLine,
      label: menu.back,
      action: () => getCommand('selection.sendToBack').run()
    },
    {
      icon: Group,
      label: getCommand('selection.group').label,
      action: () => getCommand('selection.group').run()
    },
    {
      icon: Ungroup,
      label: getCommand('selection.ungroup').label,
      action: () => getCommand('selection.ungroup').run()
    },
    {
      icon: Lock,
      label: menu.lock,
      action: () => getCommand('selection.toggleLock').run()
    }
  ]

  return { editActions, arrangeActions }
}
