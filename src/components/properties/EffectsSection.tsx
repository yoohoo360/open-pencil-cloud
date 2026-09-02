import { colorToCSS } from '@open-pencil/core/color'
import { useEffectsControls, useI18n } from '@open-pencil/react'

import IconPlus from '~icons/lucide/plus'
import IconMinus from '~icons/lucide/minus'
import IconEye from '~icons/lucide/eye'
import IconEyeOff from '~icons/lucide/eye-off'
import IconBlend from '~icons/lucide/blend'

import { AppSelect } from '@/components/ui/AppSelect'
import { ColorInput } from '@/components/ColorPicker/ColorInput'
import { NumberField } from '@/components/inputs/NumberField'
import { IconButton } from '@/components/ui/IconButton'
import { PanelSection } from '@/components/ui/panel/PanelSection'
import { Tip } from '@/components/ui/Tip'
import { PropertyListRoot } from '@/components/properties/PropertyListRoot'

import type { Effect } from '@open-pencil/scene-graph'

export function EffectsSection() {
  const effectsCtx = useEffectsControls()
  const { panels } = useI18n()

  return (
    <PropertyListRoot propKey="effects" label={panels.effects}>
      {({ items, isMixed, activeNode, actions }) => (
        <PanelSection
          label={panels.effects}
          data-test-id="effects-section"
          actions={
            <IconButton
              label={panels.addEffect}
              data-test-id="effects-section-add"
              onClick={() => actions.add(effectsCtx.createDefaultEffect())}
            >
              <IconPlus className="size-3.5" />
            </IconButton>
          }
        >
          {isMixed && (
            <p className="text-[11px] text-muted">{panels.mixedEffectsHelp}</p>
          )}

          {items.map((effect, i) => (
            <div
              key={`${i}:${effect.visible ? 'visible' : 'hidden'}`}
              data-test-id="effect-item"
              data-test-index={i}
            >
              <div className="group flex items-center gap-1.5 py-0.5">
                <Tip
                  label={
                    effectsCtx.expandedIndex.value === i
                      ? panels.collapseEffectSettings
                      : panels.expandEffectSettings
                  }
                >
                  {effectsCtx.isShadow(effect.type) ? (
                    <button
                      className="size-5 shrink-0 cursor-pointer rounded border border-border"
                      style={{ background: colorToCSS(effect.color) }}
                      onClick={() => effectsCtx.toggleExpand(i)}
                    />
                  ) : (
                    <button
                      className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-input"
                      onClick={() => effectsCtx.toggleExpand(i)}
                    >
                      <IconBlend className="size-3 text-muted" />
                    </button>
                  )}
                </Tip>

                <AppSelect
                  value={effect.type}
                  options={effectsCtx.effectOptions}
                  onChange={(v) =>
                    effectsCtx.updateType(actions.patch, activeNode, i, v as Effect['type'])
                  }
                />

                <Tip label={panels.toggleVisibility}>
                  <button
                    data-test-id={`effect-visibility-${i}`}
                    data-visible={effect.visible ? 'true' : 'false'}
                    className="cursor-pointer border-none bg-transparent p-0 text-muted hover:text-surface"
                    onClick={() => actions.toggleVisibility(i)}
                  >
                    {effect.visible ? (
                      <IconEye data-test-id="visibility-icon-on" className="size-3.5" />
                    ) : (
                      <IconEyeOff data-test-id="visibility-icon-off" className="size-3.5" />
                    )}
                  </button>
                </Tip>
                <IconButton
                  label={panels.removeEffect}
                  onClick={() => effectsCtx.handleRemove(actions.remove, i)}
                >
                  <IconMinus className="size-3.5" />
                </IconButton>
              </div>

              <div className="flex flex-col gap-1.5 py-1.5">
                {effectsCtx.isShadow(effect.type) ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Tip label={panels.xAxis}>
                        <NumberField
                          icon="X"
                          value={effect.offset.x}
                          onChange={(v) =>
                            effectsCtx.scrubEffect(activeNode, i, {
                              offset: { ...effect.offset, x: v }
                            })
                          }
                          onCommit={(v) =>
                            effectsCtx.commitEffect(activeNode, i, {
                              offset: { ...effect.offset, x: v }
                            })
                          }
                        />
                      </Tip>
                      <Tip label={panels.yAxis}>
                        <NumberField
                          icon="Y"
                          value={effect.offset.y}
                          onChange={(v) =>
                            effectsCtx.scrubEffect(activeNode, i, {
                              offset: { ...effect.offset, y: v }
                            })
                          }
                          onCommit={(v) =>
                            effectsCtx.commitEffect(activeNode, i, {
                              offset: { ...effect.offset, y: v }
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
                          onChange={(v) =>
                            effectsCtx.scrubEffect(activeNode, i, { radius: v })
                          }
                          onCommit={(v) =>
                            effectsCtx.commitEffect(activeNode, i, { radius: v })
                          }
                        />
                      </Tip>
                      <Tip label={panels.spread}>
                        <NumberField
                          icon="S"
                          value={effect.spread}
                          onChange={(v) =>
                            effectsCtx.scrubEffect(activeNode, i, { spread: v })
                          }
                          onCommit={(v) =>
                            effectsCtx.commitEffect(activeNode, i, { spread: v })
                          }
                        />
                      </Tip>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ColorInput
                        color={effect.color}
                        editable
                        onUpdate={(color) => effectsCtx.updateColor(actions.patch, i, color)}
                      />
                      <Tip label={panels.opacity}>
                        <NumberField
                          className="w-14"
                          suffix="%"
                          value={Math.round(effect.color.a * 100)}
                          min={0}
                          max={100}
                          onChange={(v) =>
                            effectsCtx.scrubEffect(activeNode, i, {
                              color: { ...effect.color, a: Math.max(0, Math.min(1, v / 100)) }
                            })
                          }
                          onCommit={(v) =>
                            effectsCtx.commitEffect(activeNode, i, {
                              color: { ...effect.color, a: Math.max(0, Math.min(1, v / 100)) }
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
                    onChange={(v) => effectsCtx.scrubEffect(activeNode, i, { radius: v })}
                    onCommit={(v) => effectsCtx.commitEffect(activeNode, i, { radius: v })}
                  />
                )}
              </div>
            </div>
          ))}
        </PanelSection>
      )}
    </PropertyListRoot>
  )
}
