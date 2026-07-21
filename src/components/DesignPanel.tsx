import IconLucideLayers3 from '~icons/lucide/layers-3'
import { memo, useMemo, useState } from 'react'

import { useEditorCommands, useI18n, useSelectionState } from '@open-pencil/react'
import { COMPONENT_TYPES, nodeIcon } from '@/app/editor/icons'
import PanelHeader from '@/components/ui/panel/PanelHeader'
import Tip from '@/components/ui/Tip'
import VariablesDialog from '@/components/variables/VariablesDialog'
import AppearanceSection from '@/components/properties/AppearanceSection'
import ComponentPropertiesSection from '@/components/properties/component-properties/ComponentPropertiesSection'
import ConstraintsSection from '@/components/properties/constraints/ConstraintsSection'
import EffectsSection from '@/components/properties/EffectsSection'
import ExportSection from '@/components/properties/ExportSection'
import FillSection from '@/components/properties/FillSection'
import LayoutSection from '@/components/properties/LayoutSection/LayoutSection'
import MaskSection from '@/components/properties/MaskSection'
import PageSection from '@/components/properties/PageSection'
import PositionSection from '@/components/properties/PositionSection'
import SelectionActionsControl from '@/components/properties/SelectionActionsControl'
import StrokeSection from '@/components/properties/StrokeSection'
import TypographySection from '@/components/properties/TypographySection'
import VariablesSection from '@/components/properties/VariablesSection'

export const DesignPanel = memo(function DesignPanel() {
  const [variablesOpen, setVariablesOpen] = useState(false)
  const { selectedNode: node, selectedCount: multiCount } = useSelectionState()
  const showBooleanOperations = multiCount >= 2
  const { getCommand } = useEditorCommands()
  const goToMainComponent = getCommand('selection.goToMainComponent')
  const detachInstance = getCommand('selection.detachInstance')
  const isComponentType = useMemo(() => {
    const type = node?.type
    return type ? COMPONENT_TYPES.has(type) : false
  }, [node?.type])
  const SelectedIcon = useMemo(() => (node ? nodeIcon(node) : undefined), [node])
  const { panels } = useI18n()

  if (multiCount > 1) {
    return (
      <>
        <div
          data-test-id="design-panel-multi"
          className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
        >
          <PanelHeader
            icon={<IconLucideLayers3 className="size-3.5" aria-hidden="true" />}
            actions={<SelectionActionsControl showBooleanOperations={showBooleanOperations} />}
          >
            <span role="heading" aria-level={2}>
              {panels.layersCount({ count: String(multiCount) })}
            </span>
          </PanelHeader>
          <ComponentPropertiesSection />
          <PositionSection />
          <ConstraintsSection />
          <AppearanceSection />
          <FillSection />
          <StrokeSection />
          <EffectsSection />
          <ExportSection />
        </div>
        <VariablesDialog open={variablesOpen} onOpenChange={setVariablesOpen} />
      </>
    )
  }

  if (node) {
    return (
      <>
        <div
          data-test-id="design-panel-single"
          className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
        >
          <PanelHeader
            component={isComponentType}
            icon={
              SelectedIcon ? (
                <Tip label={node.type}>
                  <span role="img" aria-label={node.type} className="contents">
                    <SelectedIcon className="size-3.5" />
                  </span>
                </Tip>
              ) : null
            }
            actions={<SelectionActionsControl />}
          >
            <span role="heading" aria-level={2}>
              {node.name}
            </span>
          </PanelHeader>

          {node.type === 'INSTANCE' ? (
            <div className="flex flex-col gap-1 border-b border-border px-3 py-2">
              <button
                type="button"
                className="rounded bg-component/10 px-2 py-1 text-left text-[11px] text-component hover:bg-component/20"
                onClick={() => goToMainComponent.run()}
              >
                {panels.goToMainComponent}
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-left text-[11px] text-muted hover:bg-hover"
                onClick={() => detachInstance.run()}
              >
                {panels.detachInstance}
              </button>
            </div>
          ) : null}

          {node.type === 'INSTANCE' ? <ComponentPropertiesSection /> : null}
          <PositionSection />
          <ConstraintsSection />
          <LayoutSection />
          <AppearanceSection />
          <MaskSection />
          {node.type === 'TEXT' ? <TypographySection /> : null}
          <FillSection />
          <StrokeSection />
          <EffectsSection />
          <ExportSection />
        </div>
        <VariablesDialog open={variablesOpen} onOpenChange={setVariablesOpen} />
      </>
    )
  }

  return (
    <>
      <div
        data-test-id="design-panel-empty"
        className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
      >
        <PageSection />
        <VariablesSection onOpenDialog={() => setVariablesOpen(true)} />
        <ExportSection />
      </div>
      <VariablesDialog open={variablesOpen} onOpenChange={setVariablesOpen} />
    </>
  )
})

DesignPanel.displayName = 'DesignPanel'
export default DesignPanel
