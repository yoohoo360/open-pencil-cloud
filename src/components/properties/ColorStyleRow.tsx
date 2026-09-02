import type { HTMLAttributes, ReactNode } from 'react'

import IconEye from '~icons/lucide/eye'
import IconEyeOff from '~icons/lucide/eye-off'
import IconMinus from '~icons/lucide/minus'

import { NumberField } from '@/components/inputs/NumberField'
import { BoundVariableButton } from '@/components/properties/BoundVariableButton'
import { VariablePickerPopover } from '@/components/properties/VariablePickerPopover'
import { IconButton } from '@/components/ui/IconButton'
import { Tip } from '@/components/ui/Tip'
import { useI18n } from '@open-pencil/react'
import { colorToHexRaw } from '@open-pencil/core/color'

import { opacityFromPercent, opacityPercent, variableSwatchBackground } from '@/components/properties/color-style-row'
import type { ColorVariableBindingApi } from '@/components/properties/color-style-row'
import type { Color } from '@open-pencil/scene-graph/primitives'

interface ColorStyleRowProps extends HTMLAttributes<HTMLDivElement> {
  item: { opacity: number; visible: boolean }
  index: number
  activeNodeId?: string | null
  bindingApi: ColorVariableBindingApi
  variableColor?: Color
  removeLabel: string
  onPatch?: (changes: Record<string, unknown>) => void
  onToggleVisibility?: () => void
  onRemove?: () => void
  children?: ReactNode
}

export function ColorStyleRow({
  item,
  index,
  activeNodeId,
  bindingApi,
  variableColor,
  removeLabel,
  onPatch,
  onToggleVisibility,
  onRemove,
  children,
  ...attrs
}: ColorStyleRowProps) {
  const { panels, dialogs } = useI18n()

  const testPrefix = () => {
    const rowId = attrs['data-test-id'] as string | undefined
    if (rowId === 'stroke-item') return 'stroke'
    return 'fill'
  }

  const visibilityDataTestId = `${testPrefix()}-visibility-${index}`
  const applyVariableDataTestId = `${testPrefix()}-apply-variable-${index}`
  const unbindDataTestId = `${testPrefix()}-unbind-variable`

  const hasBoundVariable = activeNodeId ? !!bindingApi.getBoundVariable(activeNodeId, index) : false
  const hasVariables = bindingApi.colorVariables.value.length > 0
  const canCreate = !!(variableColor && bindingApi.createAndBindVariable)
  const showPicker = activeNodeId && (hasVariables || canCreate) && !hasBoundVariable

  return (
    <div {...attrs} className="group flex items-center gap-1.5 py-0.5">
      <div className="min-w-0 flex flex-1 items-center gap-1.5">
        {children}
      </div>

      <Tip label={panels.opacity}>
        <NumberField
          className="w-12 shrink-0"
          suffix="%"
          value={opacityPercent(item.opacity)}
          min={0}
          max={100}
          onChange={(v) => onPatch?.({ opacity: opacityFromPercent(v) })}
        />
      </Tip>

      {showPicker && (
        <VariablePickerPopover
          searchTerm={bindingApi.searchTerm.value}
          variables={bindingApi.filteredVariables.value}
          triggerLabel={panels.applyVariable}
          searchPlaceholder={dialogs.search}
          emptyLabel={panels.noVariablesFound}
          data-test-id={applyVariableDataTestId}
          createLabel={
            variableColor && bindingApi.createAndBindVariable
              ? panels.createColorVariable({ value: colorToHexRaw(variableColor) })
              : undefined
          }
          createNamePlaceholder={panels.variableName}
          createSubmitLabel={panels.create}
          createDefaultName={bindingApi.searchTerm.value}
          swatchBackground={(variableId) => variableSwatchBackground(bindingApi, variableId)}
          onSearchTermChange={(term) => { bindingApi.searchTerm.value = term }}
          onSelect={(variable) => {
            if (activeNodeId) bindingApi.bindVariable(activeNodeId, index, variable.id)
          }}
          onCreate={(name) => {
            if (activeNodeId && variableColor && bindingApi.createAndBindVariable) {
              bindingApi.createAndBindVariable(activeNodeId, index, variableColor, name)
            }
          }}
        />
      )}

      {activeNodeId && hasBoundVariable && (
        <BoundVariableButton
          data-test-id={unbindDataTestId}
          label={panels.detachVariable}
          onDetach={() => bindingApi.unbindVariable(activeNodeId, index)}
        />
      )}

      <Tip label={panels.toggleVisibility}>
        <button
          data-test-id={visibilityDataTestId}
          data-visible={item.visible ? 'true' : 'false'}
          className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-muted hover:text-surface"
          onClick={onToggleVisibility}
        >
          {item.visible ? (
            <IconEye data-test-id="visibility-icon-on" className="size-3.5" />
          ) : (
            <IconEyeOff data-test-id="visibility-icon-off" className="size-3.5" />
          )}
        </button>
      </Tip>

      <IconButton label={removeLabel} className="shrink-0" onClick={onRemove}>
        <IconMinus className="size-3.5" />
      </IconButton>
    </div>
  )
}
