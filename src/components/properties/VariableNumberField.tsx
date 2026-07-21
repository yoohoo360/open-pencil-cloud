import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import type { ClassValue } from 'tailwind-variants'

import {
  BindableValueRoot,
  useI18n,
  useNumberBindingProvider,
  type BindingTarget,
  type NumberBindingPath
} from '@open-pencil/react'

import NumberField, { type NumberFieldProps } from '@/components/inputs/NumberField'
import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'
import { BindingPill, useBindingFieldUI } from '@/components/ui/binding'

export type VariableNumberFieldProps = {
  value: number | symbol
  min?: number
  max?: number
  step?: number
  icon?: ReactNode
  label?: string
  suffix?: string
  sensitivity?: number
  placeholder?: string
  nodeId: string
  bindingPath: NumberBindingPath
  afterVariable?: ReactNode
  className?: ClassValue
  onValueChange?: (value: number) => void
  onCommit?: (value: number, previous: number) => void
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'>

export const VariableNumberField = memo(function VariableNumberField({
  value,
  min,
  max,
  step,
  icon,
  label,
  suffix,
  sensitivity,
  placeholder,
  nodeId,
  bindingPath,
  afterVariable,
  onValueChange,
  onCommit,
  'aria-label': ariaLabel,
  className,
  ...rest
}: VariableNumberFieldProps) {
  const { panels, dialogs } = useI18n()
  const provider = useNumberBindingProvider()
  const bindingStyles = useBindingFieldUI()
  const targets = useMemo<BindingTarget[]>(() => [{ nodeId, path: bindingPath }], [bindingPath, nodeId])
  const accessibleLabel = ariaLabel ?? label ?? bindingPath
  const numericValue = typeof value === 'number' ? value : 0

  function bindingTooltip(name: string, resolvedValue: unknown) {
    if (typeof resolvedValue !== 'number') return name
    return `${name} · ${resolvedValue}${suffix ?? ''}`
  }

  return (
    <BindableValueRoot provider={provider} targets={targets} value={numericValue}>
      {(binding) => (
        <NumberField
          {...({
            ...rest,
            className,
            icon,
            label,
            suffix,
            sensitivity,
            placeholder,
            value,
            min,
            max,
            step,
            ui: { root: bindingStyles.root },
            'data-property': bindingPath,
            'aria-label': accessibleLabel,
            boundContent: binding.variable ? (
              <BindingPill
                label={binding.variable.name}
                tooltip={bindingTooltip(binding.variable.name, binding.resolvedValue)}
              />
            ) : undefined,
            suffixContent: (
              <>
                <span className={`flex items-center ${afterVariable ? '' : 'pr-1'}`}>
                  <VariableBindingPicker
                    triggerLabel={panels.applyVariable}
                    searchPlaceholder={dialogs.search}
                    emptyLabel={panels.noVariablesFound}
                    detachLabel={panels.detachVariable}
                    createLabel={panels.createNumberVariable({ value: Math.round(numericValue) })}
                    createNamePlaceholder={panels.variableName}
                    createSubmitLabel={panels.create}
                  />
                </span>
                {afterVariable}
              </>
            ),
            onValueChange,
            onCommit
          } as NumberFieldProps)}
        />
      )}
    </BindableValueRoot>
  )
})

VariableNumberField.displayName = 'VariableNumberField'
export default VariableNumberField
