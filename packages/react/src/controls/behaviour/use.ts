import {
  behaviourContract,
  behaviourOwner,
  behaviourProperties,
  booleanBinding,
  DEFAULT_NUMBER_SETTINGS,
  emptyBehaviour,
  guessInteractionStates,
  guessOnOff,
  INTERACTION_STATES,
  isNumberRange,
  missingBindings,
  partBinding,
  readBehaviour,
  textBinding,
  type Behaviour,
  type BehaviourKind,
  type BehaviourNumberSettings,
  type InteractionState
} from '@open-pencil/scene-graph'

import type { VariantDefinitionControl } from '#react/controls/component-props/authoring'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

import type { BehaviourControl, BehaviourValueControl } from './types'

/**
 * The behaviour of the selected main component or component set — Vue `useBehaviour` parity.
 */
export function useBehaviour() {
  const editor = useEditor()
  const owner = useSceneComputed(() => {
    const nodes = editor.getSelectedNodes()
    return nodes.length === 1 ? behaviourOwner(editor.graph, nodes[0]) : undefined
  })
  const behaviour = useSceneComputed(() => (owner ? readBehaviour(owner) : null))

  const control = useSceneComputed<BehaviourControl | null>(() => {
    const current = behaviour
    const target = owner
    if (!current || !target) return null
    const contract = behaviourContract(current.kind)
    const properties = behaviourProperties(editor.graph, target)
    const options = (types: string[]): VariantDefinitionControl[] =>
      properties
        .filter((definition) => types.includes(definition.type))
        .map((definition) => ({
          id: definition.id,
          name: definition.name,
          values: definition.variantOptions ?? []
        }))
    const values = contract.values.flatMap((value): BehaviourValueControl[] => {
      if (value.type === 'boolean') {
        const binding = booleanBinding(current, value.id)
        return [
          {
            id: value.id,
            type: 'boolean',
            required: value.required,
            propertyId: binding?.propertyId ?? null,
            on: binding?.on,
            off: binding?.off,
            options: options(['VARIANT', 'BOOLEAN'])
          }
        ]
      }
      if (value.type === 'text')
        return [
          {
            id: value.id,
            type: 'text',
            required: value.required,
            propertyId: textBinding(current, value.id) ?? null,
            options: options(['TEXT'])
          }
        ]
      if (value.type === 'number')
        return [
          {
            id: value.id,
            type: 'number',
            ...(current.numbers[value.id] ?? DEFAULT_NUMBER_SETTINGS)
          }
        ]
      return []
    })
    return {
      kind: current.kind,
      values,
      parts: contract.parts.map((part) => {
        const others = new Set(
          Object.entries(current.parts).flatMap(([id, slot]) => (id === part.id ? [] : [slot]))
        )
        return {
          id: part.id,
          required: part.required,
          propertyId: partBinding(current, part.id) ?? null,
          options: options(['SLOT']).filter((slot) => !others.has(slot.id))
        }
      }),
      states: {
        propertyId: current.states?.propertyId ?? null,
        values: Object.fromEntries(
          INTERACTION_STATES.flatMap((state) => {
            const value = current.states?.[state]
            return value ? [[state, value]] : []
          })
        ),
        options: options(['VARIANT'])
      },
      missing: missingBindings(editor.graph, target, current)
    }
  })

  function update(change: (current: Behaviour) => Behaviour) {
    const target = owner
    const current = behaviour
    if (target && current) editor.setBehaviour(target.id, change(structuredClone(current)))
  }

  return {
    active: Boolean(owner),
    behaviour: control,
    add: (kind: BehaviourKind) => {
      if (owner) editor.setBehaviour(owner.id, emptyBehaviour(kind))
    },
    remove: () => {
      if (owner) editor.setBehaviour(owner.id, null)
    },
    bindValue: (valueId: string, propertyId: string) =>
      update((current) => {
        const target = owner
        const definition = target
          ? behaviourProperties(editor.graph, target).find((item) => item.id === propertyId)
          : undefined
        current.booleans[valueId] =
          definition?.type === 'VARIANT'
            ? { propertyId, ...guessOnOff(definition.variantOptions ?? []) }
            : { propertyId }
        return current
      }),
    bindText: (valueId: string, propertyId: string) =>
      update((current) => {
        current.texts[valueId] = { propertyId }
        return current
      }),
    mapValue: (valueId: string, mapping: { on: string; off: string }) =>
      update((current) => {
        const binding = booleanBinding(current, valueId)
        if (binding) current.booleans[valueId] = { ...binding, ...mapping }
        return current
      }),
    setNumber: (valueId: string, settings: BehaviourNumberSettings) => {
      if (!isNumberRange(settings)) return
      update((current) => {
        current.numbers[valueId] = settings
        return current
      })
    },
    bindPart: (partId: string, propertyId: string) =>
      update((current) => {
        current.parts[partId] = propertyId
        return current
      }),
    createText: (valueId: string, name: string) => {
      if (owner) editor.addBehaviourText(owner.id, valueId, name)
    },
    createVariant: (valueId: string, name: string) => {
      if (owner) editor.addBehaviourVariant(owner.id, valueId, name)
    },
    createPart: (partId: string, name: string) => {
      if (owner) editor.addBehaviourPart(owner.id, partId, name)
    },
    createStates: () => {
      if (owner) editor.addBehaviourStates(owner.id)
    },
    bindStates: (propertyId: string) =>
      update((current) => {
        const target = owner
        const definition = target
          ? behaviourProperties(editor.graph, target).find((item) => item.id === propertyId)
          : undefined
        if (!definition) delete current.states
        else current.states = guessInteractionStates(propertyId, definition.variantOptions ?? [])
        return current
      }),
    mapState: (state: InteractionState, value: string) =>
      update((current) => {
        if (!current.states) return current
        current.states = { ...current.states, [state]: value || undefined }
        return current
      })
  }
}
