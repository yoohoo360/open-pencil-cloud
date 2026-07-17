import type { ReactNode } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'

import { ProvideSegmentedControl } from '#react/primitives/SegmentedControl/context'
import type {
  SegmentedControlContext,
  SegmentedControlRootProps
} from '#react/primitives/SegmentedControl/types'

export function SegmentedControlRoot({
  mode = 'single',
  value: valueProp,
  orientation = 'horizontal',
  disabled = false,
  required = false,
  rovingFocus = true,
  loop = true,
  onValueChange,
  onAction,
  children,
  ...attrs
}: SegmentedControlRootProps & { [key: string]: unknown }) {
  function selected(value: string): boolean {
    if (Array.isArray(valueProp)) return valueProp.includes(value)
    return valueProp === value
  }

  function activate(value: string) {
    if (!disabled) onAction?.(value)
  }

  function handleSingleChange(value: string) {
    if (required && !value) return
    onValueChange?.(value || undefined)
  }

  function handleMultipleChange(values: string[]) {
    onValueChange?.(values)
  }

  const ctx: SegmentedControlContext = { mode, value: valueProp, disabled, selected, activate }

  const renderChildren = (slotValue: { mode: typeof mode; value: typeof valueProp }): ReactNode =>
    typeof children === 'function'
      ? (children as (p: typeof slotValue) => ReactNode)(slotValue)
      : children

  if (mode === 'single') {
    return (
      <ProvideSegmentedControl value={ctx}>
        <ToggleGroup.Root
          {...attrs}
          type="single"
          value={typeof valueProp === 'string' ? valueProp : undefined}
          orientation={orientation}
          disabled={disabled}
          rovingFocus={rovingFocus}
          loop={loop}
          data-slot="root"
          data-mode="single"
          onValueChange={handleSingleChange}
        >
          {renderChildren({ mode, value: valueProp })}
        </ToggleGroup.Root>
      </ProvideSegmentedControl>
    )
  }

  if (mode === 'multiple') {
    return (
      <ProvideSegmentedControl value={ctx}>
        <ToggleGroup.Root
          {...attrs}
          type="multiple"
          value={Array.isArray(valueProp) ? valueProp : []}
          orientation={orientation}
          disabled={disabled}
          rovingFocus={rovingFocus}
          loop={loop}
          data-slot="root"
          data-mode="multiple"
          onValueChange={handleMultipleChange}
        >
          {renderChildren({ mode, value: valueProp })}
        </ToggleGroup.Root>
      </ProvideSegmentedControl>
    )
  }

  // action mode — stateless group
  return (
    <ProvideSegmentedControl value={ctx}>
      <div
        {...attrs}
        role="group"
        aria-orientation={orientation}
        data-slot="root"
        data-mode="action"
      >
        {renderChildren({ mode, value: valueProp })}
      </div>
    </ProvideSegmentedControl>
  )
}
