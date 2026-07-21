import IconLucideSettings2 from '~icons/lucide/settings-2'
import { memo } from 'react'

import { useI18n, useSceneComputed } from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'

export type VariablesSectionProps = {
  onOpenDialog: () => void
}

export const VariablesSection = memo(function VariablesSection({ onOpenDialog }: VariablesSectionProps) {
  const editor = useEditorStore()
  const collectionCount = useSceneComputed(() => {
    void editor.state.sceneVersion
    return editor.getCollectionCount()
  })
  const variableCount = useSceneComputed(() => {
    void editor.state.sceneVersion
    return editor.getVariableCount()
  })
  const hasVariables = variableCount > 0
  const { panels } = useI18n()

  return (
    <PanelSection
      label={panels.variables}
      empty={!hasVariables}
      actions={
        <IconButton label={panels.openVariables} onClick={onOpenDialog}>
          <IconLucideSettings2 className="size-3.5" />
        </IconButton>
      }
    >
      {hasVariables ? (
        <div className="mt-1 text-[11px] text-muted">
          {variableCount} / {collectionCount}
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-muted">{panels.noLocalVariables}</div>
      )}
    </PanelSection>
  )
})

VariablesSection.displayName = 'VariablesSection'
export default VariablesSection
