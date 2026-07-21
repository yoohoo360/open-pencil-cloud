import {
  BindableValueRoot,
  NumberFieldInput,
  NumberFieldRoot,
  NumberFieldValue,
  type BindingProvider,
  type BindingTarget,
  type BoundEditPolicy
} from '@open-pencil/react'
import { memo } from 'react'

import VariableBindingPicker from '@/components/properties/binding/VariableBindingPicker'
import { BindingPill } from '@/components/ui/binding'

function tooltip(variableName: string, resolvedValue: unknown) {
  return typeof resolvedValue === 'number' ? `${variableName} · ${resolvedValue}px` : variableName
}

export type BindingFieldDemoItemProps = {
  provider: BindingProvider<number>
  targets: BindingTarget[]
  label: string
  value: number
  policy?: BoundEditPolicy
  disabled?: boolean
  derived?: boolean
  onValueChange: (value: number) => void
}

export const BindingFieldDemoItem = memo(function BindingFieldDemoItem({
  provider,
  targets,
  label,
  value,
  policy = 'detach-on-edit',
  disabled = false,
  derived = false,
  onValueChange
}: BindingFieldDemoItemProps) {
  return (
    <BindableValueRoot provider={provider} targets={targets} value={value} policy={policy}>
      {(binding) => (
        <NumberFieldRoot
          modelValue={value}
          ariaLabel={label}
          disabled={disabled}
          onValueChange={onValueChange}
        >
          {({ attrs, editing, actions }) => (
            <div
              {...attrs}
              {...binding.stateAttrs}
              data-story-control
              className="group/binding flex h-6 min-w-0 items-center rounded border border-transparent bg-panel-field text-xs text-surface outline-none hover:bg-panel-field-hover focus-within:border-panel-focus data-[derived]:text-muted"
              data-derived={derived ? '' : undefined}
              onPointerDown={(event) => {
                if (editing) return
                if ((event.target as HTMLElement).closest('button')) return
                actions.startScrub(event.nativeEvent)
              }}
            >
              <NumberFieldInput className="min-w-0 flex-1 border-0 bg-transparent px-2 outline-none" />
              <NumberFieldValue className="flex min-w-0 flex-1 items-center overflow-hidden px-1">
                {(display) =>
                  binding.state === 'bound' && binding.variable ? (
                    <BindingPill
                      label={binding.variable.name}
                      tooltip={tooltip(binding.variable.name, binding.resolvedValue)}
                      disabled={disabled}
                      derived={derived}
                    />
                  ) : display.isMixed ? (
                    <span className="min-w-0 flex-1 truncate px-1 text-muted">Mixed</span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate px-1">{display.value}</span>
                  )
                }
              </NumberFieldValue>
              <VariableBindingPicker
                triggerLabel="Apply variable"
                searchPlaceholder="Search variables"
                emptyLabel="No variables found"
                detachLabel="Detach variable"
                createLabel="Create number variable"
                createNamePlaceholder="Variable name"
                createSubmitLabel="Create"
                disabled={disabled}
                derived={derived}
              />
            </div>
          )}
        </NumberFieldRoot>
      )}
    </BindableValueRoot>
  )
})

BindingFieldDemoItem.displayName = 'BindingFieldDemoItem'
export default BindingFieldDemoItem
