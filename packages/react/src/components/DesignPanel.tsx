import { COMPONENT_TYPES, nodeIcon } from '#react/app/editor/icons'
import { useEditorStore } from '#react/app/editor/store'
import { AppearanceSection } from '#react/components/properties/AppearanceSection'
import { BehaviourPanel } from '#react/components/properties/component-properties/BehaviourPanel'
import { ComponentPropertiesSection } from '#react/components/properties/component-properties/ComponentPropertiesSection'
import { SlotAuthoringSection } from '#react/components/properties/component-properties/SlotAuthoringSection'
import { VariantAuthoringSection } from '#react/components/properties/component-properties/VariantAuthoringSection'
import { ConstraintsSection } from '#react/components/properties/constraints/ConstraintsSection'
import { EffectsSection } from '#react/components/properties/EffectsSection'
import { ExportSection } from '#react/components/properties/ExportSection'
import { FillSection } from '#react/components/properties/FillSection'
import { FramePresetSelect } from '#react/components/properties/frame-presets/FramePresetSelect'
import { FramePresetsSection } from '#react/components/properties/FramePresetsSection'
import { LayoutGridSection } from '#react/components/properties/LayoutSection/LayoutGridSection'
import { LayoutSection } from '#react/components/properties/LayoutSection/LayoutSection'
import { MaskSection } from '#react/components/properties/MaskSection'
import { PageSection } from '#react/components/properties/PageSection'
import { PositionSection } from '#react/components/properties/PositionSection'
import { SelectionActionsControl } from '#react/components/properties/SelectionActionsControl'
import { SelectionColorsSection } from '#react/components/properties/SelectionColorsSection'
import { StylesDialog } from '#react/components/properties/shared-style/StylesDialog'
import { StylesSection } from '#react/components/properties/shared-style/StylesSection'
import { StrokeSection } from '#react/components/properties/StrokeSection'
import { TypographyContentField } from '#react/components/properties/TypographyContentField'
import { TypographySection } from '#react/components/properties/TypographySection'
import { VariablesDialog } from '#react/components/properties/variables/VariablesDialog'
import { VariablesSection } from '#react/components/properties/VariablesSection'
import { PanelHeader } from '#react/components/ui/panel/PanelHeader'
import { Tip } from '#react/components/ui/Tip'
import { useEditorCommands } from '#react/editor/commands/use'
import { useSelectionState } from '#react/editor/selection-state/use'
import {
  enclosingHostedInstance,
  HostedComponentPanel,
  hostedPanelChrome,
  isHostedDescendant,
  isHostedTextLayer
} from '#react/hosted-components'
import type {
  HostedDesignSectionId,
  HostedPanelChrome
} from '#react/hosted-components'
import { useI18n } from '#react/i18n'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import { Layers3 } from 'lucide-react'
import { useState } from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'

function designSectionVisible(chrome: HostedPanelChrome, id: HostedDesignSectionId): boolean {
  if (chrome.hideStandardDesignSections) return false
  if (chrome.designSections) return chrome.designSections.includes(id)
  return true
}

function DesignNodeText({ selectedNode }: { selectedNode: SceneNode }) {
  const store = useEditorStore()
  const chrome = hostedPanelChrome(store.graph, selectedNode.id)
  const hosted = enclosingHostedInstance(store.graph, selectedNode.id)
  const showPlain =
    selectedNode.type === 'TEXT' &&
    !isHostedTextLayer(store.graph, selectedNode) &&
    !chrome.hidePlainTypographyContent
  return (
    <>
      {showPlain ? (
        <TypographyContentField nodeId={selectedNode.id} text={selectedNode.text} />
      ) : null}
      {hosted ? <HostedComponentPanel /> : null}
    </>
  )
}

export function DesignPanel() {
  const store = useEditorStore()
  const { selectedNode, selectedCount } = useSelectionState()
  const { getCommand } = useEditorCommands()
  const { panels } = useI18n()
  const [variablesOpen, setVariablesOpen] = useState(false)
  const [stylesOpen, setStylesOpen] = useState(false)
  const scrollRef = useOverlayScrollbar<HTMLDivElement>()
  const activeTool = store.state.activeTool
  const goToMainComponent = getCommand('selection.goToMainComponent')
  const detachInstance = getCommand('selection.detachInstance')
  const isComponentType = selectedNode ? COMPONENT_TYPES.has(selectedNode.type) : false
  const SelectedIcon = selectedNode ? nodeIcon(selectedNode) : null
  const supportsLayoutGuides =
    selectedNode?.type === 'FRAME' ||
    selectedNode?.type === 'COMPONENT' ||
    selectedNode?.type === 'COMPONENT_SET' ||
    selectedNode?.type === 'INSTANCE'
  const showVariantAuthoring =
    selectedNode?.type === 'COMPONENT_SET' ||
    (selectedNode?.type === 'COMPONENT' &&
      selectedNode.parentId &&
      store.graph.getNode(selectedNode.parentId)?.type === 'COMPONENT_SET')

  if (activeTool === 'FRAME') {
    return (
      <div data-test-id="design-panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="scrollbar-overlay flex-1 overflow-x-hidden overflow-y-auto pb-4"
        >
          <FramePresetsSection />
        </div>
      </div>
    )
  }

  if (selectedCount > 1) {
    return (
      <div data-test-id="design-panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          data-test-id="design-panel-multi"
          ref={scrollRef}
          className="scrollbar-overlay flex-1 overflow-x-hidden overflow-y-auto pb-4"
        >
          <PanelHeader
            icon={<Layers3 className="size-3.5" aria-hidden="true" />}
            actions={<SelectionActionsControl showBooleanOperations />}
          >
            <span role="heading" aria-level={2}>
              {panels.layersCount({ count: String(selectedCount) })}
            </span>
          </PanelHeader>
          <ComponentPropertiesSection />
          <PositionSection />
          <ConstraintsSection />
          <AppearanceSection />
          <FillSection />
          <StrokeSection />
          <SelectionColorsSection />
          <EffectsSection />
          <ExportSection />
        </div>
      </div>
    )
  }

  if (selectedNode) {
    const chrome = hostedPanelChrome(store.graph, selectedNode.id)
    const hostedDescendant = isHostedDescendant(store.graph, selectedNode)
    const showInstanceActions =
      selectedNode.type === 'INSTANCE' && !chrome.hideInstanceActions
    const showDesign = (id: Parameters<typeof designSectionVisible>[1]) =>
      !hostedDescendant && designSectionVisible(chrome, id)

    return (
      <div data-test-id="design-panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          data-test-id="design-panel-single"
          ref={scrollRef}
          className="scrollbar-overlay flex-1 overflow-x-hidden overflow-y-auto pb-4"
        >
          <PanelHeader
            component={isComponentType}
            icon={
              SelectedIcon ? (
                <Tip label={selectedNode.type}>
                  <span role="img" aria-label={selectedNode.type} className="contents">
                    <SelectedIcon className="size-3.5" />
                  </span>
                </Tip>
              ) : null
            }
            actions={<SelectionActionsControl />}
          >
            <span role="heading" aria-level={2}>
              {selectedNode.name}
            </span>
          </PanelHeader>
          <DesignNodeText selectedNode={selectedNode} />
          {showInstanceActions ? (
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
          {selectedNode.type === 'INSTANCE' && !chrome.hideComponentProperties ? (
            <ComponentPropertiesSection />
          ) : null}
          {showVariantAuthoring ? <VariantAuthoringSection /> : null}
          <SlotAuthoringSection />
          {selectedNode.type === 'COMPONENT' || selectedNode.type === 'COMPONENT_SET' ? (
            <BehaviourPanel />
          ) : null}
          {selectedNode.type === 'FRAME' ? <FramePresetSelect /> : null}
          {showDesign('position') ? <PositionSection /> : null}
          {showDesign('constraints') ? <ConstraintsSection /> : null}
          {showDesign('layout') ? <LayoutSection /> : null}
          {showDesign('appearance') ? <AppearanceSection /> : null}
          {showDesign('mask') ? <MaskSection /> : null}
          {showDesign('typography') && selectedNode.type === 'TEXT' ? <TypographySection /> : null}
          {showDesign('fill') ? <FillSection /> : null}
          {showDesign('stroke') ? <StrokeSection /> : null}
          {showDesign('selectionColors') ? <SelectionColorsSection /> : null}
          {showDesign('layoutGrid') && supportsLayoutGuides ? <LayoutGridSection /> : null}
          {showDesign('effects') ? <EffectsSection /> : null}
          {showDesign('export') ? <ExportSection /> : null}
        </div>
      </div>
    )
  }

  return (
    <div data-test-id="design-panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        data-test-id="design-panel-empty"
        ref={scrollRef}
        className="scrollbar-overlay flex-1 overflow-x-hidden overflow-y-auto pb-4"
      >
        <PageSection />
        <VariablesSection onOpenDialog={() => setVariablesOpen(true)} />
        <StylesSection onOpenDialog={() => setStylesOpen(true)} />
        <ExportSection />
      </div>
      <VariablesDialog open={variablesOpen} onClose={() => setVariablesOpen(false)} />
      <StylesDialog open={stylesOpen} onClose={() => setStylesOpen(false)} />
    </div>
  )
}
