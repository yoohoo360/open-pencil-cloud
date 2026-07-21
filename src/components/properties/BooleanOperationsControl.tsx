import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconCombine from '~icons/lucide/combine'
import IconCopyMinus from '~icons/lucide/copy-minus'
import IconCopyX from '~icons/lucide/copy-x'
import IconListCollapse from '~icons/lucide/list-collapse'
import IconSquaresIntersect from '~icons/lucide/squares-intersect'
import { memo, type ComponentType } from 'react'

import {
  editorCommandMetadata,
  formatShortcut,
  useEditorCommands,
  useI18n,
  type EditorCommandId
} from '@open-pencil/react'
import Tip from '@/components/ui/Tip'
import { menuItem, useMenuUI } from '@/components/ui/menu'

const operations = [
  { id: 'selection.booleanUnion', icon: IconCombine },
  { id: 'selection.booleanSubtract', icon: IconCopyMinus },
  { id: 'selection.booleanIntersect', icon: IconSquaresIntersect },
  { id: 'selection.booleanExclude', icon: IconCopyX },
  { id: 'selection.flatten', icon: IconListCollapse }
] satisfies Array<{ id: EditorCommandId; icon: ComponentType<{ className?: string }> }>

export const BooleanOperationsControl = memo(function BooleanOperationsControl() {
  const { getCommand, runCommand } = useEditorCommands()
  const { commands } = useI18n()
  const menuCls = useMenuUI({ content: 'min-w-44' })
  const itemCls = menuItem({ justify: 'between' })

  return (
    <DropdownMenu.Root>
      <Tip label={commands.booleanOperations}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
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
          {operations.map((operation) => {
            const command = getCommand(operation.id)
            const Icon = operation.icon
            return (
              <DropdownMenu.Item
                key={operation.id}
                data-test-id={`boolean-operation-${operation.id.replace('selection.', '')}`}
                className={itemCls}
                disabled={!command.enabled}
                onSelect={() => runCommand(operation.id)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="size-3.5 shrink-0 text-muted" />
                  <span>{command.label}</span>
                </div>
                <span className="ml-6 text-[11px] text-muted">
                  {formatShortcut(editorCommandMetadata(operation.id).shortcut)}
                </span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
})

BooleanOperationsControl.displayName = 'BooleanOperationsControl'
export default BooleanOperationsControl
