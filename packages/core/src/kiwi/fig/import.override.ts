import { isNotNil } from 'es-toolkit/predicate'

import { populateAndApplyOverrides } from '@open-pencil/fig/instance-overrides'
import type { InstanceNodeChange } from '@open-pencil/fig/instance-overrides'
import {
  applyStyleRefsToFields,
  ENABLED_LIBRARIES_PLUGIN_KEY,
  getOpenPencilPluginValue,
  guidToString,
  importCanvasGuides,
  nodeChangeToProps,
  shouldImportTextAsAutoSize,
  sortChildren,
  resolveVariableConsumptionEntry,
  setVariableColorResolver
} from '@open-pencil/fig/node-change'
import type { NodeChange, VariableDataValuesEntry, Color, GUID } from '@open-pencil/kiwi/fig/codec'
import { SceneGraph } from '@open-pencil/scene-graph'
import type {
  ComponentPropertyDefinition,
  VariableType,
  VariableValue
} from '@open-pencil/scene-graph'

import { BLACK } from '#core/constants'
import { setLazyFigImportContext } from '#core/kiwi/fig/lazy-import'

type AssetRef = { key: string; version?: string }
type AliasRef = { guid?: GUID; assetRef?: AssetRef }

/** One frame of the resumable page-materialization walk. */
interface MaterializeFrame {
  ncId: string
  /** -1 until the node itself exists; afterwards the next child slot to visit. */
  childIndex: number
}

/**
 * Page materialization state kept across chunks. Building a page is a deep
 * tree walk plus a component closure; both are kept here so the walk can be
 * paused inside a time budget and resumed without redoing finished work.
 */
interface MaterializeJob {
  stack: MaterializeFrame[]
  /** Component/symbol node changes this page references, expanded transitively. */
  symbols: string[]
  symbolIndex: number
  symbolSeen: Set<string>
  /** Node changes created by this job, used by the late remap passes. */
  createdNcIds: string[]
}

function nowMs(): number {
  return globalThis.performance?.now() ?? Date.now()
}

function applyImportedCanvasMetadata(
  page: ReturnType<SceneGraph['addPage']>,
  canvasNc: NodeChange
) {
  page.source.format = 'fig'
  page.source.orderKey = canvasNc.parentIndex?.position ?? null
  if (canvasNc.backgroundColor)
    page.source.fig.rawNodeFields.backgroundColor = structuredClone(canvasNc.backgroundColor)
  if (canvasNc.backgroundPaints)
    page.source.fig.rawNodeFields.backgroundPaints = structuredClone(canvasNc.backgroundPaints)
  if (canvasNc.guides) {
    page.guides = importCanvasGuides(canvasNc.guides)
    page.source.fig.rawNodeFields.guides = structuredClone(canvasNc.guides)
  }
  page.source.fig.rawNodeFields.strokeJoin = canvasNc.strokeJoin
  page.source.fig.rawNodeFields.strokeWeight = canvasNc.strokeWeight
  if (canvasNc.pageType) page.source.fig.rawNodeFields.pageType = canvasNc.pageType
}

function applyImportedDocumentMetadata(graph: SceneGraph, docNc: NodeChange | undefined) {
  const rootNode = graph.getNode(graph.rootId)
  if (!docNc || !rootNode) return
  rootNode.source.format = 'fig'
  rootNode.pluginData = docNc.pluginData
    ? docNc.pluginData.map((entry) => ({
        pluginId: entry.pluginID,
        key: entry.key,
        value: entry.value
      }))
    : []
  rootNode.source.fig.rawNodeFields.strokeJoin = docNc.strokeJoin
  rootNode.source.fig.rawNodeFields.strokeWeight = docNc.strokeWeight
  const bindings = getOpenPencilPluginValue(docNc, ENABLED_LIBRARIES_PLUGIN_KEY)
  if (!bindings) return
  try {
    const parsed = JSON.parse(bindings) as unknown
    if (!Array.isArray(parsed)) return
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
      const value = entry as { libraryId?: unknown; revisionId?: unknown; enabled?: unknown }
      if (typeof value.libraryId !== 'string' || typeof value.revisionId !== 'string') continue
      graph.enabledLibraries.set(value.libraryId, {
        libraryId: value.libraryId,
        revisionId: value.revisionId,
        enabled: value.enabled === true
      })
    }
  } catch (error) {
    console.warn('Ignored malformed OpenPencil library metadata', error)
  }
}

function assetRefKey(assetRef: AssetRef): string {
  return assetRef.version ? `${assetRef.key}@${assetRef.version}` : assetRef.key
}

function buildAssetRefMap(changeMap: Map<string, NodeChange>): Map<string, string> {
  const refs = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (typeof nc.key !== 'string') continue
    if (typeof nc.version !== 'string' || !refs.has(nc.key)) refs.set(nc.key, id)
    if (typeof nc.version === 'string')
      refs.set(assetRefKey({ key: nc.key, version: nc.version }), id)
    if (typeof nc.userFacingVersion === 'string') {
      refs.set(assetRefKey({ key: nc.key, version: nc.userFacingVersion }), id)
    }
  }
  return refs
}

function resolveAliasId(alias: AliasRef, assetRefs: Map<string, string>): string | undefined {
  if (alias.guid) return guidToString(alias.guid)
  if (!alias.assetRef) return undefined
  return assetRefs.get(assetRefKey(alias.assetRef)) ?? assetRefs.get(alias.assetRef.key)
}

function buildVariableColorResolver(
  changeMap: Map<string, NodeChange>,
  assetRefs: Map<string, string>
): (alias: AliasRef) => Color | null {
  // Collect variable data: GUID → entries
  const varEntries = new Map<string, VariableDataValuesEntry[]>()
  const varSetId = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE') continue
    varEntries.set(id, nc.variableDataValues?.entries ?? [])
    const setGuid = nc.variableSetID?.guid ? guidToString(nc.variableSetID.guid) : undefined
    const parentGuid = nc.parentIndex?.guid ? guidToString(nc.parentIndex.guid) : undefined
    if (setGuid) varSetId.set(id, setGuid)
    else if (parentGuid) varSetId.set(id, parentGuid)
  }

  // Collection default modes
  const defaultModes = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE_SET') continue
    const modes = nc.variableSetModes ?? []
    if (modes.length > 0) defaultModes.set(id, guidToString(modes[0].id))
  }

  function resolveById(
    id: string,
    preferredModeId: string | undefined,
    depth: number
  ): Color | null {
    if (depth > 10) return null
    const entries = varEntries.get(id)
    if (!entries?.length) return null

    const setId = varSetId.get(id)
    const defaultMode = setId ? defaultModes.get(setId) : undefined
    let entry = preferredModeId
      ? entries.find((e) => guidToString(e.modeID) === preferredModeId)
      : undefined
    if (!entry && defaultMode) entry = entries.find((e) => guidToString(e.modeID) === defaultMode)
    if (!entry) entry = entries[0]

    const val = entry.variableData.value
    if (!val) return null
    if (val.colorValue) return val.colorValue
    if (val.alias) {
      const aliasId = resolveAliasId(val.alias, assetRefs)
      if (aliasId) return resolveById(aliasId, guidToString(entry.modeID), depth + 1)
    }
    return null
  }

  return function resolve(alias: AliasRef): Color | null {
    const id = resolveAliasId(alias, assetRefs)
    return id ? resolveById(id, undefined, 0) : null
  }
}

interface ChangeMaps {
  changeMap: Map<string, NodeChange>
  parentMap: Map<string, string>
  childrenMap: Map<string, string[]>
}

function buildChangeMaps(nodeChanges: NodeChange[]): ChangeMaps {
  const changeMap = new Map<string, NodeChange>()
  const parentMap = new Map<string, string>()
  const childrenMap = new Map<string, string[]>()

  for (const nc of nodeChanges) {
    if (!nc.guid) continue
    if (nc.phase === 'REMOVED') continue
    const id = guidToString(nc.guid)
    changeMap.set(id, nc)

    if (nc.parentIndex?.guid) {
      const pid = guidToString(nc.parentIndex.guid)
      parentMap.set(id, pid)
      let siblings = childrenMap.get(pid)
      if (!siblings) {
        siblings = []
        childrenMap.set(pid, siblings)
      }
      siblings.push(id)
    }
  }

  for (const [parentId, children] of childrenMap) {
    const parentNc = changeMap.get(parentId)
    if (parentNc) sortChildren(children, parentNc, changeMap)
  }

  return { changeMap, parentMap, childrenMap }
}

function resolveVariableType(resolvedType: string | undefined): VariableType {
  if (resolvedType === 'COLOR') return 'COLOR'
  if (resolvedType === 'BOOLEAN') return 'BOOLEAN'
  if (resolvedType === 'STRING') return 'STRING'
  return 'FLOAT'
}

function resolveVariableValue(
  entry: VariableDataValuesEntry,
  assetRefs: Map<string, string>
): VariableValue | undefined {
  const vd = entry.variableData
  if (!vd.value) return undefined

  const dt = vd.dataType ?? vd.resolvedDataType
  if (dt === 'COLOR' && vd.value.colorValue) {
    const c = vd.value.colorValue
    return { r: c.r, g: c.g, b: c.b, a: c.a }
  }
  if (dt === 'BOOLEAN') return vd.value.boolValue ?? false
  if (dt === 'STRING') return vd.value.textValue ?? ''
  if (dt === 'ALIAS' && vd.value.alias) {
    const aliasId = resolveAliasId(vd.value.alias, assetRefs)
    if (aliasId) return { aliasId }
    return undefined
  }
  return vd.value.floatValue ?? 0
}

function resolveDefaultValue(type: VariableType): VariableValue {
  if (type === 'BOOLEAN') return false
  if (type === 'STRING') return ''
  if (type === 'COLOR') return { ...BLACK }
  return 0
}

function importCollections(changeMap: Map<string, NodeChange>, graph: SceneGraph): void {
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE_SET') continue

    const modes = (nc.variableSetModes ?? []).map((m) => {
      const modeId = guidToString(m.id)
      return { modeId, name: m.name }
    })
    if (modes.length === 0) modes.push({ modeId: 'default', name: 'Default' })

    graph.addCollection({
      id,
      name: nc.name ?? 'Variables',
      modes,
      defaultModeId: modes[0].modeId,
      variableIds: []
    })
  }
}

function resolveVariableCollectionId(
  nc: NodeChange,
  id: string,
  parentMap: Map<string, string>,
  assetRefs: Map<string, string>
): string {
  if (nc.variableSetID?.guid) return guidToString(nc.variableSetID.guid)
  const assetRef = nc.variableSetID?.assetRef
  if (assetRef) return assetRefs.get(assetRefKey(assetRef)) ?? assetRefs.get(assetRef.key) ?? ''
  return parentMap.get(id) ?? ''
}

function addFallbackCollection(
  changeMap: Map<string, NodeChange>,
  graph: SceneGraph,
  collectionId: string
): void {
  if (graph.variableCollections.has(collectionId)) return
  const parentNc = changeMap.get(collectionId)
  graph.addCollection({
    id: collectionId,
    name: parentNc?.name ?? 'Variables',
    modes: [{ modeId: 'default', name: 'Default' }],
    defaultModeId: 'default',
    variableIds: []
  })
}

function importVariableEntries(
  changeMap: Map<string, NodeChange>,
  parentMap: Map<string, string>,
  graph: SceneGraph,
  assetRefs: Map<string, string>
): void {
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE') continue

    const collectionId = resolveVariableCollectionId(nc, id, parentMap, assetRefs)
    addFallbackCollection(changeMap, graph, collectionId)

    const type = resolveVariableType(nc.variableResolvedType)
    const valuesByMode: Record<string, VariableValue> = {}

    if (nc.variableDataValues?.entries) {
      for (const entry of nc.variableDataValues.entries) {
        const val = resolveVariableValue(entry, assetRefs)
        if (val !== undefined) {
          valuesByMode[guidToString(entry.modeID)] = val
        }
      }
    }

    if (Object.keys(valuesByMode).length === 0) {
      const col = graph.variableCollections.get(collectionId)
      const defaultMode = col?.defaultModeId ?? 'default'
      valuesByMode[defaultMode] = resolveDefaultValue(type)
    }

    graph.addVariable({
      id,
      name: nc.name ?? 'Variable',
      type,
      collectionId,
      valuesByMode,
      description: '',
      hiddenFromPublishing: false,
      key: typeof nc.key === 'string' ? nc.key : undefined,
      version: typeof nc.version === 'string' ? nc.version : undefined
    })
  }
}

function importPageShells(
  graph: SceneGraph,
  changeMap: Map<string, NodeChange>,
  childrenMap: Map<string, string[]>,
  created: Set<string>,
  canvasIdToPageId: Map<string, string>
): string | null {
  let docId: string | null = null
  for (const [id, nc] of changeMap) {
    if (nc.type === 'DOCUMENT' || id === '0:0') {
      docId = id
      break
    }
  }

  if (!docId) return null

  applyImportedDocumentMetadata(graph, changeMap.get(docId))

  for (const canvasId of childrenMap.get(docId) ?? []) {
    const canvasNc = changeMap.get(canvasId)
    if (!canvasNc) continue
    if (canvasNc.type === 'CANVAS') {
      const page = graph.addPage(canvasNc.name ?? 'Page')
      page.source.id = canvasId
      applyImportedCanvasMetadata(page, canvasNc)
      canvasIdToPageId.set(canvasId, page.id)
      if (canvasNc.internalOnly) page.internalOnly = true
      created.add(canvasId)
    } else {
      // Non-canvas document child: materialize with the first page later.
    }
  }
  return docId
}

/**
 * Symbol dependencies of a subtree, memoized per node change.
 *
 * Every page materialize needs the symbol closure of its own tree. The naive
 * walk re-scans shared component subtrees once per page, so a document whose
 * pages reference the same library degrades into repeated full-tree walks.
 * Memoizing each node's own ref set keeps the closure cost proportional to the
 * nodes a page newly pulls in.
 */
function createSymbolRefCollector(
  changeMap: Map<string, NodeChange>,
  childrenMap: Map<string, string[]>
): (rootIds: Iterable<string>) => Set<string> {
  const subtreeRefs = new Map<string, Set<string>>()

  function refsFor(ncId: string): Set<string> {
    const cached = subtreeRefs.get(ncId)
    if (cached) return cached
    const refs = new Set<string>()
    // Registered before descending so a malformed cyclic map cannot recurse forever.
    subtreeRefs.set(ncId, refs)
    const nc = changeMap.get(ncId)
    if (!nc) return refs
    const symbolId = nc.symbolData?.symbolID
    if (symbolId) refs.add(guidToString(symbolId))
    for (const childId of childrenMap.get(ncId) ?? []) {
      for (const ref of refsFor(childId)) refs.add(ref)
    }
    return refs
  }

  return (rootIds) => {
    const refs = new Set<string>()
    for (const id of rootIds) for (const ref of refsFor(id)) refs.add(ref)
    return refs
  }
}

function importVariableBindings(
  changeMap: Map<string, NodeChange>,
  guidToNodeId: Map<string, string>,
  graph: SceneGraph,
  ncIds?: Iterable<string>
): void {
  for (const ncId of ncIds ?? changeMap.keys()) {
    const nc = changeMap.get(ncId)
    if (!nc?.variableConsumptionMap?.entries?.length) continue
    const nodeId = guidToNodeId.get(ncId)
    if (!nodeId) continue
    for (const entry of nc.variableConsumptionMap.entries) {
      const binding = resolveVariableConsumptionEntry(entry)
      if (binding) graph.bindVariable(nodeId, binding.field, binding.variableId)
    }
  }
}

function remapComponentIds(
  graph: SceneGraph,
  guidToNodeId: Map<string, string>,
  nodeIds?: Iterable<string>
): void {
  graph.preserveSourceMetadataDuring(() => {
    const nodes = nodeIds
      ? [...nodeIds].map((id) => graph.getNode(id)).filter(isNotNil)
      : [...graph.getAllNodes()]
    for (const node of nodes) {
      if (node.type !== 'INSTANCE' || !node.componentId) continue
      const remapped = guidToNodeId.get(node.componentId)
      if (remapped) graph.updateNode(node.id, { componentId: remapped })
    }
  })
}

/**
 * INSTANCE_SWAP definitions/assignments store a target node's GUID (matching
 * how it was exported), not this import's freshly-assigned node ID — remap
 * them the same way remapComponentIds fixes up instance.componentId.
 *
 * `propDefsById` is a caller-owned index so incrementally materialized pages
 * only pay for the nodes they add instead of rescanning the whole graph.
 */
function remapInstanceSwapPropertyValues(
  graph: SceneGraph,
  guidToNodeId: Map<string, string>,
  nodeIds?: Iterable<string>,
  propDefsById?: Map<string, ComponentPropertyDefinition>
): void {
  const defsById = propDefsById ?? new Map<string, ComponentPropertyDefinition>()
  if (defsById.size === 0) {
    for (const node of graph.getAllNodes()) {
      for (const def of node.componentPropertyDefinitions) {
        if (!defsById.has(def.id)) defsById.set(def.id, def)
      }
    }
  }

  graph.preserveSourceMetadataDuring(() => {
    const nodes = nodeIds
      ? [...nodeIds].map((id) => graph.getNode(id)).filter(isNotNil)
      : [...graph.getAllNodes()]
    if (nodeIds) {
      for (const node of nodes) {
        for (const def of node.componentPropertyDefinitions) {
          if (!defsById.has(def.id)) defsById.set(def.id, def)
        }
      }
    }
    for (const node of nodes) {
      if (node.componentPropertyDefinitions.length > 0) {
        const defs = node.componentPropertyDefinitions.map((def) => {
          if (def.type !== 'INSTANCE_SWAP') return def
          const remappedDefault = def.defaultValue ? guidToNodeId.get(def.defaultValue) : undefined
          if (!remappedDefault) return def
          return { ...def, defaultValue: remappedDefault }
        })
        const changed = defs.some((def, i) => def !== node.componentPropertyDefinitions[i])
        if (changed) graph.updateNode(node.id, { componentPropertyDefinitions: defs })
      }

      if (Object.keys(node.componentPropertyAssignments).length > 0) {
        let changed = false
        const assignments = { ...node.componentPropertyAssignments }
        for (const [propId, value] of Object.entries(assignments)) {
          if (defsById.get(propId)?.type !== 'INSTANCE_SWAP') continue
          const remapped = guidToNodeId.get(value)
          if (remapped) {
            assignments[propId] = remapped
            changed = true
          }
        }
        if (changed) graph.updateNode(node.id, { componentPropertyAssignments: assignments })
      }
    }
  })
}

function applyVariantPropSpecs(graph: SceneGraph, nodeIds?: Iterable<string>): void {
  const nodes = nodeIds
    ? [...nodeIds].map((id) => graph.getNode(id)).filter(isNotNil)
    : [...graph.getAllNodes()]
  for (const node of nodes) {
    if (node.type !== 'COMPONENT' || node.variantPropSpecs.length === 0 || !node.parentId) continue
    const parent = graph.getNode(node.parentId)
    if (parent?.type !== 'COMPONENT_SET') continue
    const defs = new Map(parent.componentPropertyDefinitions.map((def) => [def.id, def.name]))
    const values: Record<string, string> = {}
    for (const spec of node.variantPropSpecs)
      values[defs.get(spec.propDefId) ?? spec.propDefId] = spec.value
    graph.updateNode(node.id, { componentPropertyValues: values })
  }
}

function parseDocumentColorSpace(nodeChanges: NodeChange[]): 'srgb' | 'display-p3' {
  const documentNode = nodeChanges.find((nc) => nc.type === 'DOCUMENT')
  return documentNode?.documentColorProfile === 'DISPLAY_P3' ? 'display-p3' : 'srgb'
}

function applyStyleRefs(
  changeMap: Map<string, NodeChange>,
  assetRefs: ReadonlyMap<string, string>
): void {
  for (const nc of changeMap.values()) applyStyleRefsToFields(changeMap, nc, assetRefs)
}

export interface FigImportOptions {
  populate?: 'all' | 'first-page' | 'none'
}

function rememberLazyFigImportContext(
  graph: SceneGraph,
  changeMap: Map<string, NodeChange>,
  guidToNodeId: Map<string, string>,
  blobs: Uint8Array[],
  populatedRootIds: string[],
  parentMap: Map<string, string>,
  childrenMap: Map<string, string[]>,
  canvasIdToPageId: Map<string, string>,
  created: Set<string>,
  materializedPageIds: Set<string>,
  materializePage: (pageId: string) => void,
  materializePageChunk: (pageId: string, budgetMs: number) => boolean
): void {
  setLazyFigImportContext(graph, {
    changeMap: changeMap as Map<string, InstanceNodeChange>,
    guidToNodeId,
    blobs,
    populatedRootIds: new Set(populatedRootIds),
    parentMap,
    childrenMap,
    canvasIdToPageId,
    created,
    materializedPageIds,
    materializePage,
    materializePageChunk
  })
}

export function importNodeChanges(
  nodeChanges: NodeChange[],
  blobs: Uint8Array[] = [],
  images?: Map<string, Uint8Array>,
  options: FigImportOptions = {}
): SceneGraph {
  const graph = new SceneGraph()
  graph.documentColorSpace = parseDocumentColorSpace(nodeChanges)

  if (images) {
    for (const [hash, data] of images) {
      graph.images.set(hash, data)
    }
  }

  for (const page of graph.getPages(true)) {
    graph.deleteNode(page.id)
  }

  const { changeMap, parentMap, childrenMap } = buildChangeMaps(nodeChanges)
  const assetRefs = buildAssetRefMap(changeMap)
  applyStyleRefs(changeMap, assetRefs)
  setVariableColorResolver(buildVariableColorResolver(changeMap, assetRefs))

  const canvasIdToPageId = new Map<string, string>()
  const created = new Set<string>()
  /** Nodes whose whole descendant tree is already present; lets shared component subtrees be skipped on later pages. */
  const fullyCreated = new Set<string>()
  const guidToNodeId = new Map<string, string>()
  const materializedPageIds = new Set<string>()
  const collectSymbolRefs = createSymbolRefCollector(changeMap, childrenMap)
  const componentPropDefsById = new Map<string, ComponentPropertyDefinition>()
  /** In-flight page materializations, keyed by page id. */
  const materializeJobs = new Map<string, MaterializeJob>()
  /** Job whose creations are being recorded; only one page materializes at a time. */
  let recordingJob: MaterializeJob | undefined
  const getChildren = (ncId: string): string[] => childrenMap.get(ncId) ?? []

  function createNodeOnly(ncId: string, graphParentId: string): void {
    if (created.has(ncId)) return
    const nc = changeMap.get(ncId)
    if (!nc) return

    const { nodeType, ...props } = nodeChangeToProps(nc, blobs)
    if (props.sharedStyleType) props.internalOnly = true
    if (nodeType === 'DOCUMENT' || nodeType === 'VARIABLE' || nc.type === 'VARIABLE_SET') return
    if (shouldImportTextAsAutoSize(nc, changeMap.get(parentMap.get(ncId) ?? ''))) {
      props.textAutoResize = 'WIDTH_AND_HEIGHT'
    }

    created.add(ncId)
    recordingJob?.createdNcIds.push(ncId)
    const parentId = canvasIdToPageId.get(graphParentId) ?? graphParentId
    const node = graph.createNode(nodeType, parentId, props)
    guidToNodeId.set(ncId, node.id)
  }

  /** Create ancestors without siblings, then optionally the full descendant tree. */
  function ensureCreated(ncId: string, withDescendants: boolean): void {
    // Already materialized with its whole subtree: nothing left to walk.
    if (fullyCreated.has(ncId)) return
    if (!changeMap.has(ncId)) return
    if (!created.has(ncId)) {
      const parentNcId = parentMap.get(ncId)
      if (parentNcId && !canvasIdToPageId.has(parentNcId)) {
        ensureCreated(parentNcId, false)
      }
      const parentGraphId =
        (parentNcId ? canvasIdToPageId.get(parentNcId) : undefined) ??
        (parentNcId ? guidToNodeId.get(parentNcId) : undefined) ??
        graph.rootId
      createNodeOnly(ncId, parentGraphId)
    }
    if (withDescendants) {
      for (const childId of getChildren(ncId)) ensureCreated(childId, true)
      fullyCreated.add(ncId)
    }
  }

  /** Create the pending subtree entries until the deadline; false when the budget ran out. */
  function walkMaterializeStack(stack: MaterializeFrame[], deadline: number): boolean {
    while (stack.length > 0) {
      if (nowMs() >= deadline) return false
      const frame = stack[stack.length - 1]
      if (frame.childIndex < 0) {
        // Ancestors only — children are pushed below so the walk stays resumable.
        ensureCreated(frame.ncId, false)
        frame.childIndex = 0
      }
      const children = getChildren(frame.ncId)
      if (frame.childIndex < children.length) {
        const childNcId = children[frame.childIndex]
        frame.childIndex++
        if (!fullyCreated.has(childNcId)) stack.push({ ncId: childNcId, childIndex: -1 })
        continue
      }
      fullyCreated.add(frame.ncId)
      stack.pop()
    }
    return true
  }

  /**
   * Later passes need the referenced component nodes to exist, so they run once
   * the page and its component closure are complete.
   */
  function finishMaterializedPage(job: MaterializeJob): void {
    const ncIds = job.createdNcIds
    if (ncIds.length === 0) return
    const nodeIds = ncIds.map((ncId) => guidToNodeId.get(ncId)).filter(isNotNil)
    if (nodeIds.length === 0) return
    importVariableBindings(changeMap, guidToNodeId, graph, ncIds)
    remapComponentIds(graph, guidToNodeId, nodeIds)
    remapInstanceSwapPropertyValues(graph, guidToNodeId, nodeIds, componentPropDefsById)
    applyVariantPropSpecs(graph, nodeIds)
  }

  /**
   * Advance one page's materialization by at most `budgetMs` of wall clock.
   * Returns true once the page — and the component trees it references — is
   * fully built. Budgeted chunks let the host keep painting a loading state
   * instead of blocking on a multi-second synchronous build.
   */
  function advancePageMaterialization(
    pageId: string,
    budgetMs: number,
    postProcess: boolean
  ): boolean {
    const deadline = budgetMs === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : nowMs() + budgetMs
    let job = materializeJobs.get(pageId)
    if (!job) {
      if (materializedPageIds.has(pageId)) return true
      const page = graph.getNode(pageId)
      if (page?.type !== 'CANVAS') return true
      const canvasId =
        typeof page.source.id === 'string' && page.source.id.length > 0
          ? page.source.id
          : [...canvasIdToPageId.entries()].find(([, id]) => id === pageId)?.[0]
      if (!canvasId) return true
      const rootNcIds = getChildren(canvasId)
      job = {
        stack: rootNcIds.map((ncId) => ({ ncId, childIndex: -1 })).reverse(),
        // Pull in only the component trees referenced by this page, not the whole library canvas.
        symbols: [...collectSymbolRefs(rootNcIds)],
        symbolIndex: 0,
        symbolSeen: new Set(),
        createdNcIds: []
      }
      materializeJobs.set(pageId, job)
      // Mark complete only when the walk finishes — partial chunks must stay resumable.
    }

    if (recordingJob) throw new Error('Page materialization is not reentrant')
    recordingJob = job
    try {
      for (;;) {
        // Phase 1: the page subtree, phase 2: each referenced component tree.
        if (!walkMaterializeStack(job.stack, deadline)) return false
        let advanced = false
        while (job.symbolIndex < job.symbols.length) {
          const symbolId = job.symbols[job.symbolIndex]
          job.symbolIndex++
          if (!symbolId || job.symbolSeen.has(symbolId)) continue
          job.symbolSeen.add(symbolId)
          ensureCreated(symbolId, false)
          for (const nested of collectSymbolRefs([symbolId])) {
            if (!job.symbolSeen.has(nested)) job.symbols.push(nested)
          }
          if (!fullyCreated.has(symbolId)) {
            job.stack.push({ ncId: symbolId, childIndex: 0 })
            advanced = true
            break
          }
        }
        if (!advanced) {
          materializeJobs.delete(pageId)
          if (postProcess) finishMaterializedPage(job)
          materializedPageIds.add(pageId)
          return true
        }
      }
    } finally {
      recordingJob = undefined
    }
  }

  function materializePageContent(pageId: string): void {
    // The importer runs its own document-wide passes afterwards, so page-level
    // post-processing is deferred to those shared passes.
    advancePageMaterialization(pageId, Number.POSITIVE_INFINITY, false)
  }

  function materializeAllPages(): void {
    for (const page of graph.getPages(true)) materializePageContent(page.id)
  }

  const docId = importPageShells(graph, changeMap, childrenMap, created, canvasIdToPageId)
  if (!docId) {
    const roots: string[] = []
    for (const [id] of changeMap) {
      const pid = parentMap.get(id)
      if (!pid || !changeMap.has(pid)) roots.push(id)
    }
    const page = graph.getPages()[0] ?? graph.addPage('Page 1')
    materializedPageIds.add(page.id)
    for (const rootId of roots) ensureCreated(rootId, true)
  } else if (options.populate === 'all') {
    materializeAllPages()
    for (const canvasId of childrenMap.get(docId) ?? []) {
      const canvasNc = changeMap.get(canvasId)
      if (canvasNc && canvasNc.type !== 'CANVAS') {
        ensureCreated(canvasId, true)
      }
    }
  } else {
    const firstPageId = graph.getPages().find((page) => !page.internalOnly)?.id
    if (firstPageId) materializePageContent(firstPageId)
  }

  importCollections(changeMap, graph)
  importVariableEntries(changeMap, parentMap, graph, assetRefs)
  importVariableBindings(changeMap, guidToNodeId, graph)
  remapComponentIds(graph, guidToNodeId)
  remapInstanceSwapPropertyValues(graph, guidToNodeId, undefined, componentPropDefsById)
  applyVariantPropSpecs(graph)

  const firstPageId = graph.getPages().find((page) => !page.internalOnly)?.id
  const activeRootIds =
    options.populate === 'first-page'
      ? [firstPageId].filter(isNotNil)
      : options.populate === 'none'
        ? []
        : undefined

  if (options.populate !== 'none') {
    graph.preserveSourceMetadataDuring(() => {
      populateAndApplyOverrides(
        graph,
        changeMap as Map<string, InstanceNodeChange>,
        guidToNodeId,
        blobs,
        activeRootIds
      )
    })
  }

  if (options.populate !== 'all') {
    rememberLazyFigImportContext(
      graph,
      changeMap,
      guidToNodeId,
      blobs,
      activeRootIds ?? [],
      parentMap,
      childrenMap,
      canvasIdToPageId,
      created,
      materializedPageIds,
      (pageId: string) => {
        graph.runSilentMutations(() => {
          // Post-processing stays scoped to the nodes this page added; the shared
          // component library and already-visited pages were handled when they
          // materialized.
          advancePageMaterialization(pageId, Number.POSITIVE_INFINITY, true)
        })
      },
      (pageId: string, budgetMs: number) => {
        let done = false
        graph.runSilentMutations(() => {
          done = advancePageMaterialization(pageId, budgetMs, true)
        })
        return done
      }
    )
  }

  setVariableColorResolver(null)

  if (graph.getPages(true).length === 0) {
    graph.addPage('Page 1')
  }

  return graph
}
