import { useBindingProvider } from '#react/controls/binding-provider/context'
import { BindableValueProvider } from '#react/primitives/BindableValue/context'
import type {
  BindableValueActions,
  BindableValueContext,
  BindableValueRootProps,
  BindableValueSlotProps,
  BindableValueStateAttrs
} from '#react/primitives/BindableValue/types'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type BindableValueRootComponentProps<V> = BindableValueRootProps<V> & {
  children?: ReactNode | ((props: BindableValueSlotProps<V>) => ReactNode)
}

export const BindableValueRoot = memo(function BindableValueRoot<V>({
  provider: providerProp,
  targets,
  value,
  policy = 'detach-on-edit',
  batchLabel = 'Edit bound value',
  children
}: BindableValueRootComponentProps<V>) {
  const injectedProvider = useBindingProvider<V>()
  const provider = providerProp ?? injectedProvider
  if (!provider)
    throw new Error('[open-pencil] BindableValueRoot requires a provider prop or BindingProvider')
  const [, rerender] = useState(0)
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const interaction = useRef({
    active: false,
    detached: false,
    bindings: new Map<(typeof targets)[number], string>(),
    resolved: undefined as V | undefined
  })
  useEffect(() => provider.subscribe?.(() => rerender((revision) => revision + 1)), [provider])
  const state = provider.getState(targets)
  const variable = state === 'bound' && targets[0] ? provider.getBound(targets[0]) : undefined
  const resolvedValue = variable ? provider.resolve(variable.id) : undefined
  const variables = provider.filterVariables(searchTerm)
  const stateAttrs = useMemo<BindableValueStateAttrs>(
    () => ({
      'data-unbound': state === 'unbound' ? '' : undefined,
      'data-bound': state === 'bound' ? '' : undefined,
      'data-mixed': state === 'mixed' ? '' : undefined,
      'data-picker-open': open ? '' : undefined,
      'data-policy': policy
    }),
    [open, policy, state]
  )
  const reset = useCallback(() => {
    interaction.current = {
      active: false,
      detached: false,
      bindings: new Map(),
      resolved: undefined
    }
  }, [])
  const beginMutation = useCallback(
    (source: 'edit' | 'scrub' | 'step') => {
      if (interaction.current.active) return true
      if (state === 'bound' && policy === 'readonly-when-bound') return false
      if (state === 'bound' && policy === 'edit-variable' && (!variable || !provider.setValue))
        return false
      interaction.current.active = true
      void source
      if (state !== 'unbound') {
        for (const target of targets) {
          const current = provider.getBound(target)
          if (current) interaction.current.bindings.set(target, current.id)
        }
      }
      interaction.current.resolved = resolvedValue
      provider.beginBatch?.(batchLabel)
      if (state === 'mixed' || (state === 'bound' && policy === 'detach-on-edit')) {
        interaction.current.detached = true
        for (const target of targets) provider.unbind(target)
      }
      return true
    },
    [batchLabel, policy, provider, resolvedValue, state, targets, variable]
  )
  const actions = useMemo<BindableValueActions<V>>(
    () => ({
      bind: (variableId) => {
        const bindTargets = () => targets.forEach((target) => provider.bind(target, variableId))
        if (provider.runBatch) provider.runBatch('Bind variable', bindTargets)
        else bindTargets()
        setOpen(false)
      },
      unbind: () => {
        const unbindTargets = () => targets.forEach((target) => provider.unbind(target))
        if (provider.runBatch) provider.runBatch('Unbind variable', unbindTargets)
        else unbindTargets()
      },
      create: (name) => {
        if (targets[0] && provider.create) {
          const createVariable = () => provider.create?.(targets[0], value, name)
          if (provider.runBatch) provider.runBatch('Create and bind variable', createVariable)
          else createVariable()
        }
        setOpen(false)
      },
      openPicker: () => setOpen(true),
      closePicker: () => setOpen(false),
      togglePicker: () => setOpen((current) => !current),
      setSearchTerm,
      beginMutation,
      applyValue: (nextValue) => {
        if (
          policy !== 'edit-variable' ||
          !interaction.current.active ||
          !variable ||
          !provider.setValue
        )
          return false
        provider.setValue(variable.id, nextValue)
        return true
      },
      commitMutation: () => {
        if (!interaction.current.active) return
        provider.commitBatch?.()
        reset()
      },
      cancelMutation: () => {
        if (!interaction.current.active) return
        if (provider.rollbackBatch) provider.rollbackBatch()
        else if (interaction.current.detached)
          for (const [target, variableId] of interaction.current.bindings)
            provider.bind(target, variableId)
        else if (
          policy === 'edit-variable' &&
          variable &&
          interaction.current.resolved !== undefined &&
          provider.setValue
        )
          provider.setValue(variable.id, interaction.current.resolved)
        reset()
      }
    }),
    [beginMutation, policy, provider, reset, targets, value, variable]
  )
  useEffect(() => () => actions.cancelMutation(), [actions])
  const slotProps = useMemo<BindableValueSlotProps<V>>(
    () => ({
      state,
      variable,
      resolvedValue,
      policy,
      open,
      searchTerm,
      variables,
      stateAttrs,
      actions
    }),
    [actions, open, policy, resolvedValue, searchTerm, state, stateAttrs, variable, variables]
  )
  const context = useMemo<BindableValueContext<V>>(
    () => ({
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
    }),
    [
      actions,
      open,
      policy,
      provider,
      resolvedValue,
      searchTerm,
      slotProps,
      state,
      stateAttrs,
      targets,
      value,
      variable,
      variables
    ]
  )
  return (
    <BindableValueProvider value={context}>
      {typeof children === 'function' ? children(slotProps) : children}
    </BindableValueProvider>
  )
}) as <V>(props: BindableValueRootComponentProps<V>) => ReactNode
