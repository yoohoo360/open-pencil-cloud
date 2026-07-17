import type { ElementType, ReactNode } from 'react'

import type { Variable } from '@open-pencil/scene-graph'

import type {
  BindingMutationSource,
  BindingProvider,
  BindingState,
  BindingTarget,
  BoundEditPolicy
} from '#react/controls/binding-provider/types'

export interface BindableValueTriggerProps {
  as?: ElementType
  asChild?: boolean
  children?: ReactNode | ((props: BindableValueSlotProps) => ReactNode)
}

export interface BindableValueRootProps<V = unknown> {
  provider?: BindingProvider<V>
  targets: BindingTarget[]
  value: V
  policy?: BoundEditPolicy
  batchLabel?: string
  children?: ReactNode | ((props: BindableValueSlotProps<V>) => ReactNode)
}

export interface BindableValueStateAttrs {
  'data-unbound'?: ''
  'data-bound'?: ''
  'data-mixed'?: ''
  'data-picker-open'?: ''
  'data-policy': BoundEditPolicy
}

export interface BindableValueActions<V = unknown> {
  bind(variableId: string): void
  unbind(): void
  create(name: string): void
  openPicker(): void
  closePicker(): void
  togglePicker(): void
  setSearchTerm(term: string): void
  beginMutation(source: BindingMutationSource): boolean
  applyValue(value: V): boolean
  commitMutation(): void
  cancelMutation(): void
}

export interface BindableValueSlotProps<V = unknown> {
  state: BindingState
  variable: Variable | undefined
  resolvedValue: V | undefined
  policy: BoundEditPolicy
  open: boolean
  searchTerm: string
  variables: Variable[]
  stateAttrs: BindableValueStateAttrs
  actions: BindableValueActions<V>
}

export type BindableValueRootSlots<V = unknown> =
  | ReactNode
  | ((props: BindableValueSlotProps<V>) => ReactNode)

export interface BindableValueContext<V = unknown> {
  provider: BindingProvider<V>
  targets: BindingTarget[]
  value: V
  state: BindingState
  variable: Variable | undefined
  resolvedValue: V | undefined
  policy: BoundEditPolicy
  open: boolean
  searchTerm: string
  variables: Variable[]
  stateAttrs: BindableValueStateAttrs
  slotProps: BindableValueSlotProps<V>
  actions: BindableValueActions<V>
}
