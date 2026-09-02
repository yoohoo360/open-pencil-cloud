import type { ReactNode, ElementType } from 'react'

export type SegmentedControlMode = 'single' | 'multiple' | 'action'
export type SegmentedControlOrientation = 'horizontal' | 'vertical'

export interface SegmentedControlRootProps {
  mode?: SegmentedControlMode
  value?: string | string[]
  orientation?: SegmentedControlOrientation
  disabled?: boolean
  required?: boolean
  rovingFocus?: boolean
  loop?: boolean
  onValueChange?: (value: string | string[] | undefined) => void
  onAction?: (value: string) => void
  children?: ReactNode
}

export interface SegmentedControlItemProps {
  value: string
  disabled?: boolean
  as?: ElementType
  asChild?: boolean
  children?: ReactNode | ((props: SegmentedControlItemSlotProps) => ReactNode)
}

export interface SegmentedControlItemSlotProps {
  value: string
  selected: boolean
  disabled: boolean
  mode: SegmentedControlMode
}

export type SegmentedControlItemSlots =
  | ReactNode
  | ((props: SegmentedControlItemSlotProps) => ReactNode)

export type SegmentedControlRootSlots = ReactNode

export interface SegmentedControlContext {
  mode: SegmentedControlMode
  value: string | string[] | undefined
  disabled: boolean
  selected(value: string): boolean
  activate(value: string): void
}
