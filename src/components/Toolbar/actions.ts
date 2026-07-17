import IconArrowDownToLine from '~icons/lucide/arrow-down-to-line'
import IconArrowUpToLine from '~icons/lucide/arrow-up-to-line'
import IconClipboard from '~icons/lucide/clipboard'
import IconCopy from '~icons/lucide/copy'
import IconCopyPlus from '~icons/lucide/copy-plus'
import IconGroup from '~icons/lucide/group'
import IconLock from '~icons/lucide/lock'
import IconScissors from '~icons/lucide/scissors'
import IconTrash2 from '~icons/lucide/trash-2'
import IconUngroup from '~icons/lucide/ungroup'

import type { useEditorCommands } from '@open-pencil/react'

import type { EditorStore } from '@/app/editor/active-store'
import type { ToolbarActionItem } from '@/components/Toolbar/types'

type ToolbarActionOptions = {
  store: EditorStore
  getCommand: ReturnType<typeof useEditorCommands>['getCommand']
  menu: { copy: string; paste: string; cut: string; front: string; back: string; lock: string }
}

export function createToolbarActions({ store, getCommand, menu }: ToolbarActionOptions) {
  const editActions: ToolbarActionItem[] = [
    { icon: IconCopy, label: menu.copy, action: () => void store.mobileCopy() },
    { icon: IconClipboard, label: menu.paste, action: () => store.mobilePaste() },
    { icon: IconScissors, label: menu.cut, action: () => void store.mobileCut() },
    {
      icon: IconCopyPlus,
      label: getCommand('selection.duplicate').label,
      action: () => getCommand('selection.duplicate').run()
    },
    {
      icon: IconTrash2,
      label: getCommand('selection.delete').label,
      action: () => getCommand('selection.delete').run()
    }
  ]

  const arrangeActions: ToolbarActionItem[] = [
    {
      icon: IconArrowUpToLine,
      label: menu.front,
      action: () => getCommand('selection.bringToFront').run()
    },
    {
      icon: IconArrowDownToLine,
      label: menu.back,
      action: () => getCommand('selection.sendToBack').run()
    },
    {
      icon: IconGroup,
      label: getCommand('selection.group').label,
      action: () => getCommand('selection.group').run()
    },
    {
      icon: IconUngroup,
      label: getCommand('selection.ungroup').label,
      action: () => getCommand('selection.ungroup').run()
    },
    {
      icon: IconLock,
      label: menu.lock,
      action: () => getCommand('selection.toggleLock').run()
    }
  ]

  return { editActions, arrangeActions }
}
