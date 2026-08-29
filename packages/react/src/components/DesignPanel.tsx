import { useSelectionState } from '#react/editor/selection-state/use'
import { useI18n } from '#react/i18n'
import { nodeIcon } from '#react/app/editor/icons'

export function DesignPanel() {
  const { selectedNode, selectedCount } = useSelectionState()
  const { panels } = useI18n()
  const Icon = selectedNode ? nodeIcon(selectedNode) : null

  return (
    <div data-test-id="design-panel" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {Icon ? <Icon className="size-3.5 text-muted" /> : null}
        <span className="truncate text-[11px] font-semibold text-surface">
          {selectedNode?.name ?? panels.design}
        </span>
        {selectedCount > 1 ? (
          <span className="text-[11px] text-muted">{selectedCount}</span>
        ) : null}
      </div>
    </div>
  )
}
