import { Blend, Eye, EyeOff } from 'lucide-react'

import { ColorInput } from '@/react_app/pickers/ColorInput'
import { ScrubInput } from '@/react_app/pickers/ScrubInput'
import { AppSelect } from '@/react_app/ui/AppSelect'
import { iconButton } from '@/react_app/ui/iconButton'
import { sectionLabel, sectionWrapper } from '@/react_app/ui/section'
import { colorToCSS } from '@open-pencil/core'
import { PropertyListRoot, useEffectsControls, useI18n } from '@open-pencil/react'

import type { Effect } from '@open-pencil/core'

export function EffectsSection() {
  const effectsCtx = useEffectsControls()
  const { panels } = useI18n()

  return (
    <PropertyListRoot propKey="effects" label={panels.effects}>
      {({ items, isMixed, activeNode, patch, add, remove, toggleVisibility }) => (
        <div data-test-id="effects-section" className={sectionWrapper()}>
          <div className="flex items-center justify-between">
            <label className={sectionLabel()}>{panels.effects}</label>
            <button
              type="button"
              data-test-id="effects-section-add"
              className={iconButton()}
              onClick={() => add(effectsCtx.createDefaultEffect())}
            >
              +
            </button>
          </div>

          {isMixed ? <p className="text-[11px] text-muted">{panels.mixedEffectsHelp}</p> : null}

          {(items as Effect[]).map((effect, i) => (
            <div
              key={`${i}:${effect.visible ? 'visible' : 'hidden'}`}
              data-test-id="effect-item"
              data-test-index={i}
            >
              <div className="group flex items-center gap-1.5 py-0.5">
                {effectsCtx.isShadow(effect.type) ? (
                  <button
                    type="button"
                    className="size-5 shrink-0 cursor-pointer rounded border border-border"
                    style={{ background: colorToCSS(effect.color) }}
                    onClick={() => effectsCtx.toggleExpand(i)}
                  />
                ) : (
                  <button
                    type="button"
                    className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-input"
                    onClick={() => effectsCtx.toggleExpand(i)}
                  >
                    <Blend className="size-3 text-muted" />
                  </button>
                )}

                <AppSelect
                  value={effect.type}
                  options={effectsCtx.effectOptions}
                  onValueChange={(v) =>
                    effectsCtx.updateType(patch, activeNode, i, v as Effect['type'])
                  }
                />

                <button
                  type="button"
                  data-test-id={`effect-visibility-${i}`}
                  className="cursor-pointer border-none bg-transparent p-0 text-muted hover:text-surface"
                  onClick={() => toggleVisibility(i)}
                >
                  {effect.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </button>
                <button
                  type="button"
                  className={iconButton()}
                  onClick={() => effectsCtx.handleRemove(remove, i)}
                >
                  −
                </button>
              </div>

              {effectsCtx.expandedIndex === i ? (
                <div className="flex flex-col gap-1.5 py-1.5">
                  {effectsCtx.isShadow(effect.type) ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <ScrubInput
                          icon="X"
                          value={effect.offset.x}
                          onValueChange={(v) =>
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
                        <ScrubInput
                          icon="Y"
                          value={effect.offset.y}
                          onValueChange={(v) =>
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
                      </div>

                      <div className="flex items-center gap-1.5">
                        <ScrubInput
                          icon="B"
                          value={effect.radius}
                          min={0}
                          onValueChange={(v) =>
                            effectsCtx.scrubEffect(activeNode, i, { radius: v })
                          }
                          onCommit={(v) => effectsCtx.commitEffect(activeNode, i, { radius: v })}
                        />
                        <ScrubInput
                          icon="S"
                          value={effect.spread}
                          onValueChange={(v) =>
                            effectsCtx.scrubEffect(activeNode, i, { spread: v })
                          }
                          onCommit={(v) => effectsCtx.commitEffect(activeNode, i, { spread: v })}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <ColorInput
                          color={effect.color}
                          editable
                          onUpdate={(c) => effectsCtx.updateColor(patch, i, c)}
                        />
                        <ScrubInput
                          className="w-14"
                          suffix="%"
                          value={Math.round(effect.color.a * 100)}
                          min={0}
                          max={100}
                          onValueChange={(v) =>
                            effectsCtx.scrubEffect(activeNode, i, {
                              color: {
                                ...effect.color,
                                a: Math.max(0, Math.min(1, v / 100))
                              }
                            })
                          }
                          onCommit={(v) =>
                            effectsCtx.commitEffect(activeNode, i, {
                              color: {
                                ...effect.color,
                                a: Math.max(0, Math.min(1, v / 100))
                              }
                            })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <ScrubInput
                      icon="B"
                      value={effect.radius}
                      min={0}
                      onValueChange={(v) => effectsCtx.scrubEffect(activeNode, i, { radius: v })}
                      onCommit={(v) => effectsCtx.commitEffect(activeNode, i, { radius: v })}
                    />
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </PropertyListRoot>
  )
}
