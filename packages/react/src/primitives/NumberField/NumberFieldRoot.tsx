import {
  clampNumberValue,
  evaluateNumberExpression,
  normalizeNumberValue,
  stepNumberValue
} from '#react/controls/number-expression'
import type { NumberExpressionError } from '#react/controls/number-expression'
import { useOptionalBindableValue } from '#react/primitives/BindableValue/context'
import { NumberFieldProvider } from '#react/primitives/NumberField/context'
import type {
  NumberFieldActions,
  NumberFieldContext,
  NumberFieldEditPolicy,
  NumberFieldMutationSource,
  NumberFieldRootAttrs,
  NumberFieldRootProps,
  NumberFieldSlotProps,
  NumberFieldStateAttrs
} from '#react/primitives/NumberField/types'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type * as React from 'react'

export type NumberFieldRootComponentProps = NumberFieldRootProps & {
  children?: ReactNode | ((props: NumberFieldSlotProps) => ReactNode)
  onValueChange?: (value: number) => void
  onCommit?: (value: number, previous: number) => void
  onEditingChange?: (editing: boolean) => void
  onInvalid?: (expression: string, reason: NumberExpressionError) => void
  onDetachRequest?: (source: NumberFieldMutationSource) => void
}

export const NumberFieldRoot = memo(function NumberFieldRoot({
  modelValue,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 1,
  placeholder = 'Mixed',
  ariaLabel,
  disabled = false,
  bound: boundProp = false,
  editPolicy = 'editable',
  children,
  onValueChange,
  onCommit,
  onEditingChange,
  onInvalid,
  onDetachRequest
}: NumberFieldRootComponentProps) {
  const binding = useOptionalBindableValue<number>()
  const [editing, setEditing] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [draftValue, setDraftValue] = useState('')
  const [invalidReason, setInvalidReason] = useState<NumberExpressionError | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const interaction = useRef({ start: 0, mixed: false, working: 0, requested: false })
  const isMixed = binding?.state === 'mixed' || typeof modelValue === 'symbol'
  const numericValue =
    binding?.state === 'bound' && typeof binding.resolvedValue === 'number'
      ? binding.resolvedValue
      : typeof modelValue === 'number'
        ? modelValue
        : 0
  const bound = binding ? binding.state === 'bound' : boundProp
  const effectiveEditPolicy: NumberFieldEditPolicy =
    binding?.policy === 'readonly-when-bound'
      ? 'readonly'
      : binding?.policy === 'detach-on-edit'
        ? 'detach-on-edit'
        : binding
          ? 'editable'
          : editPolicy
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1
  const canMutate = !disabled && !(bound && effectiveEditPolicy === 'readonly')
  const state = useMemo(
    () => ({ editing, scrubbing, mixed: isMixed, disabled, bound }),
    [bound, disabled, editing, isMixed, scrubbing]
  )
  const stateAttrs = useMemo<NumberFieldStateAttrs>(
    () => ({
      'data-editing': editing ? '' : undefined,
      'data-scrubbing': scrubbing ? '' : undefined,
      'data-mixed': isMixed ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
      'data-bound': bound ? '' : undefined
    }),
    [bound, disabled, editing, isMixed, scrubbing]
  )
  const requestMutation = useCallback(
    (source: NumberFieldMutationSource) => {
      if (interaction.current.requested) return true
      if (!canMutate) return false
      if (binding && !binding.actions.beginMutation(source)) return false
      if (!binding && bound && effectiveEditPolicy === 'detach-on-edit') onDetachRequest?.(source)
      interaction.current.requested = true
      return true
    },
    [binding, bound, canMutate, effectiveEditPolicy, onDetachRequest]
  )
  const beginInteraction = useCallback(() => {
    interaction.current = {
      start: numericValue,
      mixed: isMixed,
      working: numericValue,
      requested: false
    }
    setInvalidReason(null)
  }, [isMixed, numericValue])
  const updateValue = useCallback(
    (value: number) => {
      const normalized = normalizeNumberValue(clampNumberValue(value, min, max))
      interaction.current.working = normalized
      if (!binding?.actions.applyValue(normalized)) onValueChange?.(normalized)
    },
    [binding, max, min, onValueChange]
  )
  const restore = useCallback(() => {
    const current = interaction.current
    if (current.working !== current.start) {
      current.working = current.start
      if (!binding?.actions.applyValue(current.start)) onValueChange?.(current.start)
    }
  }, [binding, onValueChange])
  const cancelEdit = useCallback(() => {
    if (!editing) return
    restore()
    setInvalidReason(null)
    setEditing(false)
    binding?.actions.cancelMutation()
  }, [binding, editing, restore])
  const commitEdit = useCallback(() => {
    if (!editing) return
    const result = evaluateNumberExpression(draftValue, {
      current: interaction.current.start,
      max,
      mixed: interaction.current.mixed
    })
    if (!result.ok) {
      setInvalidReason(result.error)
      restore()
      setEditing(false)
      binding?.actions.cancelMutation()
      onInvalid?.(draftValue, result.error)
      return
    }
    updateValue(result.value)
    setEditing(false)
    if (interaction.current.working !== interaction.current.start)
      onCommit?.(interaction.current.working, interaction.current.start)
    binding?.actions.commitMutation()
  }, [binding, draftValue, editing, max, onCommit, onInvalid, restore, updateValue])
  const startEdit = useCallback(() => {
    if (editing || !canMutate) return
    beginInteraction()
    setDraftValue(isMixed ? '' : String(numericValue))
    setEditing(true)
  }, [beginInteraction, canMutate, editing, isMixed, numericValue])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    onEditingChange?.(editing)
  }, [editing, onEditingChange])
  const setDraft = useCallback(
    (value: string) => {
      if (value !== draftValue && !requestMutation('edit')) return
      setDraftValue(value)
      if (/^\s*(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i.test(value)) updateValue(Number(value))
    },
    [draftValue, requestMutation, updateValue]
  )
  const keydown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        if (!editing) beginInteraction()
        if (!requestMutation('step')) return
        event.preventDefault()
        const parsed = editing
          ? evaluateNumberExpression(draftValue, {
              current: interaction.current.start,
              max,
              mixed: interaction.current.mixed
            })
          : undefined
        const base = parsed?.ok ? parsed.value : interaction.current.working
        const next = stepNumberValue(
          base,
          event.code === 'ArrowUp' ? 1 : -1,
          safeStep,
          event.nativeEvent,
          min,
          max
        )
        updateValue(next)
        setDraftValue(String(next))
        if (!editing) {
          if (next !== interaction.current.start) onCommit?.(next, interaction.current.start)
          binding?.actions.commitMutation()
        }
        return
      }
      if (event.code === 'Enter') {
        event.preventDefault()
        commitEdit()
      }
      if (event.code === 'Escape') {
        event.preventDefault()
        cancelEdit()
      }
    },
    [
      beginInteraction,
      binding,
      cancelEdit,
      commitEdit,
      draftValue,
      editing,
      max,
      min,
      onCommit,
      requestMutation,
      safeStep,
      updateValue
    ]
  )
  const startScrub = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!canMutate) return
      event.preventDefault()
      beginInteraction()
      const target = event.currentTarget
      target.setPointerCapture(event.pointerId)
      const startX = event.clientX
      let lastX = startX
      let moved = false
      let accumulated = numericValue
      const finish = (cancelled: boolean) => {
        target.removeEventListener('pointermove', move)
        target.removeEventListener('pointerup', up)
        target.removeEventListener('pointercancel', cancel)
        if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
        document.body.style.cursor = ''
        setScrubbing(false)
        if (cancelled) {
          restore()
          binding?.actions.cancelMutation()
          return
        }
        if (!moved) {
          startEdit()
          return
        }
        if (interaction.current.working !== interaction.current.start)
          onCommit?.(interaction.current.working, interaction.current.start)
        binding?.actions.commitMutation()
      }
      const move = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) return
        const dx = moveEvent.clientX - lastX
        lastX = moveEvent.clientX
        if (!moved && Math.abs(moveEvent.clientX - startX) > 2) {
          if (!requestMutation('scrub')) return
          moved = true
          setScrubbing(true)
          document.body.style.cursor = 'ew-resize'
        }
        if (!moved) return
        accumulated += dx * safeStep * sensitivity
        updateValue(accumulated)
      }
      const up = (upEvent: PointerEvent) => {
        if (upEvent.pointerId === event.pointerId) finish(false)
      }
      const cancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId === event.pointerId) finish(true)
      }
      target.addEventListener('pointermove', move)
      target.addEventListener('pointerup', up)
      target.addEventListener('pointercancel', cancel)
    },
    [
      beginInteraction,
      binding,
      canMutate,
      numericValue,
      onCommit,
      requestMutation,
      restore,
      safeStep,
      sensitivity,
      startEdit,
      updateValue
    ]
  )
  const rootAttrs = useMemo<NumberFieldRootAttrs>(
    () => ({
      ...stateAttrs,
      role: editing ? undefined : ('spinbutton' as const),
      tabIndex: editing ? undefined : disabled ? (-1 as const) : (0 as const),
      'aria-valuenow': editing || isMixed ? undefined : numericValue,
      'aria-valuemin': !editing && Number.isFinite(min) ? min : undefined,
      'aria-valuemax': !editing && Number.isFinite(max) ? max : undefined,
      'aria-disabled': !editing && disabled ? ('true' as const) : undefined,
      'aria-label': editing ? undefined : ariaLabel,
      onFocus: startEdit,
      onKeyDown: keydown
    }),
    [ariaLabel, disabled, editing, isMixed, keydown, max, min, numericValue, startEdit, stateAttrs]
  )
  const actions = useMemo<NumberFieldActions>(
    () => ({
      startScrub: (event) => startScrub(event as unknown as React.PointerEvent<HTMLElement>),
      startEdit,
      cancelEdit,
      commitEdit,
      setDraft,
      input: (event) => setDraft((event.target as HTMLInputElement).value),
      keydown: (event) => keydown(event as unknown as React.KeyboardEvent<HTMLElement>)
    }),
    [cancelEdit, commitEdit, keydown, setDraft, startEdit, startScrub]
  )
  const slotProps = useMemo<NumberFieldSlotProps>(
    () => ({
      modelValue,
      displayValue: isMixed ? '' : String(normalizeNumberValue(numericValue)),
      draftValue,
      isMixed,
      placeholder,
      ...state,
      state,
      attrs: rootAttrs,
      actions
    }),
    [actions, draftValue, isMixed, modelValue, numericValue, placeholder, rootAttrs, state]
  )
  const context = useMemo<NumberFieldContext>(
    () => ({
      modelValue,
      numericValue,
      displayValue: slotProps.displayValue,
      draftValue,
      isMixed,
      editing,
      scrubbing,
      disabled,
      bound,
      min,
      max,
      step: safeStep,
      ariaLabel,
      inputRef,
      state,
      stateAttrs,
      rootAttrs,
      slotProps,
      actions,
      invalidReason
    }),
    [
      actions,
      ariaLabel,
      bound,
      disabled,
      draftValue,
      editing,
      invalidReason,
      isMixed,
      max,
      min,
      modelValue,
      numericValue,
      rootAttrs,
      safeStep,
      scrubbing,
      slotProps,
      state,
      stateAttrs
    ]
  )
  return (
    <NumberFieldProvider value={context}>
      {typeof children === 'function' ? children(slotProps) : children}
    </NumberFieldProvider>
  )
})

NumberFieldRoot.displayName = 'NumberFieldRoot'
