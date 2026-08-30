import { NumberField } from '#react/components/inputs/NumberField'
import { ColorRow } from '#react/components/properties/ColorRow'
import { SharedStyleField } from '#react/components/properties/shared-style/SharedStyleField'
import { AppSelect } from '#react/components/ui/AppSelect'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { Tip } from '#react/components/ui/Tip'
import { patchEffectsForNodes, useEffectsControls } from '#react/controls/effects'
import { useSharedStyleBinding } from '#react/controls/shared-style'
import { useEditor } from '#react/editor/context'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { Blend, Eye, EyeOff, Minus, Plus } from 'lucide-react'

import type { BlendMode, Effect, SceneNode } from '@open-pencil/scene-graph'

function useBlendModeOptions() {
  const { panels } = useI18n()
  return [
    { value: 'NORMAL' as const, label: panels.blendModeNormal },
    { value: 'DARKEN' as const, label: panels.blendModeDarken },
    { value: 'MULTIPLY' as const, label: panels.blendModeMultiply },
    { value: 'COLOR_BURN' as const, label: panels.blendModeColorBurn },
    { value: 'LIGHTEN' as const, label: panels.blendModeLighten },
    { value: 'SCREEN' as const, label: panels.blendModeScreen },
    { value: 'COLOR_DODGE' as const, label: panels.blendModeColorDodge },
    { value: 'OVERLAY' as const, label: panels.blendModeOverlay },
    { value: 'SOFT_LIGHT' as const, label: panels.blendModeSoftLight },
    { value: 'HARD_LIGHT' as const, label: panels.blendModeHardLight },
    { value: 'DIFFERENCE' as const, label: panels.blendModeDifference },
    { value: 'EXCLUSION' as const, label: panels.blendModeExclusion },
    { value: 'HUE' as const, label: panels.blendModeHue },
    { value: 'SATURATION' as const, label: panels.blendModeSaturation },
    { value: 'COLOR' as const, label: panels.blendModeColor },
    { value: 'LUMINOSITY' as const, label: panels.blendModeLuminosity }
  ]
}

export function EffectsSection() {
  const editor = useEditor()
  const { hasSelection } = useSelectionState()
  const { panels } = useI18n()
  const effectsCtx = useEffectsControls()
  const effectStyle = useSharedStyleBinding('effect')
  const blendModeOptions = useBlendModeOptions()
  const nodes = useSceneComputed(() => editor.getSelectedNodes())
  if (!hasSelection) return null

  const activeNode = nodes[0] ?? null
  const items = activeNode?.effects ?? []
  const mixed =
    nodes.length > 1 &&
    nodes.some(
      (node) =>
        node.effects.length !== items.length ||
        node.effects.some((effect, index) => effect.type !== items[index]?.type)
    )

  return (
    <PanelSection
      label={panels.effects}
      empty={!mixed && items.length === 0 && !effectStyle.visible}
      actions={
        <IconButton
          label={panels.addEffect}
          onClick={() =>
            patchEffectsForNodes(
              editor,
              nodes,
              (effects) => [...effects, effectsCtx.createDefaultEffect()],
              'Add effect'
            )
          }
        >
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      <SharedStyleField binding={effectStyle} label={panels.effectStyle} />
      {mixed ? <p className="text-[11px] text-muted">{panels.mixedEffectsHelp}</p> : null}
      {items.map((effect, index) => (
        <EffectRow
          key={`${index}:${effect.visible ? 'visible' : 'hidden'}`}
          effect={effect}
          index={index}
          node={activeNode}
          blendModeOptions={blendModeOptions}
          effectsCtx={effectsCtx}
        />
      ))}
    </PanelSection>
  )
}

function EffectRow({
  effect,
  index,
  node,
  blendModeOptions,
  effectsCtx
}: {
  effect: Effect
  index: number
  node: SceneNode | null
  blendModeOptions: Array<{ value: BlendMode; label: string }>
  effectsCtx: ReturnType<typeof useEffectsControls>
}) {
  const { panels } = useI18n()
  const expanded = effectsCtx.expandedIndex === index
  const shadow = effectsCtx.isShadow(effect.type)

  return (
    <div className="mb-1.5 last:mb-0" data-effect-index={index} data-effect-group="">
      <div className="flex items-start gap-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-1.5">
            <Tip label={expanded ? panels.collapseEffectSettings : panels.expandEffectSettings}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? panels.collapseEffectSettings : panels.expandEffectSettings}
                data-property="effect-expand"
                className="flex size-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border bg-input p-0"
                onClick={() => effectsCtx.toggleExpand(index)}
              >
                {shadow ? (
                  <span
                    className="size-full"
                    style={{
                      backgroundColor: `rgb(${effect.color.r * 255} ${effect.color.g * 255} ${effect.color.b * 255})`
                    }}
                  />
                ) : (
                  <Blend className="size-3 text-muted" />
                )}
              </button>
            </Tip>
            <AppSelect
              className="min-w-0 flex-1"
              label={panels.effects}
              data-property="effect-type"
              value={effect.type}
              options={effectsCtx.effectOptions}
              onChange={(type) => effectsCtx.updateType(node, index, type)}
            />
          </div>
          {expanded ? (
            <div className="flex flex-col gap-1.5 py-1.5" data-slot="effect-settings">
              <PanelFieldGroup label={panels.blendMode}>
                <AppSelect
                  label={panels.blendMode}
                  data-property="effect-blend-mode"
                  value={effect.blendMode ?? 'NORMAL'}
                  options={blendModeOptions}
                  onChange={(blendMode) => effectsCtx.commitEffect(node, index, { blendMode })}
                />
              </PanelFieldGroup>
              {shadow ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <Tip label={panels.xAxis}>
                      <NumberField
                        icon="X"
                        data-property="effect-offset-x"
                        value={effect.offset.x}
                        onCommit={(value) =>
                          effectsCtx.commitEffect(node, index, {
                            offset: { ...effect.offset, x: value }
                          })
                        }
                      />
                    </Tip>
                    <Tip label={panels.yAxis}>
                      <NumberField
                        icon="Y"
                        data-property="effect-offset-y"
                        value={effect.offset.y}
                        onCommit={(value) =>
                          effectsCtx.commitEffect(node, index, {
                            offset: { ...effect.offset, y: value }
                          })
                        }
                      />
                    </Tip>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tip label={panels.radius}>
                      <NumberField
                        icon="B"
                        min={0}
                        data-property="effect-radius"
                        value={effect.radius}
                        onCommit={(value) =>
                          effectsCtx.commitEffect(node, index, { radius: value })
                        }
                      />
                    </Tip>
                    <Tip label={panels.spread}>
                      <NumberField
                        icon="S"
                        data-property="effect-spread"
                        value={effect.spread}
                        onCommit={(value) =>
                          effectsCtx.commitEffect(node, index, { spread: value })
                        }
                      />
                    </Tip>
                  </div>
                  <ColorRow
                    color={effect.color}
                    opacity={effect.color.a}
                    label={panels.editColor}
                    onColor={(color) => effectsCtx.updateColor(node, index, color)}
                    onOpacity={(opacity) =>
                      effectsCtx.commitEffect(node, index, {
                        color: { ...effect.color, a: opacity }
                      })
                    }
                  />
                </>
              ) : (
                <NumberField
                  icon="B"
                  min={0}
                  data-property="effect-radius"
                  value={effect.radius}
                  onCommit={(value) => effectsCtx.commitEffect(node, index, { radius: value })}
                />
              )}
            </div>
          ) : null}
        </div>
        <IconButton
          label={panels.toggleVisibility}
          active={effect.visible === false}
          onClick={() => effectsCtx.toggleVisibility(node, index)}
        >
          {effect.visible === false ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </IconButton>
        <IconButton
          label={panels.removeEffect}
          onClick={() => effectsCtx.removeEffect(node, index)}
        >
          <Minus className="size-3.5" />
        </IconButton>
      </div>
    </div>
  )
}
