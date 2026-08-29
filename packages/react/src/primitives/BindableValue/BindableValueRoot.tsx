import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { BindingProvider, BindingTarget, BoundEditPolicy } from '#react/controls/binding/types'
import { BINDABLE_VALUE_KEY } from '#react/primitives/BindableValue/context'
import type {
  BindableValueActions,
  BindableValueContext,
  BindableValueSlotProps,
  BindableValueStateAttrs
} from '#react/primitives/BindableValue/types'

export function BindableValueRoot<V>({
  provider,
  targets,
  value,
  policy = 'detach-on-edit',
  batchLabel = 'Edit bound value',
  children
}: {
  provider: BindingProvider<V>
  targets: BindingTarget[]
  value: V
  policy?: BoundEditPolicy
  batchLabel?: string
  children: ReactNode | ((binding: BindableValueSlotProps<V>) => ReactNode)
}) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  void provider.revision

  const supportsInteractionBatch =
    provider.beginBatch !== undefined &&
    provider.commitBatch !== undefined &&
    provider.rollbackBatch !== undefined

  const state = provider.getState(targets)
  const variable =
    state === 'bound' && targets[0] ? provider.getBound(targets[0]) : undefined
  const resolvedValue = variable ? provider.resolve(variable.id) : undefined
  const variables = provider.filterVariables(searchTerm)
  const stateAttrs: BindableValueStateAttrs = {
    'data-unbound': state === 'unbound' ? '' : undefined,
    'data-bound': state === 'bound' ? '' : undefined,
    'data-mixed': state === 'mixed' ? '' : undefined,
    'data-picker-open': open ? '' : undefined,
    'data-policy': policy
  }

  const interaction = useRef({
    active: false,
    detached: false,
    bindings: new Map<BindingTarget, string>(),
    resolved: undefined as V | undefined
  })

  const actions = useMemo<BindableValueActions<V>>(() => {
    function runImmediate(label: string, action: () => void) {
      if (provider.runBatch) provider.runBatch(label, action)
      else action()
    }

    function snapshotBindings() {
      interaction.current.bindings = new Map()
      for (const target of targets) {
        const current = provider.getBound(target)
        if (current) interaction.current.bindings.set(target, current.id)
      }
    }

    function resetInteraction() {
      interaction.current.active = false
      interaction.current.detached = false
      interaction.current.bindings.clear()
      interaction.current.resolved = undefined
    }

    function restoreWithoutRollback() {
      if (interaction.current.detached) {
        for (const [target, variableId] of interaction.current.bindings) {
          provider.bind(target, variableId)
        }
        return
      }
      if (
        policy === 'edit-variable' &&
        variable &&
        interaction.current.resolved !== undefined &&
        provider.setValue
      ) {
        provider.setValue(variable.id, interaction.current.resolved)
      }
    }

    return {
      bind(variableId: string) {
        runImmediate('Bind variable', () => {
          for (const target of targets) provider.bind(target, variableId)
        })
        setOpen(false)
      },
      unbind() {
        runImmediate('Unbind variable', () => {
          for (const target of targets) provider.unbind(target)
        })
      },
      create(name: string) {
        const target = targets[0]
        if (!target || !provider.create) return
        runImmediate('Create and bind variable', () => provider.create?.(target, value, name))
        setOpen(false)
      },
      openPicker() {
        setOpen(true)
      },
      closePicker() {
        setOpen(false)
      },
      togglePicker() {
        setOpen((current) => !current)
      },
      setSearchTerm(term: string) {
        setSearchTerm(term)
      },
      beginMutation(_source) {
        if (interaction.current.active) return true
        const startedUnbound = state === 'unbound'
        const startedMixed = state === 'mixed'
        if (!startedUnbound && !startedMixed && policy === 'readonly-when-bound') return false
        if (
          !startedUnbound &&
          !startedMixed &&
          policy === 'edit-variable' &&
          (!variable || !provider.setValue)
        ) {
          return false
        }

        interaction.current.active = true
        if (!startedUnbound) snapshotBindings()
        interaction.current.resolved = resolvedValue
        if (supportsInteractionBatch) provider.beginBatch?.(batchLabel)

        if (startedMixed || (!startedUnbound && policy === 'detach-on-edit')) {
          interaction.current.detached = true
          for (const target of targets) provider.unbind(target)
        }
        return true
      },
      applyValue(nextValue: V) {
        if (policy !== 'edit-variable' || !interaction.current.active) return false
        if (!variable || !provider.setValue) return false
        provider.setValue(variable.id, nextValue)
        return true
      },
      commitMutation() {
        if (!interaction.current.active) return
        if (supportsInteractionBatch) provider.commitBatch?.()
        resetInteraction()
      },
      cancelMutation() {
        if (!interaction.current.active) return
        if (supportsInteractionBatch) provider.rollbackBatch?.()
        else restoreWithoutRollback()
        resetInteraction()
      }
    }
  }, [
    batchLabel,
    policy,
    provider,
    resolvedValue,
    state,
    supportsInteractionBatch,
    targets,
    value,
    variable
  ])

  const cancelRef = useRef(actions.cancelMutation)
  cancelRef.current = actions.cancelMutation
  useEffect(() => () => cancelRef.current(), [])

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

  const context: BindableValueContext<V> = {
    ...slotProps,
    provider,
    targets,
    value
  }

  return (
    <BINDABLE_VALUE_KEY.Provider value={context as BindableValueContext}>
      {typeof children === 'function' ? children(slotProps) : children}
    </BINDABLE_VALUE_KEY.Provider>
  )
}
