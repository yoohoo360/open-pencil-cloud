import { useSelectionState, useI18n } from '@open-pencil/react'

export default function DesignPanel() {
  const { selectedNode: node, selectedCount: multiCount } = useSelectionState()
  const { panels } = useI18n()

  const nodeVal = node.value
  const count = multiCount.value

  return (
    <div className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto">
      {/* Properties panels will be rendered here */}
      {!nodeVal && count === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-xs text-muted">
          {panels.noSelection ?? 'Select a layer to edit its properties'}
        </div>
      )}
    </div>
  )
}
