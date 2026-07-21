import {
  type BindingProvider,
  type BindingState,
  type BindingTarget,
  type BoundEditPolicy
} from '@open-pencil/react'
import { memo, useMemo, useState } from 'react'

import type { Variable } from '@open-pencil/scene-graph'

import BindingFieldDemoItem from '@/components/properties/binding/demo/BindingFieldDemoItem'

const variables: Variable[] = [
  {
    id: 'space/sm',
    name: 'Space/sm',
    type: 'FLOAT',
    collectionId: 'demo',
    valuesByMode: { default: 8 },
    description: '',
    hiddenFromPublishing: false
  },
  {
    id: 'space/md',
    name: 'Space/md',
    type: 'FLOAT',
    collectionId: 'demo',
    valuesByMode: { default: 16 },
    description: '',
    hiddenFromPublishing: false
  },
  {
    id: 'space/lg',
    name: 'Space/lg',
    type: 'FLOAT',
    collectionId: 'demo',
    valuesByMode: { default: 24 },
    description: '',
    hiddenFromPublishing: false
  }
]

function key(target: BindingTarget) {
  return `${target.nodeId}:${target.path}`
}

export const BindingFieldDemo = memo(function BindingFieldDemo() {
  const [revision, setRevision] = useState(0)
  const [bindings, setBindings] = useState<Record<string, string | undefined>>({
    'detach:width': 'space/md',
    'readonly:width': 'space/lg',
    'edit-variable:width': 'space/md',
    'mixed-a:width': 'space/sm',
    'mixed-b:width': 'space/lg',
    'disabled:width': 'space/md',
    'derived:width': 'space/sm'
  })
  const [values, setValues] = useState({
    unbound: 12,
    detach: 16,
    readonly: 24,
    editVariable: 16,
    mixed: 0,
    disabled: 16,
    derived: 8
  })

  const provider = useMemo<BindingProvider<number>>(
    () => ({
      revision: { value: revision },
      listVariables: () => variables,
      filterVariables: (term) =>
        variables.filter((variable) => variable.name.toLowerCase().includes(term.toLowerCase())),
      getBound: (target) => variables.find((variable) => variable.id === bindings[key(target)]),
      getState(targets): BindingState {
        const ids = new Set(targets.map((target) => bindings[key(target)]))
        if (ids.size > 1) return 'mixed'
        return ids.has(undefined) ? 'unbound' : 'bound'
      },
      resolve: (variableId) => {
        const value = variables.find((variable) => variable.id === variableId)?.valuesByMode.default
        return typeof value === 'number' ? value : undefined
      },
      bind(target, variableId) {
        setBindings((current) => ({ ...current, [key(target)]: variableId }))
        setRevision((current) => current + 1)
      },
      unbind(target) {
        setBindings((current) => ({ ...current, [key(target)]: undefined }))
        setRevision((current) => current + 1)
      },
      setValue(variableId, value) {
        const variable = variables.find((item) => item.id === variableId)
        if (variable) variable.valuesByMode.default = value
        setRevision((current) => current + 1)
      },
      create(target, value, name) {
        const id = `created:${name}`
        variables.push({
          id,
          name,
          type: 'FLOAT',
          collectionId: 'demo',
          valuesByMode: { default: value },
          description: '',
          hiddenFromPublishing: false
        })
        setBindings((current) => ({ ...current, [key(target)]: id }))
        setRevision((current) => current + 1)
      }
    }),
    [bindings, revision]
  )

  const target = (nodeId: string): BindingTarget[] => [{ nodeId, path: 'width' }]
  const mixedTargets: BindingTarget[] = [
    { nodeId: 'mixed-a', path: 'width' },
    { nodeId: 'mixed-b', path: 'width' }
  ]

  return (
    <div className="w-[320px] overflow-hidden rounded-lg border border-border bg-panel shadow-xl">
      <header className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold">Binding field states</p>
        <p className="mt-1 text-[11px] text-muted">Pill at rest, resolved value while editing</p>
      </header>

      <div className="grid grid-cols-2 gap-1.5 px-3">
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Unbound</span>
          <BindingFieldDemoItem
            value={values.unbound}
            label="Unbound field"
            provider={provider}
            targets={target('unbound')}
            onValueChange={(value) => setValues((current) => ({ ...current, unbound: value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Detach on edit</span>
          <BindingFieldDemoItem
            value={values.detach}
            label="Detach bound field"
            provider={provider}
            targets={target('detach')}
            onValueChange={(value) => setValues((current) => ({ ...current, detach: value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Read only</span>
          <BindingFieldDemoItem
            value={values.readonly}
            label="Readonly bound field"
            provider={provider}
            targets={target('readonly')}
            policy={'readonly-when-bound' satisfies BoundEditPolicy}
            onValueChange={(value) => setValues((current) => ({ ...current, readonly: value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Edit variable</span>
          <BindingFieldDemoItem
            value={values.editVariable}
            label="Edit variable field"
            provider={provider}
            targets={target('edit-variable')}
            policy={'edit-variable' satisfies BoundEditPolicy}
            onValueChange={(value) => setValues((current) => ({ ...current, editVariable: value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Mixed</span>
          <BindingFieldDemoItem
            value={values.mixed}
            label="Mixed binding field"
            provider={provider}
            targets={mixedTargets}
            onValueChange={(value) => setValues((current) => ({ ...current, mixed: value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Disabled</span>
          <BindingFieldDemoItem
            value={values.disabled}
            label="Disabled bound field"
            provider={provider}
            targets={target('disabled')}
            disabled
            onValueChange={(value) => setValues((current) => ({ ...current, disabled: value }))}
          />
        </label>
        <label className="col-span-2 space-y-1">
          <span className="text-[11px] text-muted">Derived by auto layout</span>
          <BindingFieldDemoItem
            value={values.derived}
            label="Derived bound field"
            provider={provider}
            targets={target('derived')}
            derived
            onValueChange={(value) => setValues((current) => ({ ...current, derived: value }))}
          />
        </label>
      </div>
    </div>
  )
})

BindingFieldDemo.displayName = 'BindingFieldDemo'
export default BindingFieldDemo
