import { randomHex } from '#core/random'
import type { ComponentPropertyDefinition, SceneNode } from '#core/scene-graph'

import { createComponentFocusActions } from './components/focus'
import { createComponentInstanceActions } from './components/instances'
import { createVariantActions, generateVariantName } from './components/variants'
import type { EditorContext } from './types'

export function createComponentActions(ctx: EditorContext) {
  function createComponentFromSelection(
    selectedNodes: SceneNode[],
    wrapSelectionInContainer: (
      type: 'GROUP' | 'FRAME' | 'COMPONENT' | 'COMPONENT_SET',
      nodes: SceneNode[],
      extra?: Partial<SceneNode>
    ) => string | null
  ) {
    if (selectedNodes.length === 0) return

    const prevSelection = new Set(ctx.state.selectedIds)

    if (selectedNodes.length === 1) {
      const node = selectedNodes[0]
      const prevType = node.type

      if (node.type === 'COMPONENT') return

      if (node.type === 'FRAME' || node.type === 'GROUP') {
        ctx.graph.updateNode(node.id, { type: 'COMPONENT' })
        ctx.setSelectedIds(new Set([node.id]))
        ctx.undo.push({
          label: 'Create component',
          forward: () => {
            ctx.graph.updateNode(node.id, { type: 'COMPONENT' })
            ctx.setSelectedIds(new Set([node.id]))
          },
          inverse: () => {
            ctx.graph.updateNode(node.id, { type: prevType })
            ctx.setSelectedIds(prevSelection)
          }
        })
        return
      }
    }

    wrapSelectionInContainer('COMPONENT', selectedNodes)
  }

  function createComponentSetFromComponents(
    selectedNodes: SceneNode[],
    wrapSelectionInContainer: (
      type: 'GROUP' | 'FRAME' | 'COMPONENT' | 'COMPONENT_SET',
      nodes: SceneNode[],
      extra?: Partial<SceneNode>
    ) => string | null
  ) {
    if (selectedNodes.length < 2) return
    if (!selectedNodes.every((n) => n.type === 'COMPONENT')) return
    const containerId = wrapSelectionInContainer('COMPONENT_SET', selectedNodes)
    if (!containerId) return

    const properNameList = selectedNodes.map((n) => generateVariantName(n.name))

    const hasConsistentSlashes =
      properNameList[0].length &&
      properNameList.every((c) => c.length === properNameList[0]?.length)

    if (hasConsistentSlashes) {
      const propCount = properNameList[0]?.length ?? 0
      const propDefs: ComponentPropertyDefinition[] = []
      const propValues = new Map<string, Set<string>>()

      for (let i = 0; i < propCount; i++) {
        const propId = `prop:${randomHex(8)}`
        const propName = properNameList[0][i].name
        propDefs.push({ id: propId, name: propName, type: 'VARIANT', defaultValue: '' })
        propValues.set(propName, new Set())
      }

      for (const node of selectedNodes) {
        const properNameList = generateVariantName(node.name)
        const values: Record<string, string> = {}
        for (const defItem of propDefs) {
          const value = properNameList.find((p) => p.name === defItem.name)?.value ?? ''
          values[defItem.name] = value
          propValues.get(defItem.name)?.add(value)
        }
        ctx.graph.updateNode(node.id, {
          componentPropertyValues: values,
          name: Object.values(values)
            .map((it, idx) => `${propDefs[idx].name}=${it}`)
            .join(', ')
        })
      }

      for (const def of propDefs) {
        def.variantOptions = [...(propValues.get(def.name) ?? [])]
        if (!def.defaultValue && def.variantOptions[0]) def.defaultValue = def.variantOptions[0]
      }

      ctx.graph.updateNode(containerId, { componentPropertyDefinitions: propDefs })
    }
  }

  const focusActions = createComponentFocusActions(ctx)
  const instanceActions = createComponentInstanceActions(ctx)
  const variantActions = createVariantActions(ctx)

  return {
    createComponentFromSelection,
    createComponentSetFromComponents,
    ...instanceActions,
    ...focusActions,
    ...variantActions
  }
}
