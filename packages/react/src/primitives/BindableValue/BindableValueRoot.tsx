import { useEffect, useMemo, useRef, useState } from 'react'

import { useBindingProvider } from '#react/controls/binding-provider/context'
import type {
  BindingMutationSource,
  BindingProvider,
  BindingTarget
} from '#react/controls/binding-provider/types'
import { BindableValueProvider } from '#react/primitives/BindableValue/context'
import type {
  BindableValueActions,
  BindableValueContext,
  BindableValueRootProps,
  BindableValueSlotProps,
  BindableValueStateAttrs
} from '#react/primitives/BindableValue/types'

export function BindableValueRoot<V>({
  provider: providerProp,
  targets,
  value,
  policy = 'detach-on-edit',
  batchLabel = 'Edit bound value',
  children
}: BindableValueRootProps<V>) {
  const injectedProvider = useBindingProvider<V>()
  const resolvedProvider = providerProp ?? injectedProvider
  if (!resolvedProvider) {
    throw new Error(
      '[open-pencil] BindableValueRoot requires a provider prop or provideBindingProvider()'
    )
  }
  const provider: BindingProvider<V> = resolvedProvider

  const supportsInteractionBatch =
    provider.beginBatch !== undefined &&
    provider.commitBatch !== undefined &&
    provider.rollbackBatch !== undefined

  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  // Revision counter from provider (if any) — trigger re-render when it changes
  const [, forceUpdate] = useState(0)

  // Track provider revision for reactivity
  const revisionRef = useRef<unknown>(undefined)
  const currentRevision = provider.revision?.value
  if (revisionRef.current !== currentRevision) {
    revisionRef.current = currentRevision
    // Will be caught on next render via the revision check
  }

  // Mutable interaction state — no re-renders needed
  const interactionActiveRef = useRef(false)
  const detachedForInteractionRef = useRef(false)
  const bindingSnapshotRef = useRef(new Map<BindingTarget, string>())
  const resolvedSnapshotRef = useRef<V | undefined>(undefined)

  const state = provider.getState(targets)
  const variable = state === 'bound' && targets[0] ? provider.getBound(targets[0]) : undefined
  const resolvedValue = variable ? provider.resolve(variable.id) : undefined
  const variables = provider.filterVariables(searchTerm)

  const stateAttrs = useMemo<BindableValueStateAttrs>(
    () => ({
      ...(state === 'unbound' ? { 'data-unbound': '' as const } : {}),
      ...(state === 'bound' ? { 'data-bound': '' as const } : {}),
      ...(state === 'mixed' ? { 'data-mixed': '' as const } : {}),
      ...(open ? { 'data-picker-open': '' as const } : {}),
      'data-policy': policy
    }),
    [state, open, policy]
  )

  function runImmediate(label: string, action: () => void) {
    if (provider.runBatch) provider.runBatch(label, action)
    else action()
  }

  function bind(variableId: string) {
    runImmediate('Bind variable', () => {
      for (const target of targets) provider.bind(target, variableId)
    })
    setOpen(false)
    forceUpdate((n) => n + 1)
  }

  function unbind() {
    runImmediate('Unbind variable', () => {
      for (const target of targets) provider.unbind(target)
    })
    forceUpdate((n) => n + 1)
  }

  function create(name: string) {
    if (targets.length === 0 || !provider.create) return
    const target = targets[0]
    runImmediate('Create and bind variable', () => provider.create?.(target, value, name))
    setOpen(false)
    forceUpdate((n) => n + 1)
  }

  function openPicker() { setOpen(true) }
  function closePicker() { setOpen(false) }
  function togglePicker() { setOpen((prev) => !prev) }
  function updateSearchTerm(term: string) { setSearchTerm(term) }

  function snapshotBindings() {
    const snapshot = new Map<BindingTarget, string>()
    for (const target of targets) {
      const current = provider.getBound(target)
      if (current) snapshot.set(target, current.id)
    }
    bindingSnapshotRef.current = snapshot
  }

  function beginMutation(source: BindingMutationSource): boolean {
    if (interactionActiveRef.current) return true
    if (state === 'unbound') return true
    const startedMixed = state === 'mixed'
    if (!startedMixed && policy === 'readonly-when-bound') return false
    if (!startedMixed && policy === 'edit-variable' && (!variable || !provider.setValue)) {
      return false
    }

    interactionActiveRef.current = true
    void source
    snapshotBindings()
    resolvedSnapshotRef.current = resolvedValue
    if (supportsInteractionBatch) provider.beginBatch?.(batchLabel)

    if (startedMixed || policy === 'detach-on-edit') {
      detachedForInteractionRef.current = true
      for (const target of targets) provider.unbind(target)
    }
    return true
  }

  function applyValue(nextValue: V): boolean {
    if (policy !== 'edit-variable' || !interactionActiveRef.current) return false
    if (!variable || !provider.setValue) return false
    provider.setValue(variable.id, nextValue)
    return true
  }

  function resetInteraction() {
    interactionActiveRef.current = false
    detachedForInteractionRef.current = false
    bindingSnapshotRef.current.clear()
    resolvedSnapshotRef.current = undefined
  }

  function commitMutation() {
    if (!interactionActiveRef.current) return
    if (supportsInteractionBatch) provider.commitBatch?.()
    resetInteraction()
  }

  function restoreWithoutRollback() {
    if (detachedForInteractionRef.current) {
      for (const [target, variableId] of bindingSnapshotRef.current) provider.bind(target, variableId)
    } else if (
      policy === 'edit-variable' &&
      variable &&
      resolvedSnapshotRef.current !== undefined &&
      provider.setValue
    ) {
      provider.setValue(variable.id, resolvedSnapshotRef.current)
    }
  }

  function cancelMutation() {
    if (!interactionActiveRef.current) return
    if (supportsInteractionBatch) provider.rollbackBatch?.()
    else restoreWithoutRollback()
    resetInteraction()
  }

  useEffect(() => () => cancelMutation(), [])

  const actions: BindableValueActions<V> = {
    bind,
    unbind,
    create,
    openPicker,
    closePicker,
    togglePicker,
    setSearchTerm: updateSearchTerm,
    beginMutation,
    applyValue,
    commitMutation,
    cancelMutation
  }

  const slotProps: BindableValueSlotProps<V> = {
    state,
    variable,
    resolvedValue,
    policy,
    open,
    searchTerm,
    variables,
    stateAttrs,
    actions
  }

  const ctx: BindableValueContext<V> = {
    provider,
    targets,
    value,
    state,
    variable,
    resolvedValue,
    policy,
    open,
    searchTerm,
    variables,
    stateAttrs,
    slotProps,
    actions
  }

  return (
    <BindableValueProvider value={ctx as BindableValueContext}>
      {typeof children === 'function' ? children(slotProps) : children}
    </BindableValueProvider>
  )
}
