import IconLucideBlend from '~icons/lucide/blend'
import IconLucideEye from '~icons/lucide/eye'
import IconLucideEyeOff from '~icons/lucide/eye-off'
import IconLucideSquareRoundCorner from '~icons/lucide/square-round-corner'
import IconLucideSquircle from '~icons/lucide/squircle'
import { AppearanceControlsRoot, MIXED, useI18n } from '@open-pencil/react'
import { memo, useCallback } from 'react'

import NumberField from '@/components/inputs/NumberField'
import { useBlendModeOptions } from '@/components/properties/blend-mode/use'
import VariableNumberField from '@/components/properties/VariableNumberField'
import AppSelect from '@/components/ui/AppSelect'
import IconButton from '@/components/ui/IconButton'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelRail from '@/components/ui/panel/PanelRail'
import PanelSection from '@/components/ui/panel/PanelSection'

import type { BlendMode } from '@open-pencil/scene-graph'

type BlendModeSelectValue = BlendMode | 'MIXED'

export const AppearanceSection = memo(function AppearanceSection() {
  const { panels } = useI18n()
  const baseBlendModeOptions = useBlendModeOptions(true)

  const blendModeOptions = useCallback(
    (value: BlendMode | typeof MIXED) =>
      value === MIXED
        ? [{ value: 'MIXED' as const, label: panels.mixed }, ...baseBlendModeOptions]
        : baseBlendModeOptions,
    [baseBlendModeOptions, panels.mixed]
  )

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
        cornerSmoothingPercent,
        opacityPercent,
        blendModeValue,
        visibilityState,
        actions
      }) =>
        active ? (
          <PanelSection
            label={panels.appearance}
            actions={
              <IconButton
                label={panels.toggleVisibility}
                active={visibilityState === 'hidden'}
                onClick={actions.toggleVisibility}
              >
                {visibilityState === 'visible' ? (
                  <IconLucideEye className="size-3.5" />
                ) : visibilityState === 'hidden' ? (
                  <IconLucideEyeOff className="size-3.5" />
                ) : (
                  <IconLucideEye className="size-3.5 opacity-50" />
                )}
              </IconButton>
            }
          >
            <PanelGrid columns="appearance">
              <PanelFieldGroup label={panels.blendMode}>
                <AppSelect
                  value={blendModeValue === MIXED ? 'MIXED' : blendModeValue}
                  className="w-full"
                  label={panels.blendMode}
                  options={blendModeOptions(blendModeValue)}
                  onValueChange={(value: BlendModeSelectValue) =>
                    value !== 'MIXED' && actions.setBlendMode(value)
                  }
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
                    icon={<IconLucideBlend className="size-3" />}
                    onValueChange={(next) => actions.updateProp('opacity', next / 100)}
                    onCommit={(next, previous) =>
                      actions.commitProp('opacity', next / 100, previous / 100)
                    }
                  />
                ) : (
                  <NumberField
                    suffix="%"
                    data-property="opacity"
                    aria-label={panels.opacity}
                    value={opacityPercent}
                    min={0}
                    max={100}
                    icon={<IconLucideBlend className="size-3" />}
                    onValueChange={(next) => actions.updateProp('opacity', next / 100)}
                    onCommit={(next, previous) =>
                      actions.commitProp('opacity', next / 100, previous / 100)
                    }
                  />
                )}
              </PanelFieldGroup>
            </PanelGrid>

            {hasCornerRadius && !showIndependentCorners ? (
              <PanelGrid columns="fill-rail" className="mt-1.5">
                <PanelFieldGroup label={panels.radius}>
                  {node && !isMulti ? (
                    <VariableNumberField
                      aria-label={panels.radius}
                      value={cornerRadiusValue}
                      min={0}
                      nodeId={node.id}
                      bindingPath="cornerRadius"
                      icon={<IconLucideSquareRoundCorner className="size-3" />}
                      onValueChange={(next) => actions.updateProp('cornerRadius', next)}
                      onCommit={(next, previous) =>
                        actions.commitProp('cornerRadius', next, previous)
                      }
                    />
                  ) : (
                    <NumberField
                      data-property="cornerRadius"
                      aria-label={panels.radius}
                      value={cornerRadiusValue}
                      min={0}
                      icon={<IconLucideSquareRoundCorner className="size-3" />}
                      onValueChange={(next) => actions.updateProp('cornerRadius', next)}
                      onCommit={(next, previous) =>
                        actions.commitProp('cornerRadius', next, previous)
                      }
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
                    <IconLucideSquareRoundCorner className="size-3" />
                  </IconButton>
                </PanelRail>
              </PanelGrid>
            ) : null}

            {hasCornerRadius && !isMulti && node ? (
              <PanelGrid columns="two-rail" className="mt-1.5" data-corner-grid>
                <VariableNumberField
                  label="TL"
                  value={node.topLeftRadius}
                  min={0}
                  nodeId={node.id}
                  bindingPath="topLeftRadius"
                  onValueChange={(next) => actions.updateCornerProp('topLeftRadius', next)}
                  onCommit={(next, previous) =>
                    actions.commitCornerProp('topLeftRadius', next, previous)
                  }
                />
                <VariableNumberField
                  label="TR"
                  value={node.topRightRadius}
                  min={0}
                  nodeId={node.id}
                  bindingPath="topRightRadius"
                  onValueChange={(next) => actions.updateCornerProp('topRightRadius', next)}
                  onCommit={(next, previous) =>
                    actions.commitCornerProp('topRightRadius', next, previous)
                  }
                />
                <PanelRail>
                  <IconButton
                    label={panels.independentCornerRadii}
                    size="md"
                    active
                    onClick={actions.toggleIndependentCorners}
                  >
                    <IconLucideSquareRoundCorner className="size-3" />
                  </IconButton>
                </PanelRail>
                <VariableNumberField
                  label="BL"
                  value={node.bottomLeftRadius}
                  min={0}
                  nodeId={node.id}
                  bindingPath="bottomLeftRadius"
                  onValueChange={(next) => actions.updateCornerProp('bottomLeftRadius', next)}
                  onCommit={(next, previous) =>
                    actions.commitCornerProp('bottomLeftRadius', next, previous)
                  }
                />
                <VariableNumberField
                  label="BR"
                  value={node.bottomRightRadius}
                  min={0}
                  nodeId={node.id}
                  bindingPath="bottomRightRadius"
                  onValueChange={(next) => actions.updateCornerProp('bottomRightRadius', next)}
                  onCommit={(next, previous) =>
                    actions.commitCornerProp('bottomRightRadius', next, previous)
                  }
                />
                <PanelRail />
              </PanelGrid>
            ) : null}

            {hasCornerRadius ? (
              <PanelGrid columns="fill" className="mt-1.5">
                <PanelFieldGroup label={panels.cornerSmoothing}>
                  <NumberField
                    suffix="%"
                    value={cornerSmoothingPercent}
                    min={0}
                    max={100}
                    aria-label={panels.cornerSmoothing}
                    data-property="corner-smoothing"
                    icon={<IconLucideSquircle className="size-3" />}
                    onValueChange={(next) =>
                      actions.updateCornerProp('cornerSmoothing', next / 100)
                    }
                    onCommit={(next, previous) =>
                      actions.commitCornerProp('cornerSmoothing', next / 100, previous / 100)
                    }
                  />
                </PanelFieldGroup>
              </PanelGrid>
            ) : null}
          </PanelSection>
        ) : null
      }
    </AppearanceControlsRoot>
  )
})

AppearanceSection.displayName = 'AppearanceSection'
export default AppearanceSection
