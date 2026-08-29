import { colorToHexRaw } from '@open-pencil/core/color'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { ColorRow } from '#react/components/properties/ColorRow'
import { VariableBindingPicker } from '#react/components/properties/binding/VariableBindingPicker'
import {
  applyPaintMutation,
  commitPaintMutation,
  paintBindingTargets,
  type PaintBindingKind
} from '#react/components/properties/paint/binding'
import { BindingPill } from '#react/components/ui/binding/BindingPill'
import { useColorBindingProvider } from '#react/controls/binding/color'
import { useI18n } from '#react/i18n'
import { BindableValueRoot } from '#react/primitives/BindableValue/BindableValueRoot'

export function BoundColorRow({
  nodeIds,
  kind,
  index,
  color,
  opacity,
  label,
  batchLabel,
  onColor,
  onOpacity
}: {
  nodeIds: string[]
  kind: PaintBindingKind
  index: number
  color: Color
  opacity: number
  label: string
  batchLabel: string
  onColor: (color: Color) => void
  onOpacity?: (opacity: number) => void
}) {
  const { panels, dialogs } = useI18n()
  const colorProvider = useColorBindingProvider()

  return (
    <BindableValueRoot
      provider={colorProvider}
      targets={paintBindingTargets(nodeIds, kind, index)}
      value={color}
      batchLabel={batchLabel}
    >
      {(binding) => {
        const displayColor = binding.resolvedValue ?? color
        function updateColor(next: Color) {
          applyPaintMutation(binding.actions, () => {}, () => onColor(next))
          commitPaintMutation(binding.actions)
        }
        return (
          <ColorRow
            color={displayColor}
            opacity={opacity}
            label={label}
            boundDisplay={
              binding.variable ? (
                <BindingPill
                  label={binding.variable.name}
                  tooltip={`${binding.variable.name} · #${colorToHexRaw(displayColor)}`}
                />
              ) : undefined
            }
            trailing={
              <VariableBindingPicker
                triggerLabel={panels.applyVariable}
                searchPlaceholder={dialogs.search}
                emptyLabel={panels.noVariablesFound}
                detachLabel={panels.detachVariable}
                createLabel={panels.createColorVariable({
                  value: `#${colorToHexRaw(color)}`
                })}
                createNamePlaceholder={panels.variableName}
                createSubmitLabel={panels.create}
              />
            }
            onColor={updateColor}
            onOpacity={onOpacity}
          />
        )
      }}
    </BindableValueRoot>
  )
}
