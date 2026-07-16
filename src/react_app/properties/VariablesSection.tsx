import { Settings2 } from 'lucide-react'

import { sectionWrapper } from '@/react_app/ui/section'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { useEditor, useI18n, useSceneComputed } from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

type AppEditor = Editor & {
  getCollectionCount: () => number
  getVariableCount: () => number
}

export function VariablesSection({ onOpenDialog }: { onOpenDialog: () => void }) {
  const editor = useEditor() as AppEditor
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
    <TipProvider>
      <div data-test-id="variables-section" className={sectionWrapper()}>
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-surface">{panels.variables}</label>
          <Tip label={panels.openVariables}>
            <button
              type="button"
              data-test-id="variables-section-open"
              className="flex size-5 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
              onClick={onOpenDialog}
            >
              <Settings2 className="size-3.5" />
            </button>
          </Tip>
        </div>
        {hasVariables ? (
          <div className="mt-1 text-[11px] text-muted">
            {variableCount} / {collectionCount}
          </div>
        ) : (
          <div className="mt-1 text-[11px] text-muted">{panels.noLocalVariables}</div>
        )}
      </div>
    </TipProvider>
  )
}
