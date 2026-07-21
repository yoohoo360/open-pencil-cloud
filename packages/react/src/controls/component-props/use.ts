import { useMemo } from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'

import {
  compatibleComponentPropertyDefinitions,
  instanceSwapOptions,
  mergedComponentPropertyValue,
  type ComponentPropertyControl,
  type ComponentPropertyOption
} from '#react/controls/component-props/model'
import { MIXED } from '#react/controls/node-props/helpers'
import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

function variantOptions(editor: ReturnType<typeof useEditor>, instance: SceneNode, name: string) {
  const component = instance.componentId ? editor.graph.getNode(instance.componentId) : null
  const parent = component?.parentId ? editor.graph.getNode(component.parentId) : null
  const values =
    parent?.type === 'COMPONENT_SET' ? editor.collectVariantOptions(parent.id).get(name) : null
  return [...(values ?? [])].map((value) => ({ value, label: value }))
}

export function useComponentProperties() {
  const editor = useEditor()
  const instances = useSceneComputed(() => {
    void editor.state.sceneVersion
    return editor.getSelectedNodes().filter((node) => node.type === 'INSTANCE')
  })
  const selectedCount = editor.state.selectedIds.size
  const definitionSets = useSceneComputed(() => {
    void editor.state.sceneVersion
    return instances.map((instance) => editor.getInstanceComponentPropertyDefinitions(instance.id))
  })
  const definitions = useMemo(
    () => compatibleComponentPropertyDefinitions(definitionSets),
    [definitionSets]
  )
  const active = useMemo(
    () => instances.length > 0 && instances.length === selectedCount && definitions.length > 0,
    [definitions.length, instances.length, selectedCount]
  )
  const controls = useSceneComputed<ComponentPropertyControl[]>(() => {
    void editor.state.sceneVersion
    if (!active || instances.length === 0) return []
    const firstInstance = instances[0]
    return definitions.map((definition) => {
      const values = instances.map((instance) =>
        editor.getInstanceComponentPropertyValue(instance.id, definition)
      )
      const value = mergedComponentPropertyValue(values)
      let options: ComponentPropertyOption[] = []
      if (definition.type === 'VARIANT') {
        options = variantOptions(editor, firstInstance, definition.name)
      } else if (definition.type === 'INSTANCE_SWAP') {
        options = instanceSwapOptions(
          [...editor.graph.getAllNodes()],
          definition,
          value === MIXED ? '' : value
        )
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
