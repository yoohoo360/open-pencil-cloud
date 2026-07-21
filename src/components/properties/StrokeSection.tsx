import IconLucideCircle from '~icons/lucide/circle'
import IconLucideCornerUpRight from '~icons/lucide/corner-up-right'
import IconLucideLayoutGrid from '~icons/lucide/layout-grid'
import IconLucideMinus from '~icons/lucide/minus'
import IconLucidePlus from '~icons/lucide/plus'
import IconLucideSquare from '~icons/lucide/square'
import IconLucideTriangle from '~icons/lucide/triangle'
import IconLucideTriangleRight from '~icons/lucide/triangle-right'
import {
  applySolidStrokeColor,
  BindableValueRoot,
  MIXED,
  useColorBindingProvider,
  useI18n,
  useOkHCL,
  useStrokeControls,
  type BindableValueActions
} from '@open-pencil/react'
import { memo, useCallback, useState } from 'react'

import { colorToHexRaw } from '@open-pencil/core/color'
import ColorPicker from '@/components/ColorPicker/ColorPicker'
import NumberField from '@/components/inputs/NumberField'
import PropertyItemRow from '@/components/properties/item-list/PropertyItemRow'
import PaintField from '@/components/properties/paint/PaintField'
import PaintValue from '@/components/properties/paint/PaintValue'
import {
  applyPaintMutation,
  cancelPaintMutation,
  commitPaintMutation,
  paintBindingTargets
} from '@/components/properties/paint/binding'
import { createStrokeOkhclAdapter } from '@/components/properties/paint/okhcl'
import PropertyListRoot from '@/components/properties/PropertyListRoot'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'
import AppSelect from '@/components/ui/AppSelect'
import FillSwatch from '@/components/ui/FillSwatch'
import IconButton from '@/components/ui/IconButton'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelSection from '@/components/ui/panel/PanelSection'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Tip from '@/components/ui/Tip'

import type { Color, Fill, SceneNode, Stroke } from '@open-pencil/scene-graph'

function strokePreview(stroke: Stroke, color: Color): Fill {
  return {
    type: 'SOLID',
    color,
    opacity: stroke.opacity,
    visible: stroke.visible
  }
}

function updateStrokeColor(
  binding: BindableValueActions<Color>,
  flush: () => void,
  color: Color,
  patch: (changes: Partial<Stroke>) => void,
  commit: boolean
) {
  if (!applyPaintMutation(binding, flush, () => patch(applySolidStrokeColor(color)))) return
  if (commit) commitPaintMutation(binding)
}

export const StrokeSection = memo(function StrokeSection() {
  const strokeCtx = useStrokeControls()
  const { advancedActive, cap, join, miterLimit } = strokeCtx
  const colorProvider = useColorBindingProvider()
  const okhcl = useOkHCL()
  const { panels, dialogs } = useI18n()
  const [expandedSides, setExpandedSides] = useState(false)

  const setCap = useCallback(
    (value: string) => {
      if (value === 'NONE' || value === 'ROUND' || value === 'SQUARE') {
        strokeCtx.setCap(value)
      }
    },
    [strokeCtx]
  )

  const setJoin = useCallback(
    (value: string) => {
      if (value === 'MITER' || value === 'BEVEL' || value === 'ROUND') {
        strokeCtx.setJoin(value)
      }
    },
    [strokeCtx]
  )

  const onToggleSides = useCallback(
    (activeNode: SceneNode | null) => {
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
    },
    [expandedSides, strokeCtx]
  )

  return (
    <PropertyListRoot propKey="strokes" label={panels.stroke}>
      {({ items, isMixed, activeNode, selectedNodeIds, flush, actions }) => (
        <PanelSection
          label={panels.stroke}
          empty={!isMixed && items.length === 0}
          actions={
            <IconButton label={panels.addStroke} onClick={() => actions.add(strokeCtx.defaultStroke)}>
              <IconLucidePlus className="size-3.5" />
            </IconButton>
          }
        >
          <SharedStyleField kind="stroke" label={panels.strokeStyle} />

          {isMixed ? <p className="text-[11px] text-muted">{panels.mixedStrokesHelp}</p> : null}

          {items.map((stroke, index) => (
            <PropertyItemRow
              key={`${index}:${stroke.visible ? 'visible' : 'hidden'}`}
              propKey="strokes"
              index={index}
              visibilityLabel={panels.toggleVisibility}
              removeLabel={panels.removeStroke}
            >
              <BindableValueRoot
                provider={colorProvider}
                targets={paintBindingTargets(selectedNodeIds, 'strokes', index)}
                value={stroke.color}
                batchLabel="Change stroke color"
              >
                {(binding) => (
                  <PaintField
                    opacity={stroke.opacity}
                    opacityLabel={panels.opacity}
                    onOpacityChange={(opacity) => actions.patch(index, { opacity })}
                    preview={
                      <ColorPicker
                        color={binding.resolvedValue ?? stroke.color}
                        okhcl={createStrokeOkhclAdapter(okhcl, activeNode, index)}
                        onUpdate={(color) =>
                          updateStrokeColor(
                            binding.actions,
                            flush,
                            color,
                            (changes) => actions.patch(index, changes),
                            false
                          )
                        }
                        onOpenChange={(open) => {
                          if (!open) commitPaintMutation(binding.actions)
                        }}
                        onCancel={() => cancelPaintMutation(binding.actions)}
                        trigger={
                          <button
                            type="button"
                            aria-label={panels.stroke}
                            className="size-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                          >
                            <FillSwatch
                              fill={strokePreview(stroke, binding.resolvedValue ?? stroke.color)}
                              className="size-full"
                            />
                          </button>
                        }
                      />
                    }
                    value={
                      <PaintValue
                        color={stroke.color}
                        resolvedColor={binding.resolvedValue}
                        variableName={binding.variable?.name}
                        label={panels.stroke}
                        onUpdate={(color) =>
                          updateStrokeColor(
                            binding.actions,
                            flush,
                            color,
                            (changes) => actions.patch(index, changes),
                            true
                          )
                        }
                      />
                    }
                    binding={
                      <VariableBindingPicker
                        triggerLabel={panels.applyVariable}
                        searchPlaceholder={dialogs.search}
                        emptyLabel={panels.noVariablesFound}
                        detachLabel={panels.detachVariable}
                        createLabel={panels.createColorVariable({
                          value: `#${colorToHexRaw(stroke.color)}`
                        })}
                        createNamePlaceholder={panels.variableName}
                        createSubmitLabel={panels.create}
                      />
                    }
                  />
                )}
              </BindableValueRoot>
            </PropertyItemRow>
          ))}

          {!isMixed && items.length > 0 ? (
            <div className="mt-1 flex items-center gap-1.5">
              <AppSelect
                label={panels.strokeType}
                ui={{ trigger: 'w-[88px] flex-none' }}
                value={strokeCtx.currentAlign(activeNode)}
                options={strokeCtx.alignOptions}
                data-property="stroke-align"
                onValueChange={(value) =>
                  strokeCtx.updateAlign(value as Stroke['align'], activeNode)
                }
              />
              {!expandedSides ? (
                <Tip label={panels.strokeWeight}>
                  <NumberField
                    className="flex-1"
                    icon="W"
                    value={items[0]?.weight ?? 1}
                    min={0}
                    data-property="stroke-weight"
                    onValueChange={(weight) => actions.patch(0, { weight })}
                  />
                </Tip>
              ) : null}
              <IconButton
                label={panels.strokeSides}
                size="md"
                className="size-[26px] shrink-0"
                active={expandedSides}
                data-property="stroke-sides"
                onClick={() => onToggleSides(activeNode)}
              >
                <IconLucideLayoutGrid className="size-3.5" />
              </IconButton>
            </div>
          ) : null}

          {!isMixed && items.length > 0 ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <IconButton
                label={panels.strokeDash}
                size="md"
                className="shrink-0"
                active={strokeCtx.dashState(items[0]).on}
                data-property="stroke-dash"
                onClick={() => actions.patch(0, strokeCtx.toggleDash(items[0]))}
              >
                <span className="flex items-center gap-0.5">
                  <IconLucideMinus className="size-2.5" />
                  <IconLucideMinus className="size-2.5" />
                </span>
              </IconButton>
              {strokeCtx.dashState(items[0]).on ? (
                <>
                  <NumberField
                    className="flex-1"
                    icon="D"
                    value={items[0]?.dashPattern?.[0] ?? 6}
                    min={1}
                    data-property="stroke-dash-length"
                    onValueChange={(value) => actions.patch(0, strokeCtx.setDash(items[0], value))}
                  />
                  <NumberField
                    className="flex-1"
                    icon="G"
                    value={items[0]?.dashPattern?.[1] ?? items[0]?.dashPattern?.[0] ?? 6}
                    min={1}
                    data-property="stroke-dash-gap"
                    onValueChange={(value) => actions.patch(0, strokeCtx.setGap(items[0], value))}
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {advancedActive ? (
            <PanelGrid columns="three" className="mt-1.5">
              <PanelFieldGroup label={panels.strokeCap}>
                <SegmentedControl
                  value={cap === MIXED ? 'MIXED' : String(cap)}
                  options={strokeCtx.capOptions}
                  label={panels.strokeCap}
                  data-property="stroke-cap"
                  onValueChange={setCap}
                  renderOption={({ option }) => (
                    <Tip label={option.label}>
                      {option.value === 'NONE' ? (
                        <IconLucideMinus className="size-3" />
                      ) : option.value === 'ROUND' ? (
                        <IconLucideCircle className="size-2.5" />
                      ) : (
                        <IconLucideSquare className="size-2.5" />
                      )}
                    </Tip>
                  )}
                />
              </PanelFieldGroup>

              <PanelFieldGroup label={panels.strokeJoin}>
                <SegmentedControl
                  value={join === MIXED ? 'MIXED' : String(join)}
                  options={strokeCtx.joinOptions}
                  label={panels.strokeJoin}
                  data-property="stroke-join"
                  onValueChange={setJoin}
                  renderOption={({ option }) => (
                    <Tip label={option.label}>
                      {option.value === 'MITER' ? (
                        <IconLucideCornerUpRight className="size-3" />
                      ) : option.value === 'BEVEL' ? (
                        <IconLucideTriangle className="size-2.5" />
                      ) : (
                        <IconLucideCircle className="size-2.5" />
                      )}
                    </Tip>
                  )}
                />
              </PanelFieldGroup>

              <PanelFieldGroup label={panels.strokeMiterLimit}>
                <NumberField
                  value={miterLimit}
                  min={1}
                  data-property="stroke-miter-limit"
                  aria-label={panels.strokeMiterLimit}
                  icon={<IconLucideTriangleRight className="size-3" />}
                  onValueChange={strokeCtx.updateMiterLimit}
                  onCommit={strokeCtx.commitMiterLimit}
                />
              </PanelFieldGroup>
            </PanelGrid>
          ) : null}

          {!isMixed && items.length > 0 && expandedSides ? (
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {strokeCtx.borderSides.map((side) => (
                <NumberField
                  key={side}
                  label={side[0].toUpperCase()}
                  value={strokeCtx.borderWeight(activeNode, side)}
                  min={0}
                  data-property={`stroke-${side}-weight`}
                  onValueChange={(weight) => strokeCtx.updateBorderWeight(side, weight, activeNode)}
                />
              ))}
            </div>
          ) : null}
        </PanelSection>
      )}
    </PropertyListRoot>
  )
})

StrokeSection.displayName = 'StrokeSection'
export default StrokeSection
