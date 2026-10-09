import { guidToString } from '@open-pencil/fig/node-change'

import type { ComponentPropRef, ComponentPropValue, OverrideContext } from '../types'
import { normalizePropName, stringToGuidParts } from './values'

export function findPropRefs(
  ctx: OverrideContext,
  nodeId: string,
  propRefsMap: Map<string, ComponentPropRef[]>
): ComponentPropRef[] | undefined {
  let sourceId: string | undefined = nodeId
  for (let depth = 0; sourceId && depth < 10; depth++) {
    const node = ctx.graph.getNode(sourceId)
    const overrideKey = node?.overrideKey
      ? (ctx.overrideKeyToGuid.get(node.overrideKey) ?? node.overrideKey)
      : undefined
    const figmaId = ctx.nodeIdToGuid.get(sourceId) ?? overrideKey
    if (figmaId) {
      const refs = propRefsMap.get(figmaId)
      if (refs) return refs
    }
    const nextId = node?.componentId ?? undefined
    if (nextId === sourceId) break
    sourceId = nextId
  }
  return undefined
}

export function fallbackRefsForChild(
  ctx: OverrideContext,
  childName: string,
  valueByDef: Map<string, ComponentPropValue>
): ComponentPropRef[] | undefined {
  const normalizedChildName = normalizePropName(childName)
  const refs: ComponentPropRef[] = []
  for (const defId of valueByDef.keys()) {
    const propName = ctx.propNames.get(defId)
    if (propName && normalizePropName(propName) === normalizedChildName) {
      refs.push({ defID: stringToGuidParts(defId), componentPropNodeField: 'VISIBLE' })
    }
  }
  return refs.length > 0 ? refs : undefined
}

export function valueForRef(
  ref: ComponentPropRef,
  valueByDef: Map<string, ComponentPropValue>
): ComponentPropValue | undefined {
  return ref.defID ? valueByDef.get(guidToString(ref.defID)) : undefined
}
