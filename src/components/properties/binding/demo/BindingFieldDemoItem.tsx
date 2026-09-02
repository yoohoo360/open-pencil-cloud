import { BindableValueRoot, NumberFieldInput, NumberFieldRoot, NumberFieldValue } from '@open-pencil/react'
import type { BindingProvider, BindingTarget, BoundEditPolicy } from '@open-pencil/react'

import { VariableBindingPicker } from '@/components/properties/binding/VariableBindingPicker'
import { BindingPill } from '@/components/ui/binding'

interface BindingFieldDemoItemProps {
  value: number
  onChange: (value: number) => void
  provider: BindingProvider<number>
  targets: BindingTarget[]
  label: string
  policy?: BoundEditPolicy
  disabled?: boolean
  derived?: boolean
}

function tooltip(variableName: string, resolvedValue: unknown): string {
  return typeof resolvedValue === 'number' ? `${variableName} · ${resolvedValue}px` : variableName
}

export function BindingFieldDemoItem({
  value,
  onChange,
  provider,
  targets,
  label,
  policy = 'detach-on-edit',
  disabled = false,
  derived = false
}: BindingFieldDemoItemProps) {
  return (
    <BindableValueRoot<number> provider={provider} targets={targets} value={value} policy={policy}>
      {(binding) => (
        <NumberFieldRoot
          value={value}
          onChange={onChange}
          onCommit={onChange}
          aria-label={label}
          disabled={disabled}
        >
          {({ attrs, editing, actions }) => (
            <div
              {...attrs}
              {...binding.stateAttrs}
              data-story-control=""
              className={`group/binding flex h-control min-w-0 items-center rounded-panel border border-transparent bg-panel-field text-xs text-surface outline-none hover:bg-panel-field-hover focus-within:border-panel-focus ${derived ? 'text-muted' : ''}`}
              {...(derived ? { 'data-derived': '' } : {})}
              onPointerDown={(e) => {
                if (!editing && !(e.target as HTMLElement)?.closest?.('button')) {
                  actions.startScrub(e.nativeEvent)
                }
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
                  ) : (display.isMixed ? (
                    <span className="min-w-0 flex-1 truncate px-1 text-muted">Mixed</span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate px-1">{display.value}</span>
                  ))
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
}
