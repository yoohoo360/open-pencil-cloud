import { Shapes } from 'lucide-react'

import { BooleanOperationsControl } from '#react/components/properties/BooleanOperationsControl'
import { IconButton } from '#react/components/ui/IconButton'
import { useEditorCommands } from '#react/editor/commands/use'

export function SelectionActionsControl({
  showBooleanOperations = false
}: {
  showBooleanOperations?: boolean
}) {
  const { getCommand, runCommand } = useEditorCommands()
  const maskCommand = getCommand('selection.toggleMask')
  return (
    <div className="ml-auto flex items-center gap-1">
      <IconButton
        label={maskCommand.label}
        disabled={!maskCommand.enabled}
        data-test-id="selection-toggle-mask"
        onClick={() => runCommand('selection.toggleMask')}
      >
        <Shapes className="size-3.5" />
      </IconButton>
      {showBooleanOperations ? <BooleanOperationsControl /> : null}
    </div>
  )
}
