import type { SceneNode } from '@open-pencil/scene-graph'

import type { EditorContext } from '#core/editor/types'

type InstanceCreateSnapshot = Partial<SceneNode> & { id: string }

function createInstanceSnapshot(instance: SceneNode): InstanceCreateSnapshot {
  const { childIds: _childIds, parentId: _parentId, type: _type, ...snapshot } = instance
  return snapshot
}

export function createComponentInstanceActions(ctx: EditorContext) {
  function createInstanceFromComponent(
    componentId: string,
    x?: number,
    y?: number,
    parentId = ctx.state.currentPageId,
    sourceLibraryKey?: string
  ) {
    const importGraph = sourceLibraryKey ? ctx.graph.getLib(sourceLibraryKey)?.graph : null

    if (sourceLibraryKey && !importGraph) {
      return
    }

    let component = sourceLibraryKey
      ? importGraph?.getNode(componentId)
      : ctx.graph.getNode(componentId)

    if (sourceLibraryKey) {
      const componentSet = importGraph?.getNode(component.parentId)
      ctx.graph.addRemoteComponent(sourceLibraryKey, component, componentSet)
    }
    if (component?.type !== 'COMPONENT') return null

    const previousSelection = new Set(ctx.state.selectedIds)
    const instance = ctx.graph.createInstance(
      component.id,
      parentId,
      {
        x: x ?? component.x + component.width + 40,
        y: y ?? component.y
      },
      sourceLibraryKey
    )
    if (!instance) return null

    const instanceId = instance.id
    const snapshot = createInstanceSnapshot(instance)
    ctx.setSelectedIds(new Set([instanceId]))

    ctx.undo.push({
      label: 'Create instance',
      forward: () => {
        if (sourceLibraryKey) {
          const componentSet = importGraph?.getNode(component.parentId)
          ctx.graph.addRemoteComponent(sourceLibraryKey, component, componentSet)
        }
        ctx.graph.createInstance(componentId, parentId, { ...snapshot })
        ctx.setSelectedIds(new Set([instanceId]))
      },
      inverse: () => {
        ctx.graph.deleteNode(instanceId)
        ctx.setSelectedIds(new Set(previousSelection))
        if (sourceLibraryKey) {
          const componentSet = importGraph?.getNode(component.parentId)
          ctx.graph.removeRemoteComponent(sourceLibraryKey, component, componentSet)
        }
      }
    })
    return instanceId
  }

  function detachInstance(selectedNode: SceneNode | undefined) {
    if (selectedNode?.type !== 'INSTANCE') return

    const prevComponentId = selectedNode.componentId

    ctx.graph.detachInstance(selectedNode.id)
    ctx.setSelectedIds(new Set([selectedNode.id]))

    ctx.undo.push({
      label: 'Detach instance',
      forward: () => {
        ctx.graph.detachInstance(selectedNode.id)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(selectedNode.id, {
          type: 'INSTANCE',
          componentId: prevComponentId,
          overrides: {}
        })
      }
    })
  }

  return { createInstanceFromComponent, detachInstance }
}
