import type { ReactNode, RefObject } from 'react'

import type { NumberExpressionError } from '#react/controls/number-expression'

export type NumberFieldEditPolicy = 'editable' | 'readonly' | 'detach-on-edit'
export type NumberFieldMutationSource = 'edit' | 'scrub' | 'step'

export interface NumberFieldRootProps {
  modelValue: number | symbol
  min?: number
  max?: number
  step?: number
  sensitivity?: number
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
  bound?: boolean
  editPolicy?: NumberFieldEditPolicy
  onChange?: (value: number) => void
  onCommit?: (value: number, previous: number) => void
  onEditingChange?: (editing: boolean) => void
  onInvalid?: (expression: string, reason: NumberExpressionError) => void
  onDetachRequest?: (source: NumberFieldMutationSource) => void
  children?: ReactNode | ((props: NumberFieldSlotProps) => ReactNode)
}

export interface NumberFieldRootEmits {
  (event: 'update:modelValue', value: number): void
  (event: 'commit', value: number, previous: number): void
  (event: 'editing-change', editing: boolean): void
  (event: 'invalid', expression: string, reason: NumberExpressionError): void
  (event: 'detach-request', source: NumberFieldMutationSource): void
}

export interface NumberFieldState {
  editing: boolean
  scrubbing: boolean
  mixed: boolean
  disabled: boolean
  bound: boolean
}

export interface NumberFieldStateAttrs {
  'data-editing'?: ''
  'data-scrubbing'?: ''
  'data-mixed'?: ''
  'data-disabled'?: ''
  'data-bound'?: ''
}

export interface NumberFieldRootAttrs extends NumberFieldStateAttrs {
  role: 'spinbutton' | undefined
  tabIndex: 0 | -1 | undefined
  'aria-valuenow'?: number
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-disabled'?: 'true'
  'aria-label'?: string
  onFocus: () => void
  onKeyDown: (event: KeyboardEvent) => void
}

export interface NumberFieldActions {
  startScrub(event: PointerEvent): void
  startEdit(): void
  cancelEdit(): void
  commitEdit(event?: Event): void
  setDraft(value: string): void
  input(event: Event): void
  keydown(event: KeyboardEvent): void
}

export interface NumberFieldSlotProps extends NumberFieldState {
  modelValue: number | symbol
  displayValue: string
  draftValue: string
  isMixed: boolean
  placeholder: string
  state: NumberFieldState
  attrs: NumberFieldRootAttrs
  actions: NumberFieldActions
}

export type NumberFieldRootSlots = ReactNode | ((props: NumberFieldSlotProps) => ReactNode)
export type NumberFieldValueSlots = ReactNode | ((props: NumberFieldSlotProps & { value: string }) => ReactNode)

export interface NumberFieldContext {
  modelValue: number | symbol
  numericValue: number
  displayValue: string
  draftValue: string
  isMixed: boolean
  editing: boolean
  scrubbing: boolean
  disabled: boolean
  bound: boolean
  min: number
  max: number
  step: number
  ariaLabel: string | undefined
  inputRef: RefObject<HTMLInputElement | null>
  state: NumberFieldState
  stateAttrs: NumberFieldStateAttrs
  rootAttrs: NumberFieldRootAttrs
  slotProps: NumberFieldSlotProps
  actions: NumberFieldActions
  invalidReason: NumberExpressionError | null
}
