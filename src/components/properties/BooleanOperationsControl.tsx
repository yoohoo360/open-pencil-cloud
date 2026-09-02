import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

import IconChevronDown from '~icons/lucide/chevron-down'
import IconCombine from '~icons/lucide/combine'
import IconCopyMinus from '~icons/lucide/copy-minus'
import IconCopyX from '~icons/lucide/copy-x'
import IconListCollapse from '~icons/lucide/list-collapse'
import IconSquaresIntersect from '~icons/lucide/squares-intersect'
import type { ComponentType } from 'react'

import { editorCommandMetadata, formatShortcut, useEditorCommands, useI18n } from '@open-pencil/react'
import type { EditorCommandId } from '@open-pencil/react'

import { Tip } from '@/components/ui/Tip'
import { menuItem, useMenuUI } from '@/components/ui/menu'

const operations: Array<{ id: EditorCommandId; icon: ComponentType<{ className?: string }> }> = [
  { id: 'selection.booleanUnion', icon: IconCombine },
  { id: 'selection.booleanSubtract', icon: IconCopyMinus },
  { id: 'selection.booleanIntersect', icon: IconSquaresIntersect },
  { id: 'selection.booleanExclude', icon: IconCopyX },
  { id: 'selection.flatten', icon: IconListCollapse }
]

export function BooleanOperationsControl() {
  const { getCommand, runCommand } = useEditorCommands()
  const { commands } = useI18n()
  const menuCls = useMenuUI({ content: 'min-w-44' })
  const itemCls = menuItem({ justify: 'between' })

  return (
    <DropdownMenu.Root>
      <Tip label={commands.booleanOperations}>
        <DropdownMenu.Trigger asChild>
          <button
            data-test-id="boolean-operations-trigger"
            className="flex h-7 items-center gap-1 rounded-md px-1.5 text-muted hover:bg-hover hover:text-surface data-[state=open]:bg-active data-[state=open]:text-surface"
          >
            <IconCombine className="size-4" />
            <IconChevronDown className="size-3" />
          </button>
        </DropdownMenu.Trigger>
      </Tip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" side="bottom" sideOffset={4} className={menuCls.content}>
          {operations.map((op) => {
            const cmd = getCommand(op.id)
            const meta = editorCommandMetadata(op.id)
            return (
              <DropdownMenu.Item
                key={op.id}
                data-test-id={`boolean-operation-${op.id.replace('selection.', '')}`}
                className={itemCls}
                disabled={!cmd.enabled.value}
                onSelect={() => runCommand(op.id)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <op.icon className="size-3.5 shrink-0 text-muted" />
                  <span>{cmd.label}</span>
                </div>
                <span className="ml-6 text-[11px] text-muted">
                  {formatShortcut(meta.shortcut)}
                </span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
