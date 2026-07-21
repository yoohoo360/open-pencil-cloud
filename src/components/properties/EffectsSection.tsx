import IconLucideBlend from '~icons/lucide/blend'
import IconLucidePlus from '~icons/lucide/plus'
import { useEffectsControls, useI18n } from '@open-pencil/react'
import { memo, useCallback, useState } from 'react'

import ColorInput from '@/components/ColorPicker/ColorInput'
import NumberField from '@/components/inputs/NumberField'
import PropertyItemRow from '@/components/properties/item-list/PropertyItemRow'
import PropertyListRoot from '@/components/properties/PropertyListRoot'
import {
  commitDiscretePropertyListChange,
  useBlendModeOptions
} from '@/components/properties/blend-mode/use'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import AppSelect from '@/components/ui/AppSelect'
import FillSwatch from '@/components/ui/FillSwatch'
import IconButton from '@/components/ui/IconButton'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelSection from '@/components/ui/panel/PanelSection'
import Tip from '@/components/ui/Tip'

import type { Effect, Fill } from '@open-pencil/scene-graph'

function effectPreview(effect: Effect): Fill {
  return {
    type: 'SOLID',
    color: effect.color,
    opacity: 1,
    visible: effect.visible
  }
}

export const EffectsSection = memo(function EffectsSection() {
  const effectsCtx = useEffectsControls()
  const { panels } = useI18n()
  const blendModeOptions = useBlendModeOptions()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    () => effectsCtx.expandedIndex.current
  )

  const toggleExpand = useCallback(
    (index: number) => {
      effectsCtx.toggleExpand(index)
      setExpandedIndex(effectsCtx.expandedIndex.current)
    },
    [effectsCtx]
  )

  const handleRemove = useCallback(
    (index: number) => {
      effectsCtx.adjustExpandedAfterRemove(index)
      setExpandedIndex(effectsCtx.expandedIndex.current)
    },
    [effectsCtx]
  )

  return (
    <PropertyListRoot propKey="effects" label={panels.effects}>
      {({ items, isMixed, activeNode, flush, actions }) => (
        <PanelSection
          label={panels.effects}
          empty={!isMixed && items.length === 0}
          actions={
            <IconButton
              label={panels.addEffect}
              onClick={() => actions.add(effectsCtx.createDefaultEffect())}
            >
              <IconLucidePlus className="size-3.5" />
            </IconButton>
          }
        >
          <SharedStyleField kind="effect" label={panels.effectStyle} />

          {isMixed ? (
            <p className="text-[11px] text-muted">{panels.mixedEffectsHelp}</p>
          ) : null}

          {items.map((effect, index) => (
            <div
              key={`${index}:${effect.visible ? 'visible' : 'hidden'}`}
              data-effect-index={index}
              data-effect-group
            >
              <PropertyItemRow
                propKey="effects"
                index={index}
                visibilityLabel={panels.toggleVisibility}
                removeLabel={panels.removeEffect}
                className="items-start"
                onRemove={handleRemove}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Tip
                      label={
                        expandedIndex === index
                          ? panels.collapseEffectSettings
                          : panels.expandEffectSettings
                      }
                    >
                      <button
                        type="button"
                        aria-expanded={expandedIndex === index}
                        aria-label={
                          expandedIndex === index
                            ? panels.collapseEffectSettings
                            : panels.expandEffectSettings
                        }
                        data-property="effect-expand"
                        className="flex size-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border bg-input p-0"
                        onClick={() => toggleExpand(index)}
                      >
                        {effectsCtx.isShadow(effect.type) ? (
                          <FillSwatch fill={effectPreview(effect)} className="size-full border-0" />
                        ) : (
                          <IconLucideBlend className="size-3 text-muted" />
                        )}
                      </button>
                    </Tip>

                    <AppSelect
                      className="min-w-0 flex-1"
                      value={effect.type}
                      options={effectsCtx.effectOptions}
                      label={panels.effects}
                      data-property="effect-type"
                      onValueChange={(type) =>
                        effectsCtx.updateType(actions.patch, activeNode, index, type as Effect['type'])
                      }
                    />
                  </div>

                  {expandedIndex === index ? (
                    <div className="flex flex-col gap-1.5 py-1.5" data-slot="effect-settings">
                      <PanelFieldGroup label={panels.blendMode}>
                        <AppSelect
                          value={effect.blendMode ?? 'NORMAL'}
                          options={blendModeOptions}
                          label={panels.blendMode}
                          data-property="effect-blend-mode"
                          onValueChange={(blendMode) =>
                            commitDiscretePropertyListChange(flush, () =>
                              actions.patch(index, { blendMode: blendMode as Effect['blendMode'] })
                            )
                          }
                        />
                      </PanelFieldGroup>

                      {effectsCtx.isShadow(effect.type) ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Tip label={panels.xAxis}>
                              <NumberField
                                icon="X"
                                value={effect.offset.x}
                                data-property="effect-offset-x"
                                onValueChange={(x) =>
                                  effectsCtx.scrubEffect(activeNode, index, {
                                    offset: { ...effect.offset, x }
                                  })
                                }
                                onCommit={(x) =>
                                  effectsCtx.commitEffect(activeNode, index, {
                                    offset: { ...effect.offset, x }
                                  })
                                }
                              />
                            </Tip>
                            <Tip label={panels.yAxis}>
                              <NumberField
                                icon="Y"
                                value={effect.offset.y}
                                data-property="effect-offset-y"
                                onValueChange={(y) =>
                                  effectsCtx.scrubEffect(activeNode, index, {
                                    offset: { ...effect.offset, y }
                                  })
                                }
                                onCommit={(y) =>
                                  effectsCtx.commitEffect(activeNode, index, {
                                    offset: { ...effect.offset, y }
                                  })
                                }
                              />
                            </Tip>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Tip label={panels.radius}>
                              <NumberField
                                icon="B"
                                value={effect.radius}
                                min={0}
                                data-property="effect-radius"
                                onValueChange={(radius) =>
                                  effectsCtx.scrubEffect(activeNode, index, { radius })
                                }
                                onCommit={(radius) =>
                                  effectsCtx.commitEffect(activeNode, index, { radius })
                                }
                              />
                            </Tip>
                            <Tip label={panels.spread}>
                              <NumberField
                                icon="S"
                                value={effect.spread}
                                data-property="effect-spread"
                                onValueChange={(spread) =>
                                  effectsCtx.scrubEffect(activeNode, index, { spread })
                                }
                                onCommit={(spread) =>
                                  effectsCtx.commitEffect(activeNode, index, { spread })
                                }
                              />
                            </Tip>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <ColorInput
                              className="min-w-0 flex-1"
                              color={effect.color}
                              editable
                              onUpdate={(color) => effectsCtx.updateColor(actions.patch, index, color)}
                            />
                            <Tip label={panels.opacity}>
                              <NumberField
                                className="w-14"
                                suffix="%"
                                value={Math.round(effect.color.a * 100)}
                                min={0}
                                max={100}
                                data-property="effect-opacity"
                                onValueChange={(opacity) =>
                                  effectsCtx.scrubEffect(activeNode, index, {
                                    color: {
                                      ...effect.color,
                                      a: Math.max(0, Math.min(1, opacity / 100))
                                    }
                                  })
                                }
                                onCommit={(opacity) =>
                                  effectsCtx.commitEffect(activeNode, index, {
                                    color: {
                                      ...effect.color,
                                      a: Math.max(0, Math.min(1, opacity / 100))
                                    }
                                  })
                                }
                              />
                            </Tip>
                          </div>
                        </>
                      ) : (
                        <NumberField
                          className="w-24 flex-none"
                          icon="B"
                          value={effect.radius}
                          min={0}
                          data-property="effect-radius"
                          onValueChange={(radius) =>
                            effectsCtx.scrubEffect(activeNode, index, { radius })
                          }
                          onCommit={(radius) =>
                            effectsCtx.commitEffect(activeNode, index, { radius })
                          }
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              </PropertyItemRow>
            </div>
          ))}
        </PanelSection>
      )}
    </PropertyListRoot>
  )
})

EffectsSection.displayName = 'EffectsSection'
export default EffectsSection
