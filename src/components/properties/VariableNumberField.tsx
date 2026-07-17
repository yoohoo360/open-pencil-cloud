import { useMemo, type ReactNode, type HTMLAttributes } from 'react'

import { BindableValueRoot, useI18n, useNumberBindingProvider } from '@open-pencil/react'
import { BindingPill, useBindingFieldUI } from '@/components/ui/binding'

import { NumberField } from '@/components/inputs/NumberField'
import { VariableBindingPicker } from '@/components/properties/binding/VariableBindingPicker'

import type { NumberBindingPath, BindingTarget } from '@open-pencil/react'

interface VariableNumberFieldProps extends HTMLAttributes<HTMLDivElement> {
  value: number | symbol
  min?: number
  max?: number
  step?: number
  icon?: string
  iconSlot?: ReactNode
  label?: string
  suffix?: string
  sensitivity?: number
  placeholder?: string
  nodeId: string
  bindingPath: NumberBindingPath
  onChange?: (value: number) => void
  onCommit?: (value: number, previous: number) => void
  afterVariable?: ReactNode
}

export function VariableNumberField({
  value,
  min,
  max,
  step,
  icon,
  iconSlot,
  label,
  suffix,
  sensitivity,
  placeholder,
  nodeId,
  bindingPath,
  onChange,
  onCommit,
  afterVariable,
  className,
  ...attrs
}: VariableNumberFieldProps) {
  const { panels, dialogs } = useI18n()
  const provider = useNumberBindingProvider()
  const bindingStyles = useBindingFieldUI()

  const targets = useMemo<BindingTarget[]>(
    () => [{ nodeId, path: bindingPath }],
    [nodeId, bindingPath]
  )

  const ariaLabel = (attrs['aria-label'] as string | undefined) ?? label ?? bindingPath

  return (
    <BindableValueRoot
      provider={provider}
      targets={targets}
      value={typeof value === 'number' ? value : 0}
    >
      {(binding) => (
        <NumberField
          icon={icon}
          iconSlot={iconSlot}
          label={label}
          suffix={suffix}
          sensitivity={sensitivity}
          placeholder={placeholder}
          value={value}
          min={min}
          max={max}
          step={step}
          ui={{ root: bindingStyles.root }}
          data-property={bindingPath}
          aria-label={ariaLabel}
          className={className}
          onChange={onChange}
          onCommit={onCommit}
          bound={binding.state === 'bound'}
          boundSlot={
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
          suffixSlot={
            <>
              <span className={afterVariable ? '' : 'pr-1'} style={{ display: 'flex', alignItems: 'center' }}>
                <VariableBindingPicker
                  triggerLabel={panels.applyVariable}
                  searchPlaceholder={dialogs.search}
                  emptyLabel={panels.noVariablesFound}
                  detachLabel={panels.detachVariable}
                  createLabel={panels.createNumberVariable({
                    value: typeof value === 'number' ? Math.round(value) : 0
                  })}
                  createNamePlaceholder={panels.variableName}
                  createSubmitLabel={panels.create}
                />
              </span>
              {afterVariable}
            </>
          }
        />
      )}
    </BindableValueRoot>
  )
}
