export { buildDsdLayoutUpdates } from './derived-symbol-data/layout'
export { applyGeneratedFreeformStretch, propagateDsdChanges } from './derived-symbol-data/propagate'
export { protectField, type ProtectionMap } from './patches'
export { syncChildrenDeep, syncNodeProps } from './sync'
export type {
  InstanceNodeChange,
  OverrideContext,
  ComponentPropAssignment,
  ComponentPropDef,
  ComponentPropRef,
  ComponentPropValue,
  DerivedSymbolOverride,
  SymbolData,
  SymbolOverride
} from './types'

import { isEqual } from 'es-toolkit/predicate'

import { guidToString, resolvedNumericBindingUpdate } from '@open-pencil/fig/node-change'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { hasInstanceOverride } from '@open-pencil/scene-graph'
import {
  copyFills,
  copyStyleRuns,
  hasSameCopySource,
  markCopySource
} from '@open-pencil/scene-graph/copy'
import type { JSONObject } from '@open-pencil/scene-graph/primitives'

import { applyComponentProperties } from './component-props'
import { applyConstraintScaling } from './constraints'
import { applyDerivedSymbolData } from './derived-symbol-data'
import {
  applyGeneratedFreeformStretch,
  reconcileEffectiveCloneGeometry
} from './derived-symbol-data/propagate'
import {
  advancePopulateInstances,
  createPopulateInstancesJob,
  populateInstances,
  populatedInstanceIds
} from './populate.override'
import { preComputeRoots } from './resolve'
import { applySymbolOverrides } from './symbol/overrides'
import { propagateNodePropsTransitively, propagateOverridesTransitively } from './sync'
import { indexCloneNodes } from './sync/sources'
import type { InstanceNodeChange, OverrideContext, ComponentPropValue } from './types'
import { overrideCandidates, sliceDeadline } from './utils.override'

/** Maps derived from a whole change map; rebuilt only when the change map changes. */
interface ChangeMapIndex {
  overrideKeyToGuid: Map<string, string>
  assetRefToGuid: Map<string, string>
  propDefaults: Map<string, ComponentPropValue>
  propNames: Map<string, string>
}

const changeMapIndexCache = new WeakMap<Map<string, InstanceNodeChange>, ChangeMapIndex>()
const nodeIdToGuidCache = new WeakMap<Map<string, string>, { map: Map<string, string>; size: number }>()

/**
 * Derived lookups are pure functions of the parsed change map, which is stable
 * for a document's lifetime. Pages are populated lazily, so caching them here
 * trades a little memory for not rescanning every node change on every switch.
 */
function changeMapIndex(changeMap: Map<string, InstanceNodeChange>): ChangeMapIndex {
  const cached = changeMapIndexCache.get(changeMap)
  if (cached) return cached

  const overrideKeyToGuid = new Map<string, string>()
  const assetRefToGuid = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (nc.overrideKey) overrideKeyToGuid.set(guidToString(nc.overrideKey), id)
    if (typeof nc.key !== 'string') continue
    assetRefToGuid.set(nc.key, id)
    if (typeof nc.version === 'string') assetRefToGuid.set(`${nc.key}@${nc.version}`, id)
  }

  const propDefaults = new Map<string, ComponentPropValue>()
  const propNames = new Map<string, string>()
  for (const [, nc] of changeMap) {
    if (!nc.componentPropDefs?.length) continue
    for (const def of nc.componentPropDefs) {
      if (!def.id) continue
      const id = guidToString(def.id)
      if (def.initialValue) propDefaults.set(id, def.initialValue)
      if (def.name) propNames.set(id, def.name)
    }
  }

  const index: ChangeMapIndex = { overrideKeyToGuid, assetRefToGuid, propDefaults, propNames }
  changeMapIndexCache.set(changeMap, index)
  return index
}

/** Inverse GUID map. `guidToNodeId` grows as pages materialize, so it is reindexed on growth. */
function nodeIdToGuidFor(guidToNodeId: Map<string, string>): Map<string, string> {
  const cached = nodeIdToGuidCache.get(guidToNodeId)
  if (cached && cached.size === guidToNodeId.size) return cached.map
  const map = new Map<string, string>()
  for (const [figmaId, nodeId] of guidToNodeId) map.set(nodeId, figmaId)
  nodeIdToGuidCache.set(guidToNodeId, { map, size: guidToNodeId.size })
  return map
}

/**
 * Identify nodes whose kiwi NC has explicit property values that DIFFER
 * from their component source. Only these need protection from sync.
 */
function* changedNodeEntries(
  changeMap: Map<string, InstanceNodeChange>,
  guidToNodeId: Map<string, string>,
  activeNodeIds?: Set<string>
): Generator<[string, InstanceNodeChange]> {
  if (!activeNodeIds) {
    for (const [figmaId, nodeId] of guidToNodeId) {
      const nc = changeMap.get(figmaId)
      if (nc) yield [nodeId, nc]
    }
    return
  }
  // Only the active subtree drives the current page, so skip the rest of the document.
  const nodeIdToGuid = nodeIdToGuidFor(guidToNodeId)
  for (const nodeId of activeNodeIds) {
    const figmaId = nodeIdToGuid.get(nodeId)
    if (!figmaId) continue
    const nc = changeMap.get(figmaId)
    if (nc) yield [nodeId, nc]
  }
}

function buildKiwiPropertyNodes(
  graph: SceneGraph,
  entries: Iterable<[string, InstanceNodeChange]>
): Set<string> {
  const result = new Set<string>()
  for (const [nodeId, change] of entries) {
    const nc = change as JSONObject
    const node = graph.getNode(nodeId)
    if (!node?.componentId) continue
    const comp = graph.getNode(node.componentId)
    if (!comp) continue
    const hasDiffRadius =
      (nc.cornerRadius !== undefined || nc.rectangleCornerRadiiIndependent !== undefined) &&
      node.cornerRadius !== comp.cornerRadius
    const hasDiffVisible = nc.visible === false && comp.visible
    const hasDiffFills = nc.fillPaints !== undefined && !isEqual(node.fills, comp.fills)
    const hasDiffStrokes = nc.strokePaints !== undefined && !isEqual(node.strokes, comp.strokes)
    const hasDiffText =
      nc.textData !== undefined &&
      node.type === 'TEXT' &&
      comp.type === 'TEXT' &&
      node.text !== comp.text
    if (hasDiffRadius || hasDiffVisible || hasDiffFills || hasDiffStrokes || hasDiffText) {
      result.add(nodeId)
    }
  }
  return result
}

function buildKiwiGeometryNodes(entries: Iterable<[string, InstanceNodeChange]>): Set<string> {
  const result = new Set<string>()
  for (const [nodeId, nc] of entries) {
    if (nc.fillGeometry?.length || nc.strokeGeometry?.length) result.add(nodeId)
  }
  return result
}

function componentLinkedNodes(graph: SceneGraph, activeNodeIds?: Set<string>): SceneNode[] {
  const nodes: SceneNode[] = []
  for (const node of overrideCandidates(graph, activeNodeIds)) if (node.componentId) nodes.push(node)
  return nodes
}

function instancePlacementPairs(
  graph: SceneGraph,
  activeNodeIds?: Set<string>
): Array<{ sourceChildId: string; childId: string }> {
  const pairs: Array<{ sourceChildId: string; childId: string }> = []
  for (const node of overrideCandidates(graph, activeNodeIds)) {
    if (node.type !== 'INSTANCE' || !node.componentId) continue
    const source = graph.getNode(node.componentId)
    if (!source || source.childIds.length !== node.childIds.length) continue
    for (let index = 0; index < node.childIds.length; index++) {
      pairs.push({ sourceChildId: source.childIds[index], childId: node.childIds[index] })
    }
  }
  return pairs
}

function propagateResolvedFills(
  graph: SceneGraph,
  protectedNodes: Set<string>,
  candidates = componentLinkedNodes(graph)
): void {
  for (let pass = 0; pass < 10; pass++) {
    let changed = false
    for (const node of candidates) {
      if (!node.componentId) continue
      const source = graph.getNode(node.componentId)
      if (!source || isEqual(source.fills, node.fills)) continue
      if (protectedNodes.has(node.id) && !protectedNodes.has(source.id)) continue
      if (hasInstanceOverride(graph, node.id, 'fills')) continue
      graph.updateNode(node.id, { fills: copyFills(source.fills) })
      changed = true
    }
    if (!changed) return
  }
}

function propagateResolvedChildPlacementClones(
  graph: SceneGraph,
  pairs = instancePlacementPairs(graph)
): void {
  for (let pass = 0; pass < 10; pass++) {
    let changed = false
    for (const pair of pairs) {
      const sourceChild = graph.getNode(pair.sourceChildId)
      const child = graph.getNode(pair.childId)
      if (!sourceChild || !child) continue
      if (
        sourceChild.overrideKey &&
        child.overrideKey &&
        sourceChild.overrideKey !== child.overrideKey
      ) {
        continue
      }
      const updates: Partial<SceneNode> = {}
      if (!sourceChild.visible && child.visible) updates.visible = false
      if (sourceChild.x !== child.x) updates.x = sourceChild.x
      if (sourceChild.y !== child.y) updates.y = sourceChild.y
      if (Object.keys(updates).length === 0) continue
      graph.updateNode(child.id, updates)
      changed = true
    }
    if (!changed) return
  }
}

function sameDerivedGlyphSource(
  source: SceneNode['derivedTextGlyphs'],
  target: SceneNode['derivedTextGlyphs']
): boolean {
  if (source === target) return true
  if (!source || !target) return false
  return hasSameCopySource(source, target)
}

function propagateResolvedTextClones(graph: SceneGraph, activeNodeIds?: Set<string>): void {
  const ordered: SceneNode[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const visit = (node: SceneNode) => {
    if (visited.has(node.id) || visiting.has(node.id)) return
    visiting.add(node.id)
    const source = node.componentId ? graph.getNode(node.componentId) : undefined
    if (source?.type === 'TEXT') visit(source)
    visiting.delete(node.id)
    visited.add(node.id)
    if (node.type === 'TEXT' && node.componentId) ordered.push(node)
  }
  for (const nodeId of activeNodeIds ?? graph.nodes.keys()) {
    const node = graph.getNode(nodeId)
    if (node?.type === 'TEXT' && node.componentId) visit(node)
  }

  for (const node of ordered) {
    const source = node.componentId ? graph.getNode(node.componentId) : undefined
    if (source?.type !== 'TEXT' || source.text !== node.text) continue
    if (
      source.width === node.width &&
      source.height === node.height &&
      isEqual(source.fills, node.fills) &&
      isEqual(source.styleRuns, node.styleRuns) &&
      sameDerivedGlyphSource(source.derivedTextGlyphs, node.derivedTextGlyphs)
    ) {
      continue
    }
    graph.updateNode(node.id, {
      width: source.width,
      height: source.height,
      fills: copyFills(source.fills),
      styleRuns: copyStyleRuns(source.styleRuns),
      derivedTextGlyphs: source.derivedTextGlyphs
        ? markCopySource(source.derivedTextGlyphs, structuredClone(source.derivedTextGlyphs))
        : undefined
    })
  }
}

function buildOverrideContext(
  graph: SceneGraph,
  changeMap: Map<string, InstanceNodeChange>,
  guidToNodeId: Map<string, string>,
  blobs: Uint8Array[],
  activeNodeIds?: Set<string>
): OverrideContext {
  const { overrideKeyToGuid, assetRefToGuid, propDefaults, propNames } = changeMapIndex(changeMap)
  const nodeIdToGuid = nodeIdToGuidFor(guidToNodeId)

  const entries = changedNodeEntries(changeMap, guidToNodeId, activeNodeIds)
  const kiwiPropertyNodes = buildKiwiPropertyNodes(graph, entries)
  const geometryOverrideNodes = buildKiwiGeometryNodes(
    changedNodeEntries(changeMap, guidToNodeId, activeNodeIds)
  )

  return {
    graph,
    changeMap,
    guidToNodeId,
    blobs,
    overrideKeyToGuid,
    assetRefToGuid,
    nodeIdToGuid,
    propDefaults,
    propNames,
    preComputedRoot: new Map(),
    preComputedClones: new Map(),
    componentIdRoot: new Map(),
    swappedInstances: new Set(),
    protectedFields: new Map(),
    kiwiPropertyNodes,
    geometryOverrideNodes,
    activeNodeIds
  }
}

function applyResolvedNumericBindings(graph: SceneGraph, activeNodeIds?: Set<string>): void {
  for (const node of overrideCandidates(graph, activeNodeIds)) {
    const updates: Partial<SceneNode> = {}
    for (const [field, variableId] of Object.entries(node.boundVariables)) {
      if (Array.isArray(variableId)) continue
      const value = graph.resolveNumberVariableForNode(node.id, variableId)
      if (value === undefined) continue
      Object.assign(updates, resolvedNumericBindingUpdate(field, value))
    }
    if (Object.keys(updates).length > 0) graph.updateNode(node.id, updates)
  }
}

/** Resumable stages of the override pipeline; the host owns scheduling. */
export interface OverridePipeline {
  /** Expand empty instances within a wall-clock budget; true once population is complete. */
  advancePopulation(budgetMs: number): boolean
  /** Run the next override phase; true once the whole pipeline is complete. */
  advanceOverrides(): boolean
}

/**
 * Same resolution order as {@link populateAndApplyOverrides}, but split into
 * stages the host can drive in slices. A page can hold thousands of clones, so
 * running the whole pipeline in one block freezes the UI for seconds.
 */
export function createOverridePipeline(
  graph: SceneGraph,
  changeMap: Map<string, InstanceNodeChange>,
  guidToNodeId: Map<string, string>,
  blobs: Uint8Array[] = [],
  activeRootIds?: Iterable<string>
): OverridePipeline {
  const populationJob = createPopulateInstancesJob(graph, activeRootIds)
  const overriddenNodes = new Set<string>()
  const propModified = new Set<string>()
  const scaledInstances = new Set<string>()
  let ctx: OverrideContext | undefined
  let phase = 0

  const phases: Array<() => void> = [
    // 1. Populate — clone component trees into empty instances (driven separately).
    () => {
      ctx = buildOverrideContext(
        graph,
        changeMap,
        guidToNodeId,
        blobs,
        populatedInstanceIds(graph, populationJob)
      )
      preComputeRoots(ctx)
    },
    // 2. Symbol overrides — set property values and swap instances.
    () => {
      if (!ctx) return
      for (const id of applySymbolOverrides(ctx)) overriddenNodes.add(id)
      // Nodes with explicit kiwi NC properties are seeds (so their clones get
      // synced with the correct values) AND protected (so sync does not
      // overwrite them with component defaults).
      for (const id of ctx.kiwiPropertyNodes) overriddenNodes.add(id)
      propagateOverridesTransitively(
        graph,
        overriddenNodes,
        ctx.swappedInstances,
        ctx.componentIdRoot,
        undefined,
        ctx.activeNodeIds,
        ctx.protectedFields
      )
    },
    // 3. Component properties — toggle visibility / swap via prop assignments.
    () => {
      if (!ctx) return
      for (const id of applyComponentProperties(ctx)) propModified.add(id)
      if (propModified.size === 0) return
      propagateOverridesTransitively(
        graph,
        propModified,
        ctx.swappedInstances,
        ctx.componentIdRoot,
        overriddenNodes,
        ctx.activeNodeIds,
        ctx.protectedFields
      )
    },
    // 4. Late expansion — swaps can introduce fresh empty instances.
    () => {
      if (!ctx || !activeRootIds) return
      const populated = populateInstances(graph, activeRootIds)
      if (populated) {
        ctx.activeNodeIds = populated
        indexCloneNodes(graph, populated, ctx.preComputedClones)
      }
      const latePropModified = applyComponentProperties(ctx)
      const lateSeeds = new Set([...overriddenNodes, ...propModified, ...latePropModified])
      if (lateSeeds.size > 0) {
        propagateOverridesTransitively(
          graph,
          lateSeeds,
          ctx.swappedInstances,
          ctx.componentIdRoot,
          overriddenNodes,
          ctx.activeNodeIds,
          ctx.protectedFields
        )
      }
      propagateResolvedChildPlacementClones(graph, instancePlacementPairs(graph, ctx.activeNodeIds))
    },
    // 5. Derived symbol data — apply Figma's pre-computed sizes last.
    () => {
      if (!ctx) return
      applyDerivedSymbolData(ctx)
      propagateResolvedFills(
        graph,
        new Set([...ctx.kiwiPropertyNodes, ...overriddenNodes]),
        componentLinkedNodes(graph, ctx.activeNodeIds)
      )
      propagateResolvedTextClones(graph, ctx.activeNodeIds)
      applyConstraintScaling(ctx)
      for (const node of overrideCandidates(graph, ctx.activeNodeIds)) {
        if (node.type !== 'INSTANCE' || !node.componentId) continue
        const component = graph.getNode(node.componentId)
        if (component && (node.width !== component.width || node.height !== component.height)) {
          scaledInstances.add(node.id)
        }
      }
      applyComponentProperties(ctx)
    },
    // 6. Replay — final swaps recreate descendants targeted by earlier overrides.
    () => {
      if (!ctx) return
      const replayedOverrides = applySymbolOverrides(ctx, true)
      propagateNodePropsTransitively(
        graph,
        replayedOverrides,
        ctx.activeNodeIds,
        ctx.protectedFields,
        ctx.preComputedClones
      )
      // Final swaps recreate descendants from component defaults. Reconcile only
      // geometry that already had an authoritative effective size or cross-axis position.
      reconcileEffectiveCloneGeometry(ctx, scaledInstances)
      applyResolvedNumericBindings(graph, ctx.activeNodeIds)
      applyGeneratedFreeformStretch(ctx)
    }
  ]

  return {
    advancePopulation(budgetMs: number): boolean {
      return advancePopulateInstances(graph, populationJob, sliceDeadline(budgetMs))
    },
    advanceOverrides(): boolean {
      if (phase >= phases.length) return true
      phases[phase]()
      phase++
      return phase >= phases.length
    }
  }
}

/**
 *
 * Shared between .fig file import and clipboard paste. Both paths produce
 * a SceneGraph with INSTANCE nodes whose componentId references have been
 * remapped to graph node IDs but whose children may be missing and whose
 * overrides have not yet been applied.
 *
 * Resolution order:
 * 1. Populate — clone component trees into empty instances
 * 2. Symbol overrides — set property values and swap instances
 * 3. Transitive sync — propagate overrides through clone chains
 * 4. Component properties — toggle visibility / swap via prop assignments
 * 5. Second transitive sync — propagate property changes to deeper clones
 * 6. Derived symbol data — apply Figma's pre-computed sizes last
 */
export function populateAndApplyOverrides(
  graph: SceneGraph,
  changeMap: Map<string, InstanceNodeChange>,
  guidToNodeId: Map<string, string>,
  blobs: Uint8Array[] = [],
  activeRootIds?: Iterable<string>
): void {
  const pipeline = createOverridePipeline(graph, changeMap, guidToNodeId, blobs, activeRootIds)
  while (!pipeline.advancePopulation(Number.POSITIVE_INFINITY)) {
    // A non-finite budget always finishes in one slice.
  }
  while (!pipeline.advanceOverrides()) {
    // Drains every phase.
  }
}
