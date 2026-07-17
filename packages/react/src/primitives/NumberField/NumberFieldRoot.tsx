import { useCallback, useEffect, useRef, useState } from 'react'

import { clampNumberValue, evaluateNumberExpression, normalizeNumberValue, stepNumberValue } from '#react/controls/number-expression'
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
  NumberFieldState,
  NumberFieldStateAttrs
} from '#react/primitives/NumberField/types'
import { inputValue } from '#react/shared/dom/dom-events'

type BindingContext = NonNullable<ReturnType<typeof useOptionalBindableValue<number>>>

function resolveEditPolicy(
  editPolicy: NumberFieldEditPolicy,
  binding: BindingContext | null
): NumberFieldEditPolicy {
  if (!binding) return editPolicy
  if (binding.policy === 'readonly-when-bound') return 'readonly'
  if (binding.policy === 'detach-on-edit') return 'detach-on-edit'
  return 'editable'
}

function resolveNumericValue(
  modelValue: number | symbol,
  binding: BindingContext | null
): number {
  const resolved = binding?.resolvedValue
  if (binding?.state === 'bound' && typeof resolved === 'number') return resolved
  return typeof modelValue === 'number' ? modelValue : 0
}

function buildStateAttrs(
  editing: boolean,
  scrubbing: boolean,
  isMixed: boolean,
  disabled: boolean,
  bound: boolean
): NumberFieldStateAttrs {
  return {
    ...(editing ? { 'data-editing': '' as const } : {}),
    ...(scrubbing ? { 'data-scrubbing': '' as const } : {}),
    ...(isMixed ? { 'data-mixed': '' as const } : {}),
    ...(disabled ? { 'data-disabled': '' as const } : {}),
    ...(bound ? { 'data-bound': '' as const } : {})
  }
}

function computeIsMixed(modelValue: number | symbol, binding: BindingContext | null): boolean {
  return binding?.state === 'mixed' || typeof modelValue === 'symbol'
}

function computeStepValue(step: number): number {
  return Number.isFinite(step) && step > 0 ? step : 1
}

function buildRootAttrs(
  stateAttrs: NumberFieldStateAttrs,
  editing: boolean,
  disabled: boolean,
  isMixed: boolean,
  numericValue: number,
  min: number,
  max: number,
  ariaLabel: string | undefined,
  onFocus: () => void,
  onKeyDown: (e: KeyboardEvent) => void
): NumberFieldRootAttrs {
  return {
    ...stateAttrs,
    role: editing ? undefined : 'spinbutton',
    tabIndex: editing ? undefined : (disabled ? -1 : 0),
    'aria-valuenow': editing || isMixed ? undefined : numericValue,
    'aria-valuemin': !editing && Number.isFinite(min) ? min : undefined,
    'aria-valuemax': !editing && Number.isFinite(max) ? max : undefined,
    'aria-disabled': !editing && disabled ? 'true' : undefined,
    'aria-label': editing ? undefined : ariaLabel,
    onFocus,
    onKeyDown
  }
}

export function NumberFieldRoot({
  modelValue,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 1,
  placeholder = 'Mixed',
  ariaLabel,
  disabled: disabledProp = false,
  bound: boundProp = false,
  editPolicy = 'editable',
  onChange,
  onCommit,
  onEditingChange,
  onInvalid,
  onDetachRequest,
  children
}: NumberFieldRootProps) {
  const binding = useOptionalBindableValue<number>()

  const [editing, setEditing] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  /** Local scrub display — updated on rAF so UI stays live without parent re-renders every move. */
  const [scrubDisplay, setScrubDisplay] = useState<number | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [invalidReason, setInvalidReason] = useState<NumberExpressionError | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const workingValueRef = useRef(0)
  const interactionStartValueRef = useRef(0)
  const interactionStartedMixedRef = useRef(false)
  const mutationRequestedRef = useRef(false)
  const scrubTargetRef = useRef<Element | undefined>(undefined)
  const scrubPointerIdRef = useRef<number | undefined>(undefined)

  const stopMoveRef = useRef<(() => void) | undefined>(undefined)
  const stopUpRef = useRef<(() => void) | undefined>(undefined)
  const stopCancelRef = useRef<(() => void) | undefined>(undefined)
  /** Coalesce scrub onChange to one call per animation frame (drag hot path). */
  const scrubRafRef = useRef(0)
  const pendingScrubValueRef = useRef<number | null>(null)

  const flushScrubValue = useCallback(() => {
    scrubRafRef.current = 0
    const pending = pendingScrubValueRef.current
    if (pending == null) return
    pendingScrubValueRef.current = null
    setScrubDisplay(pending)
    if (binding?.actions.applyValue(pending)) return
    onChange?.(pending)
  }, [binding, onChange])

  const scheduleScrubValue = useCallback(
    (value: number) => {
      workingValueRef.current = value
      pendingScrubValueRef.current = value
      if (scrubRafRef.current) return
      scrubRafRef.current = requestAnimationFrame(flushScrubValue)
    },
    [flushScrubValue]
  )

  const isMixed = computeIsMixed(modelValue, binding)
  const numericValue =
    scrubDisplay != null ? scrubDisplay : resolveNumericValue(modelValue, binding)
  const displayValue =
    scrubbing && scrubDisplay != null
      ? String(normalizeNumberValue(scrubDisplay))
      : isMixed
        ? ''
        : String(normalizeNumberValue(resolveNumericValue(modelValue, binding)))
  const disabled = disabledProp
  const bound = binding ? binding.state === 'bound' : boundProp
  const effectiveEditPolicy = resolveEditPolicy(editPolicy, binding)
  const stepValue = computeStepValue(step)

  function canMutate(): boolean {
    return !disabled && !(bound && effectiveEditPolicy === 'readonly')
  }

  function requestMutation(source: NumberFieldMutationSource): boolean {
    if (mutationRequestedRef.current) return true
    if (!canMutate()) return false
    if (binding && !binding.actions.beginMutation(source)) return false
    if (!binding && bound && effectiveEditPolicy === 'detach-on-edit') {
      onDetachRequest?.(source)
    }
    mutationRequestedRef.current = true
    return true
  }

  function beginInteraction() {
    interactionStartValueRef.current = numericValue
    interactionStartedMixedRef.current = isMixed
    workingValueRef.current = numericValue
    mutationRequestedRef.current = false
    setInvalidReason(null)
  }

  function updateValue(value: number, options?: { coalesce?: boolean }) {
    const normalized = normalizeNumberValue(clampNumberValue(value, min, max))
    if (options?.coalesce) {
      scheduleScrubValue(normalized)
      return
    }
    if (scrubRafRef.current) {
      cancelAnimationFrame(scrubRafRef.current)
      scrubRafRef.current = 0
      pendingScrubValueRef.current = null
    }
    workingValueRef.current = normalized
    if (binding?.actions.applyValue(normalized)) return
    if (modelValue !== normalized) onChange?.(normalized)
  }

  function restoreInteractionValue() {
    const startVal = interactionStartValueRef.current
    if (workingValueRef.current !== startVal || interactionStartedMixedRef.current !== isMixed) {
      workingValueRef.current = startVal
      if (!binding?.actions.applyValue(startVal)) {
        onChange?.(startVal)
      }
    }
  }

  function finishCommit(value: number) {
    updateValue(value)
    setEditing(false)
    if (workingValueRef.current !== interactionStartValueRef.current) {
      onCommit?.(workingValueRef.current, interactionStartValueRef.current)
    }
    binding?.actions.commitMutation()
  }

  function startEdit() {
    if (editing || !canMutate()) return
    beginInteraction()
    setDraftValue(interactionStartedMixedRef.current ? '' : String(interactionStartValueRef.current))
    setEditing(true)
    queueMicrotask(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  function setDraft(value: string) {
    if (value !== draftValue && !requestMutation('edit')) return
    setDraftValue(value)
    const absoluteNumber = /^\s*(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i.test(value)
    if (absoluteNumber) updateValue(Number(value))
  }

  function onInput(event: Event) {
    setDraft(inputValue(event))
  }

  function commitEdit() {
    if (!editing) return
    const expression = draftValue
    const result = evaluateNumberExpression(expression, {
      current: interactionStartValueRef.current,
      max,
      mixed: interactionStartedMixedRef.current
    })
    if (!result.ok) {
      setInvalidReason(result.error)
      restoreInteractionValue()
      setEditing(false)
      binding?.actions.cancelMutation()
      onInvalid?.(expression, result.error)
      return
    }
    finishCommit(result.value)
  }

  function cancelEdit() {
    if (!editing) return
    restoreInteractionValue()
    setInvalidReason(null)
    setEditing(false)
    binding?.actions.cancelMutation()
  }

  const stopScrubListeners = useCallback(() => {
    stopMoveRef.current?.()
    stopUpRef.current?.()
    stopCancelRef.current?.()
    stopMoveRef.current = undefined
    stopUpRef.current = undefined
    stopCancelRef.current = undefined
    const target = scrubTargetRef.current
    const pointerId = scrubPointerIdRef.current
    if (target && pointerId != null && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    scrubTargetRef.current = undefined
    scrubPointerIdRef.current = undefined
    if (typeof document !== 'undefined') document.body.style.cursor = ''
  }, [])

  function startScrub(event: PointerEvent) {
    if (!canMutate()) return
    event.preventDefault()
    beginInteraction()

    const startX = event.clientX
    let lastX = startX
    let accumulated = numericValue
    let hasMoved = false
    const target = event.currentTarget instanceof Element ? event.currentTarget : undefined
    scrubTargetRef.current = target
    scrubPointerIdRef.current = event.pointerId
    target?.setPointerCapture(event.pointerId)
    const listenerTarget: EventTarget = target ?? document

    const moveHandler = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return
      const dx = moveEvent.clientX - lastX
      lastX = moveEvent.clientX
      if (!hasMoved && Math.abs(moveEvent.clientX - startX) > 2) {
        if (!requestMutation('scrub')) return
        hasMoved = true
        setScrubbing(true)
        document.body.style.cursor = 'ew-resize'
      }
      if (!hasMoved) return
      accumulated += dx * stepValue * sensitivity
      // rAF-coalesce: avoid React parent re-renders on every pointermove
      updateValue(accumulated, { coalesce: true })
    }

    listenerTarget.addEventListener('pointermove', moveHandler as EventListener)
    stopMoveRef.current = () =>
      listenerTarget.removeEventListener('pointermove', moveHandler as EventListener)

    const finish = (cancelled: boolean) => {
      stopScrubListeners()
      setScrubbing(false)
      // Flush any pending coalesced scrub value before commit/cancel
      if (scrubRafRef.current) {
        cancelAnimationFrame(scrubRafRef.current)
        scrubRafRef.current = 0
      }
      const pending = pendingScrubValueRef.current
      pendingScrubValueRef.current = null
      if (pending != null && !cancelled) {
        workingValueRef.current = pending
        if (!binding?.actions.applyValue(pending)) onChange?.(pending)
      }
      setScrubDisplay(null)
      if (cancelled) {
        restoreInteractionValue()
        binding?.actions.cancelMutation()
        return
      }
      if (!hasMoved) {
        startEdit()
        return
      }
      if (workingValueRef.current !== interactionStartValueRef.current) {
        onCommit?.(workingValueRef.current, interactionStartValueRef.current)
      }
      binding?.actions.commitMutation()
    }

    const upHandler = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === event.pointerId) finish(false)
    }
    const cancelHandler = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === event.pointerId) finish(true)
    }
    listenerTarget.addEventListener('pointerup', upHandler as EventListener)
    listenerTarget.addEventListener('pointercancel', cancelHandler as EventListener)
    stopUpRef.current = () =>
      listenerTarget.removeEventListener('pointerup', upHandler as EventListener)
    stopCancelRef.current = () =>
      listenerTarget.removeEventListener('pointercancel', cancelHandler as EventListener)
  }

  function stepValueFromKeyboard(event: KeyboardEvent): boolean {
    if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') return false
    if (!editing) beginInteraction()
    if (!requestMutation('step')) return true
    event.preventDefault()

    const draftResult = editing
      ? evaluateNumberExpression(draftValue, {
          current: interactionStartValueRef.current,
          max,
          mixed: interactionStartedMixedRef.current
        })
      : undefined
    const base = draftResult?.ok ? draftResult.value : workingValueRef.current
    const next = stepNumberValue(
      base,
      event.code === 'ArrowUp' ? 1 : -1,
      stepValue,
      event,
      min,
      max
    )
    updateValue(next)
    setDraftValue(String(next))

    if (!editing) {
      if (next !== interactionStartValueRef.current)
        onCommit?.(next, interactionStartValueRef.current)
      binding?.actions.commitMutation()
    }
    return true
  }

  function onKeydown(event: KeyboardEvent) {
    if (stepValueFromKeyboard(event)) return
    if (event.code === 'Enter') {
      event.preventDefault()
      commitEdit()
    } else if (event.code === 'Escape') {
      event.preventDefault()
      cancelEdit()
    }
  }

  // Sync editing change
  const prevEditingRef = useRef(editing)
  if (prevEditingRef.current !== editing) {
    prevEditingRef.current = editing
    onEditingChange?.(editing)
  }

  // Sync modelValue to workingValue when not in interaction
  const prevModelValue = useRef(modelValue)
  if (prevModelValue.current !== modelValue) {
    prevModelValue.current = modelValue
    if (!editing && !scrubbing && typeof modelValue === 'number') {
      workingValueRef.current = modelValue
    }
  }

  useEffect(() => () => stopScrubListeners(), [stopScrubListeners])

  const state: NumberFieldState = { editing, scrubbing, mixed: isMixed, disabled, bound }
  const stateAttrs = buildStateAttrs(editing, scrubbing, isMixed, disabled, bound)
  const rootAttrs = buildRootAttrs(stateAttrs, editing, disabled, isMixed, numericValue, min, max, ariaLabel, startEdit, onKeydown)

  const actions: NumberFieldActions = {
    startScrub,
    startEdit,
    cancelEdit,
    commitEdit,
    setDraft,
    input: onInput,
    keydown: onKeydown
  }

  const slotProps: NumberFieldSlotProps = {
    modelValue,
    displayValue,
    draftValue,
    isMixed,
    placeholder,
    ...state,
    state,
    attrs: rootAttrs,
    actions
  }

  const ctx: NumberFieldContext = {
    modelValue,
    numericValue,
    displayValue,
    draftValue,
    isMixed,
    editing,
    scrubbing,
    disabled,
    bound,
    min,
    max,
    step: stepValue,
    ariaLabel,
    inputRef,
    state,
    stateAttrs,
    rootAttrs,
    slotProps,
    actions,
    invalidReason
  }

  return (
    <NumberFieldProvider value={ctx}>
      {typeof children === 'function' ? children(slotProps) : children}
    </NumberFieldProvider>
  )
}
