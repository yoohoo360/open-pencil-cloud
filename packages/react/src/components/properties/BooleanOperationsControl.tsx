import { Combine, CopyMinus, CopyX, Layers, ListCollapse } from 'lucide-react'

import { IconButton } from '#react/components/ui/IconButton'
import { useEditorCommands } from '#react/editor/commands/use'
import type { EditorCommandId } from '#react/editor/commands/types'

const OPERATIONS: { id: EditorCommandId; icon: typeof Combine }[] = [
  { id: 'selection.booleanUnion', icon: Combine },
  { id: 'selection.booleanSubtract', icon: CopyMinus },
  { id: 'selection.booleanIntersect', icon: Layers },
  { id: 'selection.booleanExclude', icon: CopyX },
  { id: 'selection.flatten', icon: ListCollapse }
]

export function BooleanOperationsControl() {
  const { getCommand, runCommand } = useEditorCommands()
  return (
    <div className="flex items-center gap-0.5">
      {OPERATIONS.map((operation) => {
        const command = getCommand(operation.id)
        const Icon = operation.icon
        return (
          <IconButton
            key={operation.id}
            label={command.label}
            disabled={!command.enabled}
            onClick={() => runCommand(operation.id)}
          >
            <Icon className="size-3.5" />
          </IconButton>
        )
      })}
    </div>
  )
}
