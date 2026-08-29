import { Settings2 } from 'lucide-react'

import { IconButton } from '#react/components/ui/IconButton'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useEditor } from '#react/editor/context'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export function VariablesSection({ onOpenDialog }: { onOpenDialog: () => void }) {
  const editor = useEditor()
  const { panels } = useI18n()
  const collectionCount = useSceneComputed(() => editor.getCollectionCount())
  const variableCount = useSceneComputed(() => editor.getVariableCount())
  const hasVariables = variableCount > 0

  return (
    <PanelSection
      label={panels.variables}
      actions={
        <IconButton label={panels.openVariables} onClick={onOpenDialog}>
          <Settings2 className="size-3.5" />
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
}
