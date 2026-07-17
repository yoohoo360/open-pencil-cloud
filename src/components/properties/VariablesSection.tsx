import { useI18n, useSceneComputed } from '@open-pencil/react'

import { IconButton } from '@/components/ui/IconButton'
import { PanelSection } from '@/components/ui/panel/PanelSection'
import { useEditorStore } from '@/app/editor/active-store'

interface VariablesSectionProps {
  onOpenDialog?: () => void
}

export function VariablesSection({ onOpenDialog }: VariablesSectionProps) {
  const editor = useEditorStore()
  const { panels } = useI18n()

  const collectionCount = useSceneComputed(() => {
    void editor.state.sceneVersion
    return editor.getCollectionCount()
  })

  const variableCount = useSceneComputed(() => {
    void editor.state.sceneVersion
    return editor.getVariableCount()
  })

  const hasVariables = variableCount.value > 0

  return (
    <PanelSection
      label={panels.variables}
      data-test-id="variables-section"
      actions={
        <IconButton
          label={panels.openVariables}
          data-test-id="variables-section-open"
          onClick={onOpenDialog}
        >
          <span className="lucide-settings-2 size-3.5" />
        </IconButton>
      }
    >
      {hasVariables ? (
        <div className="mt-1 text-[11px] text-muted">
          {variableCount.value} / {collectionCount.value}
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-muted">{panels.noLocalVariables}</div>
      )}
    </PanelSection>
  )
}
