import {
  createTextEditSession,
  resizeTextNodeForEdit,
  snapshotTextNode,
  textSnapshotChanged,
  type TextEditSession
} from './text/session'
import type { EditorContext } from './types'

type InstanceOverridesSnapshot = {
  instanceId: string
  overrides: Record<string, unknown>
}

function containingInstanceIds(ctx: EditorContext, nodeId: string): string[] {
  const ids: string[] = []
  let current = ctx.graph.getNode(nodeId)
  while (current?.parentId) {
    current = ctx.graph.getNode(current.parentId)
    if (current?.type === 'INSTANCE') ids.push(current.id)
  }
  return ids
}

function snapshotInstanceOverrides(
  ctx: EditorContext,
  instanceIds: string[]
): InstanceOverridesSnapshot[] {
  return instanceIds.flatMap((instanceId) => {
    const instance = ctx.graph.getNode(instanceId)
    return instance?.type === 'INSTANCE'
      ? [{ instanceId, overrides: structuredClone(instance.overrides) }]
      : []
  })
}

function restoreInstanceOverrides(ctx: EditorContext, snapshots: InstanceOverridesSnapshot[]) {
  for (const snapshot of snapshots) {
    ctx.graph.updateNode(snapshot.instanceId, {
      overrides: structuredClone(snapshot.overrides)
    })
  }
}

function applyTextInstanceOverride(
  ctx: EditorContext,
  instanceIds: string[],
  nodeId: string,
  text: string
) {
  for (const instanceId of instanceIds) {
    const instance = ctx.graph.getNode(instanceId)
    if (instance?.type !== 'INSTANCE') continue
    ctx.graph.updateNode(instanceId, {
      overrides: { ...instance.overrides, [`${nodeId}:text`]: text }
    })
  }
}

export function createTextActions(ctx: EditorContext) {
  let activeSession: TextEditSession | null = null

  function startTextEditing(nodeId: string) {
    const te = ctx.getTextEditor()
    if (ctx.state.editingTextId) commitTextEdit()
    const node = ctx.graph.getNode(nodeId)
    if (!node) return
    activeSession = createTextEditSession(node)
    ctx.state.editingTextId = nodeId
    if (te) {
      te.setRenderer(ctx.getRenderer())
      te.start(node)
    }
    ctx.requestRender()
  }

  function commitTextEdit() {
    const te = ctx.getTextEditor()
    if (!te?.isActive) {
      ctx.state.editingTextId = null
      activeSession = null
      return
    }
    const textState = te.state
    if (!textState) {
      te.stop()
      ctx.state.editingTextId = null
      activeSession = null
      ctx.requestRender()
      return
    }
    const result = { nodeId: textState.nodeId, text: textState.text }
    const before = activeSession?.before ?? { text: '', styleRuns: [], size: {} }
    const node = ctx.graph.getNode(result.nodeId)
    const after = snapshotTextNode(node, result.text)
    after.text = result.text
    const sizeChanges =
      before.text !== after.text ? resizeTextNodeForEdit(node, textState.paragraph) : {}
    if (Object.keys(sizeChanges).length > 0) after.size = sizeChanges
    const changed = textSnapshotChanged(before, after)
    const containingInstances = containingInstanceIds(ctx, result.nodeId)
    const instanceOverridesBefore = snapshotInstanceOverrides(ctx, containingInstances)

    te.stop()

    if (!changed) {
      ctx.state.editingTextId = null
      activeSession = null
      ctx.requestRender()
      return
    }

    ctx.graph.updateNode(result.nodeId, {
      text: after.text,
      styleRuns: after.styleRuns,
      ...sizeChanges
    })
    if (before.text !== after.text) {
      applyTextInstanceOverride(ctx, containingInstances, result.nodeId, after.text)
    }
    const instanceOverridesAfter = snapshotInstanceOverrides(ctx, containingInstances)
    ctx.state.editingTextId = null
    activeSession = null

    ctx.undo.push({
      label: 'Edit text',
      forward: () => {
        ctx.graph.updateNode(result.nodeId, {
          text: after.text,
          styleRuns: after.styleRuns,
          ...after.size
        })
        restoreInstanceOverrides(ctx, instanceOverridesAfter)
      },
      inverse: () => {
        ctx.graph.updateNode(result.nodeId, {
          text: before.text,
          styleRuns: before.styleRuns,
          ...before.size
        })
        restoreInstanceOverrides(ctx, instanceOverridesBefore)
      }
    })
  }

  return { startTextEditing, commitTextEdit }
}
