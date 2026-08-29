import type { ReactNode } from 'react'

import { NumberField } from '#react/components/inputs/NumberField'
import { VariableBindingPicker } from '#react/components/properties/binding/VariableBindingPicker'
import { BindingPill } from '#react/components/ui/binding/BindingPill'
import { useBindingFieldUI } from '#react/components/ui/binding/ui'
import { useNumberBindingProvider } from '#react/controls/binding/number'
import type { NumberBindingPath } from '#react/controls/binding/types'
import { useI18n } from '#react/i18n'
import { BindableValueRoot } from '#react/primitives/BindableValue/BindableValueRoot'

export function VariableNumberField({
  value,
  min,
  max,
  icon,
  suffix,
  afterVariable,
  disabled,
  nodeId,
  bindingPath,
  'aria-label': ariaLabel,
  'data-property': dataProperty,
  onCommit
}: {
  value: number
  min?: number
  max?: number
  icon?: ReactNode
  suffix?: string
  afterVariable?: ReactNode
  disabled?: boolean
  nodeId: string
  bindingPath: NumberBindingPath
  'aria-label'?: string
  'data-property'?: string
  onCommit: (value: number, previous: number) => void
}) {
  const { panels, dialogs } = useI18n()
  const provider = useNumberBindingProvider()
  const bindingStyles = useBindingFieldUI()

  return (
    <BindableValueRoot
      provider={provider}
      targets={[{ nodeId, path: bindingPath }]}
      value={typeof value === 'number' ? value : 0}
    >
      {(binding) => {
        const displayValue =
          binding.state === 'bound' && typeof binding.resolvedValue === 'number'
            ? binding.resolvedValue
            : value
        return (
          <NumberField
            className={bindingStyles.root}
            icon={icon}
            suffix={suffix}
            min={min}
            max={max}
            value={displayValue}
            disabled={disabled}
            data-property={dataProperty ?? bindingPath}
            aria-label={ariaLabel ?? bindingPath}
            boundDisplay={
              binding.variable ? (
                <BindingPill
                  label={binding.variable.name}
                  tooltip={
                    typeof binding.resolvedValue === 'number'
                      ? `${binding.variable.name} · ${binding.resolvedValue}${suffix ?? ''}`
                      : binding.variable.name
                  }
                />
              ) : undefined
            }
            trailing={
              <span className={`flex items-center ${afterVariable ? '' : 'pr-1'}`}>
                <VariableBindingPicker
                  triggerLabel={panels.applyVariable}
                  searchPlaceholder={dialogs.search}
                  emptyLabel={panels.noVariablesFound}
                  detachLabel={panels.detachVariable}
                  createLabel={panels.createNumberVariable({
                    value: Math.round(typeof value === 'number' ? value : 0)
                  })}
                  createNamePlaceholder={panels.variableName}
                  createSubmitLabel={panels.create}
                />
                {afterVariable}
              </span>
            }
            onCommit={onCommit}
          />
        )
      }}
    </BindableValueRoot>
  )
}
