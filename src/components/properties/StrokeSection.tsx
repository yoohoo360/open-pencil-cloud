import { useState } from 'react'

import IconPlus from '~icons/lucide/plus'
import IconLayoutGrid from '~icons/lucide/layout-grid'
import IconMinus from '~icons/lucide/minus'

import { applySolidStrokeColor, useColorVariableBinding, useStrokeControls, useOkHCL, useI18n } from '@open-pencil/react'
import type { PropertyListRootSlotProps } from '@open-pencil/react'

import { ColorStyleRow } from '@/components/properties/ColorStyleRow'
import { PropertyListRoot } from '@/components/properties/PropertyListRoot'
import { boundVariableColor } from '@/components/properties/color-style-row'
import { AppSelect } from '@/components/ui/AppSelect'
import { ColorInput } from '@/components/ColorPicker/ColorInput'
import { NumberField } from '@/components/inputs/NumberField'
import { IconButton } from '@/components/ui/IconButton'
import { PanelSection } from '@/components/ui/panel/PanelSection'
import { Tip } from '@/components/ui/Tip'

import type { Color, SceneNode, Stroke } from '@open-pencil/scene-graph'

interface StrokeItemRowProps {
  stroke: Stroke
  index: number
  activeNode: SceneNode | null | undefined
  strokeVarCtx: ReturnType<typeof useColorVariableBinding>
  okhcl: ReturnType<typeof useOkHCL>
  panels: { removeStroke: string }
  onPatch: (changes: Record<string, unknown>) => void
  onToggleVisibility: () => void
  onRemove: () => void
  onUpdate: (color: Color) => void
}

function StrokeItemRow({ stroke, index, activeNode, strokeVarCtx, okhcl, panels, onPatch, onToggleVisibility, onRemove, onUpdate }: StrokeItemRowProps) {
  const color = activeNode
    ? (boundVariableColor(strokeVarCtx, activeNode.id, index) ?? stroke.color)
    : stroke.color
  const okhclProps = activeNode
    ? {
        fieldFormat: okhcl.getFieldFormat(activeNode, index, 'stroke'),
        fieldOptions: okhcl.fieldOptions,
        okhcl: okhcl.getStrokeOkHCLColor(activeNode, index),
        ...okhcl.getStrokePreviewInfo(activeNode, index),
        setFieldFormat: (event: Parameters<typeof okhcl.setStrokeFieldFormat>[2]) => okhcl.setStrokeFieldFormat(activeNode, index, event),
        updateOkHCL: (event: Parameters<typeof okhcl.updateStrokeOkHCL>[2]) => okhcl.updateStrokeOkHCL(activeNode, index, event)
      }
    : null
  return (
    <ColorStyleRow
      item={stroke}
      index={index}
      activeNodeId={activeNode?.id ?? null}
      bindingApi={strokeVarCtx}
      variableColor={stroke.color}
      data-test-id="stroke-item"
      data-test-index={index}
      removeLabel={panels.removeStroke}
      onPatch={onPatch}
      onToggleVisibility={onToggleVisibility}
      onRemove={onRemove}
    >
      <ColorInput
        className="min-w-0 flex-1"
        color={color}
        okhcl={okhclProps}
        editable
        onUpdate={onUpdate}
      />
    </ColorStyleRow>
  )
}

export function StrokeSection() {
  const strokeCtx = useStrokeControls()
  const strokeVarCtx = useColorVariableBinding('strokes')
  const okhcl = useOkHCL()
  const { panels } = useI18n()
  const [expandedSides, setExpandedSides] = useState(false)

  function updateStrokeColor(
    activeNode: SceneNode | null | undefined,
    index: number,
    color: Color,
    patch: (index: number, changes: Record<string, unknown>) => void
  ) {
    if (activeNode && strokeVarCtx.getBoundVariable(activeNode.id, index)) {
      strokeVarCtx.unbindVariable(activeNode.id, index)
    }
    patch(index, applySolidStrokeColor(color))
  }

  function onToggleSides(activeNode: SceneNode | null) {
    if (!activeNode) return
    const next = !expandedSides
    setExpandedSides(next)
    if (next && !activeNode.independentStrokeWeights) {
      const weight = activeNode.strokes[0]?.weight ?? 1
      strokeCtx.selectSide('CUSTOM', {
        ...activeNode,
        borderTopWeight: weight,
        borderRightWeight: weight,
        borderBottomWeight: weight,
        borderLeftWeight: weight
      })
    } else if (!next && activeNode.independentStrokeWeights) {
      strokeCtx.selectSide('ALL', activeNode)
    }
  }

  return (
    <PropertyListRoot propKey="strokes" label={panels.stroke}>
      {(slot) => (
        <StrokeSectionContent
          slot={slot}
          panels={panels}
          strokeCtx={strokeCtx}
          strokeVarCtx={strokeVarCtx}
          okhcl={okhcl}
          expandedSides={expandedSides}
          onToggleSides={onToggleSides}
          updateStrokeColor={updateStrokeColor}
        />
      )}
    </PropertyListRoot>
  )
}

type StrokeSlot = PropertyListRootSlotProps<'strokes'> & { isMulti: boolean; activeNode: SceneNode | null }

interface StrokeSectionContentProps {
  slot: StrokeSlot
  panels: ReturnType<typeof useI18n>['panels']
  strokeCtx: ReturnType<typeof useStrokeControls>
  strokeVarCtx: ReturnType<typeof useColorVariableBinding>
  okhcl: ReturnType<typeof useOkHCL>
  expandedSides: boolean
  onToggleSides: (activeNode: SceneNode | null) => void
  updateStrokeColor: (activeNode: SceneNode | null | undefined, index: number, color: Color, patch: (index: number, changes: Record<string, unknown>) => void) => void
}

interface StrokeControlsProps {
  stroke: Stroke
  activeNode: SceneNode | null | undefined
  strokeCtx: ReturnType<typeof useStrokeControls>
  panels: { strokeType: string; strokeWeight: string; strokeSides: string; strokeDash: string }
  expandedSides: boolean
  onToggleSides: (activeNode: SceneNode | null) => void
  onPatch: (changes: Record<string, unknown>) => void
}

function StrokeControls({ stroke, activeNode, strokeCtx, panels, expandedSides, onToggleSides, onPatch }: StrokeControlsProps) {
  const dashState = strokeCtx.dashState(stroke)
  return (
    <>
      <div className="mt-1 flex items-center gap-1.5">
        <AppSelect
          className="w-[72px]"
          label={panels.strokeType}
          value={strokeCtx.currentAlign(activeNode ?? null)}
          options={strokeCtx.alignOptions}
          onChange={(v) => strokeCtx.updateAlign(v, activeNode ?? null)}
        />
        <Tip label={panels.strokeWeight}>
          {!expandedSides && (
            <NumberField
              className="flex-1"
              icon="W"
              value={stroke.weight ?? 1}
              min={0}
              onChange={(v) => onPatch({ weight: v })}
            />
          )}
        </Tip>
        <IconButton
          label={panels.strokeSides}
          size="md"
          className="size-[26px] shrink-0"
          active={expandedSides}
          data-test-id="stroke-sides-toggle"
          onClick={() => onToggleSides(activeNode ?? null)}
        >
          <IconLayoutGrid className="size-3.5" />
        </IconButton>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <IconButton
          label={panels.strokeDash}
          size="md"
          className="shrink-0"
          active={dashState.on}
          data-test-id="stroke-dash-toggle"
          onClick={() => onPatch(strokeCtx.toggleDash(stroke))}
        >
          <span className="flex items-center gap-0.5">
            <IconMinus className="size-2.5" />
            <IconMinus className="size-2.5" />
          </span>
        </IconButton>
        {dashState.on && (
          <>
            <NumberField
              className="flex-1"
              icon="D"
              value={stroke.dashPattern?.[0] ?? 6}
              min={1}
              data-test-id="stroke-dash-length"
              onChange={(v) => onPatch(strokeCtx.setDash(stroke, v))}
            />
            <NumberField
              className="flex-1"
              icon="G"
              value={stroke.dashPattern?.[1] ?? stroke.dashPattern?.[0] ?? 6}
              min={1}
              data-test-id="stroke-dash-gap"
              onChange={(v) => onPatch(strokeCtx.setGap(stroke, v))}
            />
          </>
        )}
      </div>
    </>
  )
}

function StrokeSectionContent({ slot, panels, strokeCtx, strokeVarCtx, okhcl, expandedSides, onToggleSides, updateStrokeColor }: StrokeSectionContentProps) {
  const { items, isMixed, activeNode, actions } = slot
  return (
    <PanelSection
          label={panels.stroke}
          data-test-id="stroke-section"
          actions={
            <IconButton
              label={panels.addStroke}
              data-test-id="stroke-section-add"
              onClick={() => actions.add(strokeCtx.defaultStroke)}
            >
              <IconPlus className="size-3.5" />
            </IconButton>
          }
        >
          {isMixed && (
            <p className="text-[11px] text-muted">{panels.mixedStrokesHelp}</p>
          )}

          {items.map((stroke, i) => (
            <StrokeItemRow
              key={`${i}:${stroke.visible ? 'visible' : 'hidden'}`}
              stroke={stroke}
              index={i}
              activeNode={activeNode}
              strokeVarCtx={strokeVarCtx}
              okhcl={okhcl}
              panels={panels}
              onPatch={(changes) => actions.patch(i, changes)}
              onToggleVisibility={() => actions.toggleVisibility(i)}
              onRemove={() => actions.remove(i)}
              onUpdate={(color) => updateStrokeColor(activeNode, i, color, actions.patch)}
            />
          ))}

          {!isMixed && items.length > 0 && (
            <StrokeControls
              stroke={items[0]}
              activeNode={activeNode}
              strokeCtx={strokeCtx}
              panels={panels}
              expandedSides={expandedSides}
              onToggleSides={onToggleSides}
              onPatch={(changes) => actions.patch(0, changes)}
            />
          )}

          {!isMixed && items.length > 0 && expandedSides && (
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {strokeCtx.borderSides.map((side) => (
                <NumberField
                  key={side}
                  label={side[0].toUpperCase()}
                  value={strokeCtx.borderWeight(activeNode, side)}
                  min={0}
                  onChange={(v) => strokeCtx.updateBorderWeight(side, v, activeNode)}
                />
              ))}
            </div>
          )}
        </PanelSection>
  )
}
