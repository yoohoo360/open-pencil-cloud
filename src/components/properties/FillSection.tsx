import IconLucidePlus from '~icons/lucide/plus'
import {
  BindableValueRoot,
  useColorBindingProvider,
  useFillControls,
  useI18n,
  useOkHCL,
  type BindableValueActions
} from '@open-pencil/react'
import { memo, useCallback } from 'react'

import { colorToHexRaw } from '@open-pencil/core/color'
import FillPicker from '@/components/fill-picker/FillPicker'
import PropertyItemRow from '@/components/properties/item-list/PropertyItemRow'
import { fillLabel } from '@/components/properties/fill-label'
import PaintField from '@/components/properties/paint/PaintField'
import PaintValue from '@/components/properties/paint/PaintValue'
import {
  applyPaintMutation,
  cancelPaintMutation,
  commitPaintMutation,
  paintBindingTargets
} from '@/components/properties/paint/binding'
import { createFillOkhclAdapter } from '@/components/properties/paint/okhcl'
import {
  commitDiscretePropertyListChange,
  useBlendModeOptions
} from '@/components/properties/blend-mode/use'
import PropertyListRoot from '@/components/properties/PropertyListRoot'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'
import AppSelect from '@/components/ui/AppSelect'
import IconButton from '@/components/ui/IconButton'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelSection from '@/components/ui/panel/PanelSection'

import type { Color, Fill } from '@open-pencil/scene-graph'

function displayFill(fill: Fill, resolvedColor: Color | undefined): Fill {
  return fill.type === 'SOLID' && resolvedColor ? { ...fill, color: resolvedColor } : fill
}

function updatePickerFill(
  binding: BindableValueActions<Color>,
  flush: () => void,
  nextFill: Fill,
  update: (fill: Fill) => void
) {
  applyPaintMutation(binding, flush, () => update(nextFill))
}

function updateSolidColor(
  binding: BindableValueActions<Color>,
  flush: () => void,
  fill: Fill,
  color: Color,
  update: (fill: Fill) => void
) {
  if (fill.type !== 'SOLID') return
  if (applyPaintMutation(binding, flush, () => update({ ...fill, color }))) {
    commitPaintMutation(binding)
  }
}

export const FillSection = memo(function FillSection() {
  const fillCtx = useFillControls()
  const okhcl = useOkHCL()
  const colorProvider = useColorBindingProvider()
  const { panels, dialogs } = useI18n()
  const blendModeOptions = useBlendModeOptions()

  const handleOpenChange = useCallback(
    (binding: BindableValueActions<Color>, open: boolean) => {
      if (!open) commitPaintMutation(binding)
    },
    []
  )

  return (
    <PropertyListRoot propKey="fills" label={panels.fill}>
      {({ items, isMixed, activeNode, selectedNodeIds, flush, actions }) => (
        <PanelSection
          label={panels.fill}
          empty={!isMixed && items.length === 0}
          actions={
            <IconButton
              label={panels.addFill}
              onClick={() => actions.add({ ...fillCtx.defaultFill })}
            >
              <IconLucidePlus className="size-3.5" />
            </IconButton>
          }
        >
          <SharedStyleField kind="fill" label={panels.fillStyle} />

          {isMixed ? <p className="text-[11px] text-muted">{panels.mixedFillsHelp}</p> : null}

          {items.map((fill, index) => (
            <div key={`${index}:${fill.visible ? 'visible' : 'hidden'}`}>
              <PropertyItemRow
                className="items-start"
                propKey="fills"
                index={index}
                visibilityLabel={panels.toggleVisibility}
                removeLabel={panels.removeFill}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <BindableValueRoot
                    provider={colorProvider}
                    targets={paintBindingTargets(selectedNodeIds, 'fills', index)}
                    value={fill.color}
                    batchLabel="Change fill color"
                  >
                    {(binding) => (
                      <PaintField
                        className="w-full flex-none"
                        opacity={fill.opacity}
                        opacityLabel={panels.opacity}
                        onOpacityChange={(opacity) => actions.patch(index, { opacity })}
                        preview={
                          <FillPicker
                            fill={displayFill(fill, binding.resolvedValue)}
                            okhcl={createFillOkhclAdapter(okhcl, activeNode, index)}
                            onUpdate={(nextFill) =>
                              updatePickerFill(binding.actions, flush, nextFill, (next) =>
                                actions.update(index, next)
                              )
                            }
                            onOpenChange={(open) => handleOpenChange(binding.actions, open)}
                            onCancel={() => cancelPaintMutation(binding.actions)}
                          />
                        }
                        value={
                          fill.type === 'SOLID' ? (
                            <PaintValue
                              color={fill.color}
                              resolvedColor={binding.resolvedValue}
                              variableName={binding.variable?.name}
                              label={panels.fill}
                              onUpdate={(color) =>
                                updateSolidColor(binding.actions, flush, fill, color, (next) =>
                                  actions.update(index, next)
                                )
                              }
                            />
                          ) : (
                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-surface">
                              {fillLabel(fill)}
                            </span>
                          )
                        }
                        binding={
                          fill.type === 'SOLID' ? (
                            <VariableBindingPicker
                              triggerLabel={panels.applyVariable}
                              searchPlaceholder={dialogs.search}
                              emptyLabel={panels.noVariablesFound}
                              detachLabel={panels.detachVariable}
                              createLabel={panels.createColorVariable({
                                value: `#${colorToHexRaw(fill.color)}`
                              })}
                              createNamePlaceholder={panels.variableName}
                              createSubmitLabel={panels.create}
                            />
                          ) : undefined
                        }
                      />
                    )}
                  </BindableValueRoot>
                  <PanelFieldGroup label={panels.blendMode}>
                    <AppSelect
                      value={fill.blendMode ?? 'NORMAL'}
                      options={blendModeOptions}
                      label={panels.blendMode}
                      data-property="fill-blend-mode"
                      onValueChange={(blendMode) =>
                        commitDiscretePropertyListChange(flush, () =>
                          actions.patch(index, { blendMode: blendMode as Fill['blendMode'] })
                        )
                      }
                    />
                  </PanelFieldGroup>
                </div>
              </PropertyItemRow>
            </div>
          ))}
        </PanelSection>
      )}
    </PropertyListRoot>
  )
})

FillSection.displayName = 'FillSection'
export default FillSection
