import type { BindingProvider, BindingTarget } from '#react/controls/binding-provider/types'
import {
  BindableValuePicker,
  BindableValueRoot,
  BindableValueTrigger
} from '#react/primitives/BindableValue'
import { useMemo, useState } from 'react'

import type { Variable } from '@open-pencil/scene-graph'

const variables: Variable[] = [
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
const target: BindingTarget[] = [{ nodeId: 'picker', path: 'width' }]

export function BindableValueDemo() {
  const [binding, setBinding] = useState<string | undefined>()
  const provider = useMemo<BindingProvider<number>>(
    () => ({
      listVariables: () => variables,
      filterVariables: (term) =>
        variables.filter((variable) => variable.name.toLowerCase().includes(term.toLowerCase())),
      getBound: () => variables.find((variable) => variable.id === binding),
      getState: () => (binding ? 'bound' : 'unbound'),
      resolve: (id) =>
        variables.find((variable) => variable.id === id)?.valuesByMode.default as
          | number
          | undefined,
      bind: (_target, id) => setBinding(id),
      unbind: () => setBinding(undefined)
    }),
    [binding]
  )
  return (
    <BindableValueRoot provider={provider} targets={target} value={12}>
      {({ stateAttrs, variables: options }) => (
        <div
          {...stateAttrs}
          className="relative w-fit rounded bg-[var(--vp-c-bg-soft)] p-3 text-xs"
        >
          <BindableValueTrigger>Choose variable</BindableValueTrigger>
          <BindableValuePicker>
            {({ actions }) => (
              <div className="mt-2 flex gap-1">
                {options.map((option) => (
                  <button key={option.id} type="button" onClick={() => actions.bind(option.id)}>
                    {option.name}
                  </button>
                ))}
              </div>
            )}
          </BindableValuePicker>
        </div>
      )}
    </BindableValueRoot>
  )
}
