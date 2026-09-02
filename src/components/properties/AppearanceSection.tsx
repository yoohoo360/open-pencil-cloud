import { useMemo } from 'react'

import IconEye from '~icons/lucide/eye'
import IconEyeOff from '~icons/lucide/eye-off'
import IconSquareRoundCorner from '~icons/lucide/square-round-corner'

import { AppearanceControlsRoot, MIXED, useI18n } from '@open-pencil/react'
import type { BlendMode } from '@open-pencil/scene-graph'

import { NumberField } from '@/components/inputs/NumberField'
import { VariableNumberField } from '@/components/properties/VariableNumberField'
import { AppSelect } from '@/components/ui/AppSelect'
import { IconButton } from '@/components/ui/IconButton'
import { PanelFieldGroup } from '@/components/ui/panel/PanelFieldGroup'
import { PanelGrid } from '@/components/ui/panel/PanelGrid'
import { PanelRail } from '@/components/ui/panel/PanelRail'
import { PanelSection } from '@/components/ui/panel/PanelSection'

type BlendModeSelectValue = BlendMode | 'MIXED'
type CornerRadiusProp = 'topLeftRadius' | 'topRightRadius' | 'bottomLeftRadius' | 'bottomRightRadius'

export function AppearanceSection() {
  const { panels } = useI18n()

  const baseBlendModeOptions = useMemo<Array<{ value: BlendModeSelectValue; label: string }>>(
    () => [
      { value: 'PASS_THROUGH', label: panels.blendModePassThrough },
      { value: 'NORMAL', label: panels.blendModeNormal },
      { value: 'DARKEN', label: panels.blendModeDarken },
      { value: 'MULTIPLY', label: panels.blendModeMultiply },
      { value: 'COLOR_BURN', label: panels.blendModeColorBurn },
      { value: 'LIGHTEN', label: panels.blendModeLighten },
      { value: 'SCREEN', label: panels.blendModeScreen },
      { value: 'COLOR_DODGE', label: panels.blendModeColorDodge },
      { value: 'OVERLAY', label: panels.blendModeOverlay },
      { value: 'SOFT_LIGHT', label: panels.blendModeSoftLight },
      { value: 'HARD_LIGHT', label: panels.blendModeHardLight },
      { value: 'DIFFERENCE', label: panels.blendModeDifference },
      { value: 'EXCLUSION', label: panels.blendModeExclusion },
      { value: 'HUE', label: panels.blendModeHue },
      { value: 'SATURATION', label: panels.blendModeSaturation },
      { value: 'COLOR', label: panels.blendModeColor },
      { value: 'LUMINOSITY', label: panels.blendModeLuminosity }
    ],
    [panels]
  )

  function blendModeOptions(value: BlendMode | typeof MIXED) {
    return value === MIXED
      ? [{ value: 'MIXED' as const, label: panels.mixed }, ...baseBlendModeOptions]
      : baseBlendModeOptions
  }

  return (
    <AppearanceControlsRoot>
      {({
        node,
        isMulti,
        active,
        hasCornerRadius,
        independentCorners,
        showIndependentCorners,
        cornerRadiusValue,
        opacityPercent,
        blendModeValue,
        visibilityState,
        actions
      }) => {
        if (!active) return null

        return (
          <PanelSection
            label={panels.appearance}
            actions={
              <IconButton
                label={panels.toggleVisibility}
                active={visibilityState === 'hidden'}
                onClick={actions.toggleVisibility}
              >
                {visibilityState === 'visible'
                  ? <IconEye className="size-3.5" />
                  : (visibilityState === 'hidden'
                    ? <IconEyeOff className="size-3.5" />
                    : <IconEye className="size-3.5 opacity-50" />)
                }
              </IconButton>
            }
          >
            <PanelGrid columns="two">
              <PanelFieldGroup label={panels.blendMode}>
                <AppSelect
                  value={blendModeValue === MIXED ? 'MIXED' : blendModeValue}
                  className="w-full"
                  label={panels.blendMode}
                  options={blendModeOptions(blendModeValue)}
                  onChange={(value: string) => {
                    if (value !== 'MIXED') actions.setBlendMode(value as BlendMode)
                  }}
                />
              </PanelFieldGroup>

              <PanelFieldGroup label={panels.opacity}>
                {node && !isMulti ? (
                  <VariableNumberField
                    suffix="%"
                    aria-label={panels.opacity}
                    value={opacityPercent}
                    min={0}
                    max={100}
                    nodeId={node.id}
                    bindingPath="opacity"
                    onChange={(v) => actions.updateProp('opacity', v / 100)}
                    onCommit={(v, p) => actions.commitProp('opacity', v / 100, p / 100)}
                    iconSlot={<span className="lucide-blend-icon size-3" />}
                  />
                ) : (
                  <NumberField
                    suffix="%"
                    data-property="opacity"
                    aria-label={panels.opacity}
                    value={opacityPercent}
                    min={0}
                    max={100}
                    onChange={(v) => actions.updateProp('opacity', v / 100)}
                    onCommit={(v, p) => actions.commitProp('opacity', v / 100, p / 100)}
                  />
                )}
              </PanelFieldGroup>
            </PanelGrid>

            {hasCornerRadius && !showIndependentCorners && (
              <PanelGrid columns="fill-rail" className="mt-panel">
                <PanelFieldGroup label={panels.radius}>
                  {node && !isMulti ? (
                    <VariableNumberField
                      aria-label={panels.radius}
                      value={cornerRadiusValue}
                      min={0}
                      nodeId={node.id}
                      bindingPath="cornerRadius"
                      onChange={(v) => actions.updateProp('cornerRadius', v)}
                      onCommit={(v, p) => actions.commitCornerProp('cornerRadius', v, p)}
                      iconSlot={<IconSquareRoundCorner className="size-3" />}
                    />
                  ) : (
                    <NumberField
                      data-property="cornerRadius"
                      aria-label={panels.radius}
                      value={cornerRadiusValue}
                      min={0}
                      onChange={(v) => actions.updateProp('cornerRadius', v)}
                      onCommit={(v, p) => actions.commitCornerProp('cornerRadius', v, p)}
                      iconSlot={<IconSquareRoundCorner className="size-3" />}
                    />
                  )}
                </PanelFieldGroup>
                <PanelRail>
                  <IconButton
                    label={panels.independentCornerRadii}
                    size="md"
                    active={independentCorners === true}
                    onClick={actions.toggleIndependentCorners}
                  >
                    <IconSquareRoundCorner className="size-3" />
                  </IconButton>
                </PanelRail>
              </PanelGrid>
            )}

            {hasCornerRadius && !isMulti && node && showIndependentCorners && (
              <PanelGrid columns="two-rail" className="mt-panel" data-corner-grid>
                {(
                  [
                    ['TL', 'topLeftRadius'],
                    ['TR', 'topRightRadius'],
                    [null, null],
                    ['BL', 'bottomLeftRadius'],
                    ['BR', 'bottomRightRadius'],
                    [null, null]
                  ] as Array<[string | null, string | null]>
                ).map(([lbl, prop], i) => {
                  if (!lbl || !prop) {
                    return i === 2 ? (
                      <PanelRail key="rail-top">
                        <IconButton
                          label={panels.independentCornerRadii}
                          size="md"
                          active
                          onClick={actions.toggleIndependentCorners}
                        >
                          <IconSquareRoundCorner className="size-3" />
                        </IconButton>
                      </PanelRail>
                    ) : (
                      <PanelRail key="rail-bottom" />
                    )
                  }
                  const val = node[prop as CornerRadiusProp] as number
                  return (
                    <VariableNumberField
                      key={prop}
                      label={lbl}
                      value={val}
                      min={0}
                      nodeId={node.id}
                      bindingPath={prop as 'topLeftRadius'}
                      onChange={(v) => actions.updateCornerProp(prop as 'topLeftRadius', v)}
                      onCommit={(v, p) => actions.commitCornerProp(prop as 'topLeftRadius', v, p)}
                    />
                  )
                })}
              </PanelGrid>
            )}
          </PanelSection>
        )
      }}
    </AppearanceControlsRoot>
  )
}
