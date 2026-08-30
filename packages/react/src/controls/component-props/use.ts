import {
  boundLayerNamesForProperty,
  compatibleComponentPropertyDefinitions,
  findReferencedSwapInstance,
  instanceBooleanPropertyValue,
  instanceSwapOptions,
  instanceSwapPropertyValue,
  instanceTextPropertyValue,
  isSwapPropertyType,
  instanceVariantOptions,
  mergedComponentPropertyValue,
  type ComponentPropertyControl
} from '#react/controls/component-props/model'
import {
  findSlotFrameForProperty,
  insertIntoSlot as insertIntoSlotFrames
} from '#react/controls/component-props/slot-insert'
import { MIXED } from '#react/controls/mixed'
import { useEditor } from '#react/editor/context'
import { materializeComponent } from '#react/graph/instances'
import { useSceneComputed } from '#react/internal/scene-computed/use'

import type { ComponentPropertyDefinition, SceneNode } from '@open-pencil/scene-graph'

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
          return instanceTextPropertyValue(instance, definition, (id) =>
            editor.graph.getChildren(id)
          )
        }
        if (definition.type === 'BOOLEAN') {
          return instanceBooleanPropertyValue(instance, definition, (id) =>
            editor.graph.getChildren(id)
          )
        }
        if (isSwapPropertyType(definition.type)) {
          return instanceSwapPropertyValue(
            instance,
            definition,
            (id) => editor.graph.getChildren(id),
            (id) => editor.graph.getNode(id)
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
      const insertable =
        definition.type === 'SLOT' &&
        instances.some((instance) =>
          findSlotFrameForProperty(
            instance,
            definition.id,
            (id) => editor.graph.getChildren(id),
            (id) => editor.graph.getNode(id)
          )
        )
      if (definition.type === 'INSTANCE_SWAP' || (definition.type === 'SLOT' && !insertable)) {
        const host = firstInstance.componentId
        const hostNode = host ? editor.graph.getNode(host) : undefined
        const hostSet =
          hostNode?.parentId && editor.graph.getNode(hostNode.parentId)?.type === 'COMPONENT_SET'
            ? hostNode.parentId
            : undefined
        const exclude = new Set<string>()
        if (host) exclude.add(host)
        if (hostSet) {
          for (const sibling of editor.graph.getChildren(hostSet)) {
            if (sibling.type === 'COMPONENT') exclude.add(sibling.id)
          }
        }
        options = instanceSwapOptions([...editor.graph.getAllNodes()], definition, current, exclude)
      }
      if (insertable) {
        options = []
      }
      return {
        id: definition.id,
        name: definition.name,
        type: definition.type,
        value,
        options,
        insertable,
        preferredValues: definition.preferredValues,
        onlyPreferredInstances: definition.onlyPreferredInstances,
        boundLayerNames: boundLayerNamesForProperty(instances, definition.id, (id) =>
          editor.graph.getChildren(id)
        )
      }
    })
  })

  function setValue(propertyId: string, value: string, sourceLibraryKey?: string) {
    if (!active) return
    const targets = [...instances]
    const definition = definitions.find((item) => item.id === propertyId)
    if (!definition) return
    if (
      instances.every((instance) => {
        if (isSwapPropertyType(definition.type)) {
          return (
            instanceSwapPropertyValue(
              instance,
              definition,
              (id) => editor.graph.getChildren(id),
              (id) => editor.graph.getNode(id)
            ) === value
          )
        }
        return editor.getInstanceComponentPropertyValue(instance.id, definition) === value
      })
    ) {
      return
    }
    const nextValue = materializeComponent(editor, value, sourceLibraryKey) ?? value
    const label = `Change ${definition.name}`
    const run = () => {
      for (const instance of targets) {
        editor.setInstanceComponentProperty(instance.id, propertyId, nextValue)
      }
    }
    if (targets.length > 1) editor.undo.runBatch(label, run)
    else run()
    if (!isSwapPropertyType(definition.type)) return
    const host = targets[0]
    const nested = host
      ? findReferencedSwapInstance(host, propertyId, (id) => editor.graph.getChildren(id))
      : undefined
    if (nested) editor.select([nested.id])
  }

  function insertIntoSlot(propertyId: string, componentId: string, sourceLibraryKey?: string) {
    if (!active || !componentId) return false
    const definition = definitions.find((item) => item.id === propertyId)
    if (!definition || definition.type !== 'SLOT') return false
    return Boolean(
      insertIntoSlotFrames(editor, [...instances], propertyId, componentId, sourceLibraryKey)
    )
  }

  return { active, controls, setValue, insertIntoSlot }
}
