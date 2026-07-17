import { useState, useRef } from 'react'
import type { BindingProvider, BindingState, BindingTarget } from '@open-pencil/react'
import type { Variable } from '@open-pencil/scene-graph'

import { BindingFieldDemoItem } from './BindingFieldDemoItem'

const DEMO_VARIABLES: Variable[] = [
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

function key(target: BindingTarget): string {
  return `${target.nodeId}:${target.path}`
}

export default function BindingFieldDemo() {
  const [revision, setRevision] = useState(0)
  const variablesRef = useRef<Variable[]>([...DEMO_VARIABLES])
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

  const bump = () => setRevision((r) => r + 1)

  const provider: BindingProvider<number> = {
    revision: { value: revision },
    listVariables: () => variablesRef.current,
    filterVariables: (term) =>
      variablesRef.current.filter((v) =>
        v.name.toLowerCase().includes(term.toLowerCase())
      ),
    getBound: (target) =>
      variablesRef.current.find((v) => v.id === bindings[key(target)]),
    getState(targets): BindingState {
      const ids = new Set(targets.map((t) => bindings[key(t)]))
      if (ids.size > 1) return 'mixed'
      return ids.has(undefined) ? 'unbound' : 'bound'
    },
    resolve: (variableId) => {
      const val = variablesRef.current.find((v) => v.id === variableId)?.valuesByMode.default
      return typeof val === 'number' ? val : undefined
    },
    bind(target, variableId) {
      setBindings((b) => ({ ...b, [key(target)]: variableId }))
      bump()
    },
    unbind(target) {
      setBindings((b) => ({ ...b, [key(target)]: undefined }))
      bump()
    },
    setValue(variableId, value) {
      const variable = variablesRef.current.find((v) => v.id === variableId)
      if (variable) variable.valuesByMode.default = value
      bump()
    },
    create(target, value, name) {
      const id = `created:${name}`
      variablesRef.current.push({
        id,
        name,
        type: 'FLOAT',
        collectionId: 'demo',
        valuesByMode: { default: value },
        description: '',
        hiddenFromPublishing: false
      })
      setBindings((b) => ({ ...b, [key(target)]: id }))
      bump()
    }
  }

  const target = (nodeId: string): BindingTarget[] => [{ nodeId, path: 'width' }]
  const mixedTargets: BindingTarget[] = [
    { nodeId: 'mixed-a', path: 'width' },
    { nodeId: 'mixed-b', path: 'width' }
  ]

  return (
    <div className="w-[320px] overflow-hidden rounded-lg border border-border bg-panel shadow-xl">
      <header className="border-b border-border px-panel-x py-panel-y">
        <p className="text-xs font-semibold">Binding field states</p>
        <p className="mt-1 text-[11px] text-muted">Pill at rest, resolved value while editing</p>
      </header>

      <div className="grid grid-cols-2 gap-panel p-panel-x">
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Unbound</span>
          <BindingFieldDemoItem
            value={values.unbound}
            onChange={(v) => setValues((s) => ({ ...s, unbound: v }))}
            label="Unbound field"
            provider={provider}
            targets={target('unbound')}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Detach on edit</span>
          <BindingFieldDemoItem
            value={values.detach}
            onChange={(v) => setValues((s) => ({ ...s, detach: v }))}
            label="Detach bound field"
            provider={provider}
            targets={target('detach')}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Read only</span>
          <BindingFieldDemoItem
            value={values.readonly}
            onChange={(v) => setValues((s) => ({ ...s, readonly: v }))}
            label="Readonly bound field"
            provider={provider}
            targets={target('readonly')}
            policy="readonly-when-bound"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Edit variable</span>
          <BindingFieldDemoItem
            value={values.editVariable}
            onChange={(v) => setValues((s) => ({ ...s, editVariable: v }))}
            label="Edit variable field"
            provider={provider}
            targets={target('edit-variable')}
            policy="edit-variable"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Mixed</span>
          <BindingFieldDemoItem
            value={values.mixed}
            onChange={(v) => setValues((s) => ({ ...s, mixed: v }))}
            label="Mixed binding field"
            provider={provider}
            targets={mixedTargets}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted">Disabled</span>
          <BindingFieldDemoItem
            value={values.disabled}
            onChange={(v) => setValues((s) => ({ ...s, disabled: v }))}
            label="Disabled bound field"
            provider={provider}
            targets={target('disabled')}
            disabled
          />
        </label>
        <label className="col-span-2 space-y-1">
          <span className="text-[11px] text-muted">Derived by auto layout</span>
          <BindingFieldDemoItem
            value={values.derived}
            onChange={(v) => setValues((s) => ({ ...s, derived: v }))}
            label="Derived bound field"
            provider={provider}
            targets={target('derived')}
            derived
          />
        </label>
      </div>
    </div>
  )
}
