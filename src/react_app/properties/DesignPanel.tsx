import { useState } from 'react'

import { AppearanceSection } from '@/react_app/properties/AppearanceSection'
import { EffectsSection } from '@/react_app/properties/EffectsSection'
import { ExportSection } from '@/react_app/properties/ExportSection'
import { FillSection } from '@/react_app/properties/FillSection'
import { LayoutSection } from '@/react_app/properties/LayoutSection'
import { PageSection } from '@/react_app/properties/PageSection'
import { PositionSection } from '@/react_app/properties/PositionSection'
import { StrokeSection } from '@/react_app/properties/StrokeSection'
import { TypographySection } from '@/react_app/properties/TypographySection'
import { VariablesDialog } from '@/react_app/properties/VariablesDialog'
import { VariablesSection } from '@/react_app/properties/VariablesSection'
import { useEditorCommands, useI18n, useSelectionState } from '@open-pencil/react'

export function DesignPanel() {
  const [variablesOpen, setVariablesOpen] = useState(false)
  const { selectedNode: node, selectedCount: multiCount } = useSelectionState()
  const { getCommand } = useEditorCommands()
  const goToMainComponent = getCommand('selection.goToMainComponent')
  const detachInstance = getCommand('selection.detachInstance')
  const isComponentType =
    node?.type === 'COMPONENT' || node?.type === 'COMPONENT_SET' || node?.type === 'INSTANCE'
  const { panels } = useI18n()

  return (
    <>
      {multiCount > 1 ? (
        <div
          data-test-id="design-panel-multi"
          className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
        >
          <div
            data-test-id="design-multi-header"
            className="flex items-center gap-1.5 border-b border-border px-3 py-2"
          >
            <span className="text-[11px] text-muted">{panels.mixed}</span>
            <span className="text-xs font-semibold">
              {panels.layersCount({ count: String(multiCount) })}
            </span>
          </div>
          <PositionSection />
          <AppearanceSection />
          <FillSection />
          <StrokeSection />
          <EffectsSection />
        </div>
      ) : node ? (
        <div
          data-test-id="design-panel-single"
          className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
        >
          <div
            data-test-id="design-node-header"
            className="flex items-center gap-1.5 border-b border-border px-3 py-2"
          >
            <span className={`text-[11px] ${isComponentType ? 'text-component' : 'text-muted'}`}>
              {node.type}
            </span>
            <span className="text-xs font-semibold">{node.name}</span>
          </div>

          {node.type === 'INSTANCE' ? (
            <div className="flex flex-col gap-1 border-b border-border px-3 py-2">
              <button
                type="button"
                data-test-id="design-go-to-component"
                className="rounded bg-component/10 px-2 py-1 text-left text-[11px] text-component hover:bg-component/20"
                onClick={() => goToMainComponent.run()}
              >
                {panels.goToMainComponent}
              </button>
              <button
                type="button"
                data-test-id="design-detach-instance"
                className="rounded px-2 py-1 text-left text-[11px] text-muted hover:bg-hover"
                onClick={() => detachInstance.run()}
              >
                {panels.detachInstance}
              </button>
            </div>
          ) : null}

          <PositionSection />
          <LayoutSection />
          <AppearanceSection />
          {node.type === 'TEXT' ? <TypographySection /> : null}
          <FillSection />
          <StrokeSection />
          <EffectsSection />
          <ExportSection />
        </div>
      ) : (
        <div
          data-test-id="design-panel-empty"
          className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
        >
          <PageSection />
          <VariablesSection onOpenDialog={() => setVariablesOpen(true)} />
          <ExportSection />
        </div>
      )}

      <VariablesDialog open={variablesOpen} onOpenChange={setVariablesOpen} />
    </>
  )
}
