import {
  compatibleComponentPropertyDefinitions,
  findReferencedSwapInstance,
  instanceSwapOptions,
  isSwapPropertyType,
  mergedComponentPropertyValue,
  type ComponentPropertyControl,
  type ComponentPropertyOption
} from '#react/controls/component-props/model'
import { MIXED } from '#react/controls/mixed'
import { useEditor } from '#react/editor/context'
import { materializeComponent } from '#react/graph/instances'
import { useSceneComputed } from '#react/internal/scene-computed/use'

import type { SceneNode } from '@open-pencil/scene-graph'

function variantOptions(
  editor: ReturnType<typeof useEditor>,
  instance: SceneNode,
  propertyName: string
): ComponentPropertyOption[] {
  return editor.getVariantOptionAvailability(instance.id, propertyName).map(({ value, available }) => ({
    value,
    label: value,
    disabled: !available
  }))
}

export function useComponentProperties() {
  const editor = useEditor()
  const instances = useSceneComputed(() =>
    editor.getSelectedNodes().filter((node) => node.type === 'INSTANCE')
  )
  const selectedCount = editor.state.selectedIds.size
  const allSelectedAreInstances =
    instances.length > 0 && instances.length === selectedCount
  const definitionSets = useSceneComputed(() =>
    instances.map((instance) => editor.getInstanceComponentPropertyDefinitions(instance.id))
  )
  // Slots render as their own rows (useSlotProperties), not as value controls.
  const definitions = compatibleComponentPropertyDefinitions(definitionSets).filter(
    (definition) => definition.type !== 'SLOT'
  )
  const active = allSelectedAreInstances && definitions.length > 0
  const controls = useSceneComputed<ComponentPropertyControl[]>(() => {
    if (!active || instances.length === 0) return []
    const firstInstance = instances[0]
    // Swap options scan the graph, so resolve that list once for every swap control.
    let componentNodes: SceneNode[] | null = null
    return definitions.map((definition) => {
      const values = instances.map((instance) =>
        editor.getInstanceComponentPropertyValue(instance.id, definition)
      )
      const value = mergedComponentPropertyValue(values)
      let options: ComponentPropertyOption[] = []
      if (definition.type === 'VARIANT') {
        options = variantOptions(editor, firstInstance, definition.name)
      } else if (definition.type === 'INSTANCE_SWAP') {
        componentNodes ??= [...editor.graph.getAllNodes()]
        options = instanceSwapOptions(componentNodes, definition, value === MIXED ? '' : value)
      }
      return {
        id: definition.id,
        name: definition.name,
        type: definition.type,
        value,
        options,
        preferredValues: definition.preferredValues
      }
    })
  })

  function setValue(propertyId: string, value: string, sourceLibraryKey?: string) {
    if (!active) return
    const targets = [...instances]
    const definition = definitions.find((item) => item.id === propertyId)
    if (!definition) return
    if (
      instances.every(
        (instance) => editor.getInstanceComponentPropertyValue(instance.id, definition) === value
      )
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

  return { active, controls, setValue }
}
