import type { ComponentPropertyDefinition, SceneNode } from '@open-pencil/scene-graph'

import { MIXED } from '#react/controls/mixed'
import {
  compatibleComponentPropertyDefinitions,
  instanceBooleanPropertyValue,
  instanceSwapOptions,
  instanceTextPropertyValue,
  instanceVariantOptions,
  mergedComponentPropertyValue,
  type ComponentPropertyControl
} from '#react/controls/component-props/model'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

function variantOptions(
  editor: ReturnType<typeof useEditor>,
  instance: SceneNode,
  definition: ComponentPropertyDefinition,
  currentValue: string
) {
  return instanceVariantOptions(
    editor.getVariantOptionAvailability(instance.id, definition.name),
    definition.variantOptions ?? [],
    currentValue
  )
}

export function useComponentProperties() {
  const editor = useEditor()
  const instances = useSceneComputed(() =>
    editor.getSelectedNodes().filter((node) => node.type === 'INSTANCE')
  )
  const selectedCount = editor.state.selectedIds.size
  const definitionSets = useSceneComputed(() =>
    instances.map((instance) => editor.getInstanceComponentPropertyDefinitions(instance.id))
  )
  const definitions = compatibleComponentPropertyDefinitions(definitionSets)
  const active =
    instances.length > 0 && instances.length === selectedCount && definitions.length > 0
  const controls = useSceneComputed<ComponentPropertyControl[]>(() => {
    if (!active || instances.length === 0) return []
    const firstInstance = instances[0]
    return definitions.map((definition) => {
      const values = instances.map((instance) => {
        if (definition.type === 'TEXT') {
          return instanceTextPropertyValue(instance, definition, (id) => editor.graph.getChildren(id))
        }
        if (definition.type === 'BOOLEAN') {
          return instanceBooleanPropertyValue(instance, definition, (id) =>
            editor.graph.getChildren(id)
          )
        }
        return editor.getInstanceComponentPropertyValue(instance.id, definition)
      })
      const value = mergedComponentPropertyValue(values)
      const current = value === MIXED ? '' : value
      let options =
        definition.type === 'VARIANT'
          ? variantOptions(editor, firstInstance, definition, current)
          : []
      if (definition.type === 'INSTANCE_SWAP') {
        options = instanceSwapOptions([...editor.graph.getAllNodes()], definition, current)
      }
      return {
        id: definition.id,
        name: definition.name,
        type: definition.type,
        value,
        options
      }
    })
  })

  function setValue(propertyId: string, value: string) {
    if (!active) return
    const targets = [...instances]
    const definition = definitions.find((item) => item.id === propertyId)
    if (!definition) return
    const label = `Change ${definition.name}`
    const run = () => {
      for (const instance of targets) {
        editor.setInstanceComponentProperty(instance.id, propertyId, value)
      }
    }
    if (targets.length > 1) editor.undo.runBatch(label, run)
    else run()
  }

  return { active, controls, setValue }
}
