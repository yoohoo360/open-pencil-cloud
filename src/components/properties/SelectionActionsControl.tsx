import IconShapes from '~icons/lucide/shapes'

import { useEditorCommands } from '@open-pencil/react'

import { BooleanOperationsControl } from '@/components/properties/BooleanOperationsControl'
import { IconButton } from '@/components/ui/IconButton'

interface SelectionActionsControlProps {
  showBooleanOperations?: boolean
}

export function SelectionActionsControl({ showBooleanOperations = false }: SelectionActionsControlProps) {
  const { getCommand, runCommand } = useEditorCommands()
  const maskCommand = getCommand('selection.toggleMask')

  return (
    <div className="ml-auto flex items-center gap-1">
      <IconButton
        label={maskCommand.label}
        disabled={!maskCommand.enabled.value}
        data-test-id="selection-toggle-mask"
        onClick={() => runCommand('selection.toggleMask')}
      >
        <IconShapes className="size-3.5" />
      </IconButton>
      {showBooleanOperations && <BooleanOperationsControl />}
    </div>
  )
}
