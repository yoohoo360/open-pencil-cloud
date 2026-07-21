import IconLucideShapes from '~icons/lucide/shapes'
import { memo } from 'react'

import { useEditorCommands } from '@open-pencil/react'
import BooleanOperationsControl from '@/components/properties/BooleanOperationsControl'
import IconButton from '@/components/ui/IconButton'

export type SelectionActionsControlProps = {
  showBooleanOperations?: boolean
}

export const SelectionActionsControl = memo(function SelectionActionsControl({
  showBooleanOperations = false
}: SelectionActionsControlProps) {
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
        <IconLucideShapes className="size-3.5" />
      </IconButton>
      {showBooleanOperations ? <BooleanOperationsControl /> : null}
    </div>
  )
})

SelectionActionsControl.displayName = 'SelectionActionsControl'
export default SelectionActionsControl
