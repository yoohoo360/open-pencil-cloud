import type { ComponentPropAssignment, ComponentPropRef, OverrideContext } from '../types'

export function collectPropRefsMap(ctx: OverrideContext): Map<string, ComponentPropRef[]> {
  if (ctx.componentPropRefsMap) return ctx.componentPropRefsMap
  const result = new Map<string, ComponentPropRef[]>()
  for (const [figmaId, nc] of ctx.changeMap) {
    if (nc.componentPropRefs?.length) result.set(figmaId, nc.componentPropRefs)
  }
  ctx.componentPropRefsMap = result
  return result
}

export function collectAssignmentsMap(
  ctx: OverrideContext
): Map<string, ComponentPropAssignment[]> {
  if (ctx.componentPropAssignmentsMap) return ctx.componentPropAssignmentsMap
  const result = new Map<string, ComponentPropAssignment[]>()
  for (const [figmaId, nc] of ctx.changeMap) {
    if (nc.componentPropAssignments?.length) result.set(figmaId, nc.componentPropAssignments)
  }
  ctx.componentPropAssignmentsMap = result
  return result
}
