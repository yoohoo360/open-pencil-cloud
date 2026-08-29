import type { Variable } from '@open-pencil/scene-graph'

import type {
  BindingMutationSource,
  BindingProvider,
  BindingState,
  BindingTarget,
  BoundEditPolicy
} from '#react/controls/binding/types'

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

export interface BindableValueContext<V = unknown> extends BindableValueSlotProps<V> {
  provider: BindingProvider<V>
  targets: BindingTarget[]
  value: V
}
