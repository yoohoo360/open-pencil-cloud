import type { SceneNode } from '@open-pencil/scene-graph'

import { buildCloneIndex, instanceAndClones } from '../clone-index'
import { resolveOverrideTarget } from '../resolve'
import type {
  ComponentPropAssignment,
  ComponentPropRef,
  ComponentPropValue,
  OverrideContext
} from '../types'
import { applyComponentPropRef } from './apply'
import { fallbackRefsForChild, findPropRefs, valueForRef } from './refs'
import { assignmentsToValueMap } from './values'

function applyChildPropRefs(
  ctx: OverrideContext,
  childId: string,
  refs: ComponentPropRef[] | undefined,
  valueByDef: Map<string, ComponentPropValue>,
  modified?: Set<string>
): void {
  if (!refs) return
  for (const ref of refs) {
    const val = valueForRef(ref, valueByDef)
    if (val) applyComponentPropRef(ctx, childId, ref, val, modified)
  }
}

function sourceChildPropRefs(
  ctx: OverrideContext,
  sourceParentId: string | null | undefined,
  child: SceneNode,
  propRefsMap: Map<string, ComponentPropRef[]>
): ComponentPropRef[] | undefined {
  if (!sourceParentId) return undefined
  const sourceParent = ctx.graph.getNode(sourceParentId)
  if (!sourceParent) return undefined

  let fallbackMatchId: string | undefined
  for (const sourceChildId of sourceParent.childIds) {
    const sourceChild = ctx.graph.getNode(sourceChildId)
    if (!sourceChild) continue
    if (
      sourceChild.id === child.componentId ||
      (sourceChild.componentId && sourceChild.componentId === child.componentId)
    ) {
      return findPropRefs(ctx, sourceChild.id, propRefsMap) ?? []
    }
    if (!fallbackMatchId && sourceChild.name === child.name && sourceChild.type === child.type) {
      fallbackMatchId = sourceChild.id
    }
  }

  return fallbackMatchId ? findPropRefs(ctx, fallbackMatchId, propRefsMap) : undefined
}

function applyPropAssignments(
  ctx: OverrideContext,
  parentId: string,
  valueByDef: Map<string, ComponentPropValue>,
  propRefsMap: Map<string, ComponentPropRef[]>,
  modified?: Set<string>
): void {
  const parent = ctx.graph.getNode(parentId)
  if (!parent) return

  for (const childId of parent.childIds) {
    const child = ctx.graph.getNode(childId)
    if (!child?.componentId) {
      applyPropAssignments(ctx, childId, valueByDef, propRefsMap, modified)
      continue
    }

    const refs =
      sourceChildPropRefs(ctx, parent.componentId, child, propRefsMap) ??
      findPropRefs(ctx, child.componentId, propRefsMap) ??
      fallbackRefsForChild(ctx, child.name, valueByDef)
    applyChildPropRefs(ctx, childId, refs, valueByDef, modified)
    applyPropAssignments(ctx, childId, valueByDef, propRefsMap, modified)
  }
}

export function applyInstanceDirectAssignments(
  ctx: OverrideContext,
  assignmentSources: Map<string, ComponentPropAssignment[]>,
  propRefsMap: Map<string, ComponentPropRef[]>,
  modified: Set<string>
): void {
  for (const [figmaId, assignments] of assignmentSources) {
    const nodeId = ctx.guidToNodeId.get(figmaId)
    if (!nodeId || (ctx.activeNodeIds && !ctx.activeNodeIds.has(nodeId))) continue
    if (ctx.graph.getNode(nodeId)?.type !== 'INSTANCE') continue
    applyPropAssignments(
      ctx,
      nodeId,
      assignmentsToValueMap(ctx, assignments),
      propRefsMap,
      modified
    )
  }
}

export function applyOverrideAssignments(
  ctx: OverrideContext,
  propRefsMap: Map<string, ComponentPropRef[]>,
  modified: Set<string>
): void {
  const clonesBySource = buildCloneIndex(ctx)
  const clonesByInstance = new Map<string, string[]>()
  for (const [figmaId, nc] of ctx.changeMap) {
    const instanceNodeId = ctx.guidToNodeId.get(figmaId)
    if (!instanceNodeId || (ctx.activeNodeIds && !ctx.activeNodeIds.has(instanceNodeId))) continue
    if (ctx.graph.getNode(instanceNodeId)?.type !== 'INSTANCE') continue

    const overrides = nc.symbolData?.symbolOverrides
    if (!overrides) continue
    for (const ov of overrides) {
      if (!ov.componentPropAssignments?.length) continue

      const guids = ov.guidPath?.guids
      if (!guids?.length) continue

      const valueByDef = assignmentsToValueMap(ctx, ov.componentPropAssignments, true)
      for (const targetInstanceId of instanceAndClones(
        instanceNodeId,
        clonesBySource,
        clonesByInstance
      )) {
        const targetId = resolveOverrideTarget(ctx, targetInstanceId, guids)
        if (!targetId) continue

        applyPropAssignments(ctx, targetId, valueByDef, propRefsMap, modified)
      }
    }
  }
}
