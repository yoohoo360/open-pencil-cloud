import type { ElementType, ReactNode } from 'react'

export type SegmentedControlMode = 'single' | 'multiple' | 'action'
export type SegmentedControlOrientation = 'horizontal' | 'vertical'

export interface SegmentedControlRootProps {
  /** Selection behavior or stateless action behavior. @default 'single' */
  mode?: SegmentedControlMode
  /** Controlled selected value or values. */
  modelValue?: string | string[]
  /** Arrow-key navigation axis. @default 'horizontal' */
  orientation?: SegmentedControlOrientation
  /** Disable every item. @default false */
  disabled?: boolean
  /** Require a value in single-selection mode. @default false */
  required?: boolean
  /** Enable arrow-key roving focus. @default true */
  rovingFocus?: boolean
  /** Wrap keyboard focus at the first and last item. @default true */
  loop?: boolean
}

export interface SegmentedControlItemProps {
  /** Stable selection or action identifier. */
  value: string
  /** Disable this item. @default false */
  disabled?: boolean
  /** Element or component rendered by this item. @default 'button' */
  as?: ElementType
  /** Merge item behavior into the single child element. @default false */
  asChild?: boolean
}

export interface SegmentedControlItemSlotProps {
  value: string
  selected: boolean
  disabled: boolean
  mode: SegmentedControlMode
}

export interface SegmentedControlContext {
  mode: SegmentedControlMode
  modelValue: string | string[] | undefined
  disabled: boolean
  selected(value: string): boolean
  activate(value: string): void
}
