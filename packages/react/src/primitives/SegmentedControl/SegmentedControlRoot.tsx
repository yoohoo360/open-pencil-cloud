import * as RovingFocus from '@radix-ui/react-roving-focus'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'

import { SegmentedControlProvider } from '#react/primitives/SegmentedControl/context'
import type {
  SegmentedControlMode,
  SegmentedControlRootProps
} from '#react/primitives/SegmentedControl/types'

type RootRenderProps = {
  mode: SegmentedControlMode
  modelValue: string | string[] | undefined
}

export type SegmentedControlRootComponentProps = SegmentedControlRootProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> & {
    children?: ReactNode | ((props: RootRenderProps) => ReactNode)
    onValueChange?: (value: string | string[] | undefined) => void
    onAction?: (value: string) => void
  }

export const SegmentedControlRoot = memo(function SegmentedControlRoot({
  mode = 'single',
  modelValue,
  orientation = 'horizontal',
  disabled = false,
  required = false,
  rovingFocus = true,
  loop = true,
  children,
  onValueChange,
  onAction,
  ...props
}: SegmentedControlRootComponentProps) {
  const { dir: _dir, defaultValue: _defaultValue, ...rootProps } = props
  const context = useMemo(
    () => ({
      mode,
      modelValue,
      disabled,
      selected: (value: string) =>
        Array.isArray(modelValue) ? modelValue.includes(value) : modelValue === value,
      activate: (value: string) => {
        if (!disabled) onAction?.(value)
      }
    }),
    [disabled, mode, modelValue, onAction]
  )
  const content = typeof children === 'function' ? children({ mode, modelValue }) : children

  if (mode === 'single') {
    return (
      <SegmentedControlProvider value={context}>
        <ToggleGroup.Root
          {...rootProps}
          type="single"
          value={typeof modelValue === 'string' ? modelValue : ''}
          orientation={orientation}
          disabled={disabled}
          rovingFocus={rovingFocus}
          loop={loop}
          data-slot="root"
          data-mode="single"
          onValueChange={(value) => {
            if (required && !value) return
            onValueChange?.(value || undefined)
          }}
        >
          {content}
        </ToggleGroup.Root>
      </SegmentedControlProvider>
    )
  }

  if (mode === 'multiple') {
    return (
      <SegmentedControlProvider value={context}>
        <ToggleGroup.Root
          {...rootProps}
          type="multiple"
          value={Array.isArray(modelValue) ? modelValue : []}
          orientation={orientation}
          disabled={disabled}
          rovingFocus={rovingFocus}
          loop={loop}
          data-slot="root"
          data-mode="multiple"
          onValueChange={onValueChange}
        >
          {content}
        </ToggleGroup.Root>
      </SegmentedControlProvider>
    )
  }

  return (
    <SegmentedControlProvider value={context}>
      <RovingFocus.Root
        {...rootProps}
        orientation={orientation}
        loop={loop}
        role="group"
        data-slot="root"
        data-mode="action"
      >
        {content}
      </RovingFocus.Root>
    </SegmentedControlProvider>
  )
})

SegmentedControlRoot.displayName = 'SegmentedControlRoot'
