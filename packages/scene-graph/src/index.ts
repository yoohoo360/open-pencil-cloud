import { omit } from 'es-toolkit/object'
import type { Emitter } from 'nanoevents'
import { createNanoEvents } from 'nanoevents'

import { generatePropertyValues } from '#core/editor/components/variants.ts'

import { getAbsolutePosition } from './coordinate'
import { cloneNodeProps } from './copy'
import { bindNodeEvents } from './events'
import * as HitTest from './hit-test'
import * as Instances from './instances'
import { CONTAINER_TYPES, createDefaultNode } from './node-defaults'
import { updateNodePreview } from './preview'
import type { Color, Rect, Vector } from './primitives'
import { clearEditedSourceMetadata } from './source-metadata'
import { TEXT_PICTURE_KEYS } from './text-picture'
import type {
  DocumentColorSpace,
  NodeType,
  SceneGraphEventHandlers,
  SceneGraphEvents,
  SceneNode,
  SourceMetadata,
  Variable,
  VariableCollection,
  VariableType,
  VariableValue
} from './types'
import * as Variables from './variables'
import { normalizeVectorNetwork } from './vector-network'

export * from './images'
export * from './snap'
export * from './export-scale'
export * from './coordinate'
export * from './geometry'
export { default as TransformMatrix } from './matrix'
export type { Mat3 } from './matrix'
export { UndoManager, type UndoEntry, type UndoManagerOptions } from './undo'

export type { GUID, Color } from './primitives'
export * from './types'

export { cloneVectorNetwork, normalizeVectorNetwork, validateVectorNetwork } from './vector-network'

function removeStaleBindings(
  node: SceneNode,
  field: 'fills' | 'strokes',
  changes: Partial<SceneNode>
): void {
  const len = node[field].length
  const stale = Object.keys(node.boundVariables).filter((k) => {
    if (k === field) return true
    if (!k.startsWith(`${field}/`)) return false
    const i = Number.parseInt(k.split('/')[1] ?? '', 10)
    return Number.isNaN(i) || i < 0 || i >= len
  })
  if (stale.length > 0) {
    node.boundVariables = omit(node.boundVariables, stale)
    changes.boundVariables = { ...node.boundVariables }
  }
}
let nextLocalID = 1

export function generateId(): string {
  return `0:${nextLocalID++}`
}

export class SceneGraph {
  nodes = new Map<string, SceneNode>()
  images = new Map<string, Uint8Array>()
  variables = new Map<string, Variable>()
  variableCollections = new Map<string, VariableCollection>()
  activeMode = new Map<string, string>()
  rootId: string
  figKiwiVersion: number | null = null
  /** Deflated kiwi schema bytes from the original .fig file, preserved for roundtrip fidelity. */
  figSchemaDeflated: Uint8Array | null = null
  documentColorSpace: DocumentColorSpace = 'display-p3'
  readonly emitter: Emitter<SceneGraphEvents> = createNanoEvents()
  private absPosCache = new Map<string, Vector>()
  private previewMutationDepth = 0
  private sourceMetadataPreservationDepth = 0
  positionPreviewVersion = 0
  instanceIndex = new Map<string, Set<string>>()

  constructor() {
    const root = createDefaultNode(generateId, 'FRAME', {
      name: 'Document',
      width: 0,
      height: 0
    })
    this.rootId = root.id
    this.nodes.set(root.id, root)

    this.addPage('Page 1')
  }
  addPage(name: string): SceneNode {
    return this.createNode('CANVAS', this.rootId, { name, width: 0, height: 0 })
  }

  getPages(includeInternal = false): SceneNode[] {
    return this.getChildren(this.rootId).filter(
      (n) => n.type === 'CANVAS' && (includeInternal || !n.internalOnly)
    )
  }
  getAllNodes(): Iterable<SceneNode> {
    return this.nodes.values()
  }
  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id)
  }
  onNodeEvents(handlers: SceneGraphEventHandlers): () => void {
    return bindNodeEvents(this.emitter, handlers)
  }

  countDescendants(nodeId: string): number {
    const node = this.nodes.get(nodeId)
    if (!node) return 0
    let count = 0
    const stack = [...node.childIds]
    while (stack.length > 0) {
      const id = stack.pop()
      if (id === undefined) break
      count++
      const child = this.nodes.get(id)
      if (child) {
        for (const childId of child.childIds) {
          stack.push(childId)
        }
      }
    }
    return count
  }
  addVariable(variable: Variable): void {
    Variables.addVariable(this, variable)
  }
  removeVariable(id: string): void {
    Variables.removeVariable(this, id)
  }
  addCollection(collection: VariableCollection): void {
    Variables.addCollection(this, collection)
  }
  createVariable(
    name: string,
    type: VariableType,
    collectionId: string,
    value?: VariableValue
  ): Variable {
    return Variables.createVariable(this, generateId, name, type, collectionId, value)
  }

  createCollection(name: string): VariableCollection {
    return Variables.createCollection(this, generateId, name)
  }

  removeCollection(id: string): void {
    Variables.removeCollection(this, id)
  }

  getActiveModeId(collectionId: string): string {
    return Variables.getActiveModeId(this, collectionId)
  }

  setActiveMode(collectionId: string, modeId: string): void {
    Variables.setActiveMode(this, collectionId, modeId)
  }

  addMode(collectionId: string, modeId: string, name: string, sourceMode?: string): void {
    Variables.addMode(this, collectionId, modeId, name, sourceMode)
  }

  removeMode(collectionId: string, modeId: string): void {
    Variables.removeMode(this, collectionId, modeId)
  }

  renameMode(collectionId: string, modeId: string, name: string): void {
    Variables.renameMode(this, collectionId, modeId, name)
  }

  setDefaultMode(collectionId: string, modeId: string): void {
    Variables.setDefaultMode(this, collectionId, modeId)
  }

  resolveVariable(
    variableId: string,
    modeId?: string,
    visited?: Set<string>
  ): VariableValue | undefined {
    return Variables.resolveVariable(this, variableId, modeId, visited)
  }

  resolveColorVariable(variableId: string): Color | undefined {
    return Variables.resolveColorVariable(this, variableId)
  }

  resolveNumberVariable(variableId: string): number | undefined {
    return Variables.resolveNumberVariable(this, variableId)
  }

  getVariablesForCollection(collectionId: string): Variable[] {
    return Variables.getVariablesForCollection(this, collectionId)
  }

  getVariablesByType(type: VariableType): Variable[] {
    return Variables.getVariablesByType(this, type)
  }

  bindVariable(nodeId: string, field: string, variableId: string): void {
    Variables.bindVariable(this, nodeId, field, variableId)
  }

  unbindVariable(nodeId: string, field: string): void {
    Variables.unbindVariable(this, nodeId, field)
  }

  getChildren(id: string): SceneNode[] {
    const node = this.nodes.get(id)
    if (!node) return []
    return node.childIds
      .map((cid) => this.nodes.get(cid))
      .filter((n): n is SceneNode => n !== undefined)
  }

  isContainer(id: string): boolean {
    const node = this.nodes.get(id)
    return node ? CONTAINER_TYPES.has(node.type) : false
  }

  isDescendant(childId: string, ancestorId: string): boolean {
    let current = this.nodes.get(childId)
    while (current) {
      if (current.id === ancestorId) return true
      current = current.parentId ? this.nodes.get(current.parentId) : undefined
    }
    return false
  }

  clearAbsPosCache(): void {
    this.absPosCache.clear()
  }

  getAbsolutePosition(id: string): Vector {
    const cached = this.absPosCache.get(id)
    if (cached) return cached

    const node = this.getNode(id)
    if (!node) return { x: 0, y: 0 }

    const result = getAbsolutePosition(node, this)
    this.absPosCache.set(id, result)
    return result
  }

  getAbsoluteBounds(id: string): Rect {
    const pos = this.getAbsolutePosition(id)
    const node = this.nodes.get(id)
    return {
      x: pos.x,
      y: pos.y,
      width: node?.width ?? 0,
      height: node?.height ?? 0
    }
  }
  private generateNodeId(): string {
    let id = generateId()
    while (this.nodes.has(id)) id = generateId()
    return id
  }
  private registerNode(node: SceneNode, parentId: string | null): SceneNode {
    node.parentId = parentId
    this.nodes.set(node.id, node)
    if (node.type === 'INSTANCE' && node.componentId) {
      let set = this.instanceIndex.get(node.componentId)
      if (!set) {
        set = new Set()
        this.instanceIndex.set(node.componentId, set)
      }
      set.add(node.id)
    }
    this.emitter.emit('node:created', node)
    return node
  }
  createNode(type: NodeType, parentId: string, overrides: Partial<SceneNode> = {}): SceneNode {
    const node = createDefaultNode(() => this.generateNodeId(), type, overrides)
    this.nodes.get(parentId)?.childIds.push(node.id)
    return this.registerNode(node, parentId)
  }
  createNodeWithId(
    id: string,
    type: NodeType,
    parentId: string | null,
    overrides: Partial<SceneNode> = {}
  ): SceneNode {
    const node = createDefaultNode(() => id, type, overrides)
    node.id = id
    const parent = parentId ? this.nodes.get(parentId) : undefined
    if (parent && !parent.childIds.includes(id)) parent.childIds.push(id)
    return this.registerNode(node, parentId)
  }

  static TEXT_PICTURE_KEYS: ReadonlySet<string> = TEXT_PICTURE_KEYS

  static LAYOUT_AFFECTING_KEYS: ReadonlySet<string> = new Set([
    'x',
    'y',
    'width',
    'height',
    'rotation',
    'flipX',
    'flipY',
    'layoutMode',
    'layoutDirection',
    'itemSpacing',
    'counterAxisSpacing',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'paddingBottom',
    'primaryAxisAlign',
    'counterAxisAlign',
    'counterAxisAlignContent',
    'layoutWrap',
    'primaryAxisSizing',
    'counterAxisSizing',
    'layoutPositioning',
    'layoutGrow',
    'layoutAlignSelf',
    'strokesIncludedInLayout',
    'horizontalConstraint',
    'verticalConstraint',
    'gridTemplateColumns',
    'gridTemplateRows',
    'gridColumnGap',
    'gridRowGap',
    'gridPosition',
    'minWidth',
    'maxWidth',
    'minHeight',
    'maxHeight'
  ])

  runPreviewUpdates(fn: () => void): void {
    this.previewMutationDepth++
    try {
      fn()
    } finally {
      this.previewMutationDepth--
    }
  }
  preserveSourceMetadataDuring(fn: () => void): void {
    this.sourceMetadataPreservationDepth++
    try {
      fn()
    } finally {
      this.sourceMetadataPreservationDepth--
    }
  }
  updateNodePositionPreview(id: string, x: number, y: number): void {
    this.updateNodePreview(id, { x, y })
  }
  updateNodePreview(id: string, changes: Partial<SceneNode>): void {
    const appliedChanges = updateNodePreview(this, id, changes)
    if (appliedChanges) this.emitter.emit('node:previewUpdated', id, appliedChanges)
  }

  private updateNodeComponent(id: string, node: SceneNode, changes: Partial<SceneNode>) {
    // Only clear absPosCache when layout-affecting properties change.
    // Fills, strokes, effects, plugin data changes do NOT affect absolute position.
    const affectsLayout = Object.keys(changes).some((k) => SceneGraph.LAYOUT_AFFECTING_KEYS.has(k))
    if (affectsLayout) this.absPosCache.clear()
    if (
      node.type === 'INSTANCE' &&
      'componentId' in changes &&
      changes.componentId !== node.componentId
    ) {
      if (node.componentId) this.instanceIndex.get(node.componentId)?.delete(id)
      if (changes.componentId) {
        let set = this.instanceIndex.get(changes.componentId)
        if (!set) {
          set = new Set()
          this.instanceIndex.set(changes.componentId, set)
        }
        set.add(id)
      }
    }

    if (node.type === 'COMPONENT' && 'name' in changes && changes.name !== node.name) {
      const parent = node.parentId ? this.nodes.get(node.parentId) : undefined
      node.componentPropertyValues = generatePropertyValues(
        changes?.name || '',
        parent && parent.type === 'COMPONENT_SET' ? parent.componentPropertyDefinitions : []
      )
    }
  }
  updateNode(id: string, changes: Partial<SceneNode>): void {
    if (this.previewMutationDepth > 0) {
      this.updateNodePreview(id, changes)
      return
    }

    const node = this.nodes.get(id)
    if (!node) return

    this.updateNodeComponent(id, node, changes)

    if (node.type === 'TEXT') {
      const textChanged = Object.keys(changes).some((k) => TEXT_PICTURE_KEYS.has(k))
      if (node.textPicture && textChanged) node.textPicture = null
      if (node.figmaDerivedTextGlyphs && textChanged) node.figmaDerivedTextGlyphs = null
    }
    const entries = Object.entries(changes) as Array<[string, unknown]>
    changes = Object.fromEntries(
      entries.filter(([, value]) => value !== undefined)
    ) as Partial<SceneNode>
    if (this.sourceMetadataPreservationDepth === 0) {
      clearEditedSourceMetadata(node, Object.keys(changes))
    }
    if (changes.vectorNetwork) {
      changes = { ...changes, vectorNetwork: normalizeVectorNetwork(changes.vectorNetwork) }
    }
    Object.assign(node, changes)
    if (changes.fills) removeStaleBindings(node, 'fills', changes)
    if (changes.strokes) removeStaleBindings(node, 'strokes', changes)
    this.emitter.emit('node:updated', id, changes)
  }

  reparentNode(nodeId: string, newParentId: string): void {
    const node = this.nodes.get(nodeId)
    if (!node || nodeId === this.rootId) return
    if (this.isDescendant(newParentId, nodeId)) return

    const oldParent = node.parentId ? this.nodes.get(node.parentId) : undefined
    const newParent = this.nodes.get(newParentId)
    if (!newParent) return
    if (node.parentId === newParentId) return

    const oldParentId = node.parentId
    this.absPosCache.clear()

    const absPos = this.getAbsolutePosition(nodeId)
    const newParentNode = this.nodes.get(newParentId)
    const newParentAbs =
      newParentId === this.rootId || newParentNode?.type === 'CANVAS'
        ? { x: 0, y: 0 }
        : this.getAbsolutePosition(newParentId)

    if (oldParent) {
      oldParent.childIds = oldParent.childIds.filter((cid) => cid !== nodeId)
    }

    node.parentId = newParentId
    newParent.childIds.push(nodeId)

    node.x = absPos.x - newParentAbs.x
    node.y = absPos.y - newParentAbs.y

    this.emitter.emit('node:reparented', nodeId, oldParentId, newParentId)
  }

  reorderChild(nodeId: string, parentId: string, insertIndex: number): void {
    const node = this.nodes.get(nodeId)
    if (!node) return

    const oldParent = node.parentId ? this.nodes.get(node.parentId) : undefined
    const newParent = this.nodes.get(parentId)
    if (!newParent) return

    // Remove from old parent
    if (oldParent) {
      oldParent.childIds = oldParent.childIds.filter((cid) => cid !== nodeId)
    }

    // If same parent, adjust index since we removed the item
    let idx = insertIndex
    if (
      oldParent === newParent &&
      idx > (!oldParent.childIds.includes(nodeId) ? idx : oldParent.childIds.length)
    ) {
      // Already removed above, no adjustment needed
    }

    node.parentId = parentId
    idx = Math.min(idx, newParent.childIds.length)
    newParent.childIds.splice(idx, 0, nodeId)

    this.emitter.emit('node:reordered', nodeId, parentId, idx)
  }

  insertChildAt(childId: string, parentId: string, index: number): void {
    const oldParent = this.getNode(this.getNode(childId)?.parentId ?? '')
    if (oldParent) {
      oldParent.childIds = oldParent.childIds.filter((id) => id !== childId)
    }
    const newParent = this.getNode(parentId)
    if (!newParent) return
    newParent.childIds = newParent.childIds.filter((id) => id !== childId)
    newParent.childIds.splice(index, 0, childId)
    const node = this.getNode(childId)
    if (node) node.parentId = parentId
    this.clearAbsPosCache()
    this.emitter.emit('node:reordered', childId, parentId, index)
  }

  deleteNode(id: string): void {
    const node = this.nodes.get(id)
    if (!node || id === this.rootId) return

    if (node.parentId) {
      const parent = this.nodes.get(node.parentId)
      if (parent) {
        parent.childIds = parent.childIds.filter((cid) => cid !== id)
      }
    }

    for (const childId of Array.from(node.childIds)) {
      this.deleteNode(childId)
    }

    if (node.type === 'INSTANCE' && node.componentId) {
      this.instanceIndex.get(node.componentId)?.delete(id)

      const component = this.nodes.get(node?.componentId)
      const componentSetId = component?.parentId ?? ''
      const componentSet = this.nodes.get(componentSetId)
      if (componentSet?.remote) {
        const [] = node.componentId.split(':')

        const sourceLibraryKey = component?.id.split(':')[0]
        if (component && componentSet && sourceLibraryKey) {
          this.removeRemoteComponent(sourceLibraryKey, component, componentSet)
        }
      }
    }
    this.nodes.delete(id)
    this.emitter.emit('node:deleted', id)
  }

  hitTest(px: number, py: number, scopeId?: string): SceneNode | null {
    return HitTest.hitTest(this, px, py, scopeId)
  }

  hitTestDeep(px: number, py: number, scopeId?: string): SceneNode | null {
    return HitTest.hitTestDeep(this, px, py, scopeId)
  }

  hitTestFrame(
    px: number,
    py: number,
    excludeIds: Set<string>,
    scopeId?: string
  ): SceneNode | null {
    return HitTest.hitTestFrame(this, px, py, excludeIds, scopeId)
  }

  cloneTree(
    sourceId: string,
    parentId: string,
    overrides: Partial<SceneNode> = {}
  ): SceneNode | null {
    const src = this.nodes.get(sourceId)
    if (!src) return null

    const props = cloneNodeProps(src, null)
    // Null out Figma source identifiers so the clone is treated as local.
    // `as SourceMetadata` required: cloneNodeProps returns Partial<SceneNode>,
    // so props.source is SourceMetadata | undefined, but we know it's always set.
    props.source = { ...(props.source as SourceMetadata), id: null, orderKey: null }
    const clone = this.createNode(src.type, parentId, { ...props, ...overrides })

    for (const childId of src.childIds) {
      this.cloneTree(childId, clone.id)
    }

    return clone
  }

  createInstance(
    componentId: string,
    parentId: string,
    overrides: Partial<SceneNode> = {},
    sourceLibraryKey?: string | null
  ): SceneNode | null {
    return Instances.createInstance(this, componentId, parentId, overrides, sourceLibraryKey)
  }

  populateInstanceChildren(instanceId: string, componentId: string): void {
    Instances.populateInstanceChildren(this, instanceId, componentId)
  }

  swapInstanceComponent(instanceId: string, componentId: string): void {
    Instances.swapInstanceComponent(this, instanceId, componentId)
  }

  syncInstances(componentId: string): void {
    Instances.syncInstances(this, componentId)
  }

  detachInstance(instanceId: string): void {
    Instances.detachInstance(this, instanceId)
  }

  getMainComponent(instanceId: string): SceneNode | undefined {
    return Instances.getMainComponent(this, instanceId)
  }

  getInstances(componentId: string): SceneNode[] {
    return Instances.getInstances(this, componentId)
  }

  flattenTree(parentId?: string, depth = 0): Array<{ node: SceneNode; depth: number }> {
    const id = parentId ?? this.rootId
    const parent = this.nodes.get(id)
    if (!parent) return []
    const result: Array<{ node: SceneNode; depth: number }> = []
    for (const childId of parent.childIds) {
      const child = this.nodes.get(childId)
      if (!child) continue
      result.push({ node: child, depth })
      if (child.childIds.length > 0) result.push(...this.flattenTree(childId, depth + 1))
    }
    return result
  }
  imports = new Map<
    string,
    {
      key: string
      source: string
      componentSets: Map<string, string>
    }
  >()

  addLib(source: string, json: SceneGraph): void {
    const importId = source[0]?.toUpperCase()

    const getNewId = (id: string) => {
      const li = id.split(':')
      if (li?.length >= 2) {
        li[0] = importId
      } else {
        li.unshift(importId)
      }

      return li.join(':')
    }
    const formatGraph = (node: SceneNode) => {
      node.id = getNewId(node.id)
      if (node.parentId) {
        node.parentId = getNewId(node.parentId)
      }
      if (node.componentId) {
        node.componentId = getNewId(node.componentId)
      }
      if (node?.childIds?.length > 0) {
        node.childIds = node.childIds.map((childId) => getNewId(childId))
      }
      return node
    }
    const oldNodeMap = json.nodes
    const newMap = new Map()
    for (let [_key, node] of oldNodeMap) {
      const newNode = formatGraph(node)
      newMap.set(newNode.id, newNode)
    }
    json.nodes = newMap

    remoteSceneGraphMap.set(importId, { key: importId, source: source, graph: json })
  }
  getLib(sourceLibraryKey: string): { key: string; source: string; graph: SceneGraph } | undefined {
    return remoteSceneGraphMap.get(sourceLibraryKey)
  }
  removeRemoteComponent(
    sourceLibraryKey: string,
    component: SceneNode,
    componentSet: SceneNode
  ): void {
    if (componentSet.childIds?.includes(component.id)) {
      componentSet.childIds = componentSet.childIds.filter((id) => id !== component.id)
      this.nodes.set(componentSet.id, componentSet)
    }

    const removeNodeTree = (nodeId: string) => {
      const node = this.nodes.get(nodeId)
      if (node?.childIds?.length) {
        node.childIds.forEach((childId) => removeNodeTree(childId))
      }
      this.nodes.delete(nodeId)
    }
    removeNodeTree(component.id)

    const cIds = componentSet.childIds.filter((id) => {
      const childNode = this.nodes.get(id)
      return childNode?.type === 'COMPONENT'
    })
    if (!cIds?.length) {
      this.nodes.delete(componentSet.id)

      const libPage = this.nodes.get(sourceLibraryKey)
      if (libPage?.childIds?.includes(componentSet.id)) {
        libPage.childIds = libPage.childIds.filter((id) => id !== componentSet.id)
        this.nodes.set(libPage.id, libPage)
      }

      if (!libPage?.childIds?.length) {
        this.nodes.delete(libPage?.id)
        this.imports.delete(sourceLibraryKey)
      }
    }
  }
  addRemoteComponent(
    sourceLibraryKey: string,
    component: SceneNode,
    componentSet: SceneNode
  ): boolean {
    const remoteGraph = this.imports.get(sourceLibraryKey ?? '')
    const libraryKey = sourceLibraryKey[0].toUpperCase()
    if (!remoteGraph) {
      this.imports.set(sourceLibraryKey ?? '', {
        key: libraryKey ?? '',
        source: sourceLibraryKey ?? '',
        componentSets: new Map([[componentSet.id, componentSet.name]])
      })
    }
    let libPage = this.nodes.get(sourceLibraryKey)
    if (!libPage) {
      libPage = this.createNode('CANVAS', this.rootId, {
        name: sourceLibraryKey ?? '',
        id: libraryKey ?? '',
        width: 0,
        remote: true,
        height: 0
      })
      this.nodes.set(libraryKey, libPage)
      libPage = this.nodes.get(libraryKey) as SceneNode
    }

    const findGraph = this.getLib(sourceLibraryKey)?.graph
    const addComponentNode = (node: SceneNode, libraryKey: string, parentId: string) => {
      if (!this.nodes.get(node.id)) {
        const clonedNode = this.createNode(node.type, parentId, {
          ...cloneNodeProps(node, null),
          id: node.id,
          remote: true,
          parentId
        })
        clonedNode.parentId = parentId
        this.nodes.set(node.id, clonedNode)
      }
      if (node?.childIds?.length > 0) {
        node?.childIds.forEach((childId) => {
          const childNode = findGraph?.getNode(childId)
          if (childNode) {
            addComponentNode(childNode, libraryKey, node.id)
          }
        })
      }
      return node
    }
    let libComponentSet = this.nodes.get(componentSet.id)
    if (!libComponentSet) {
      libComponentSet = this.createNode('COMPONENT_SET', libPage.id, {
        ...cloneNodeProps(componentSet, null),
        id: componentSet.id,
        remote: true,
        parentId: libPage.id
      })
      libComponentSet.childIds = []

      this.nodes.set(libComponentSet.id, libComponentSet)

      if (!libPage?.childIds?.includes(libComponentSet.id)) {
        libPage.childIds.push(libComponentSet.id)
      }
      this.nodes.set(libComponentSet.id, libComponentSet)
    }

    const c = findGraph?.getNode(component.id)
    if (c && !this.getNode(component.id)) {
      addComponentNode(c, libraryKey, libComponentSet.id)
    }
    return true
  }
  getRemoteImports(): Map<string, { key: string; source: string; graph: SceneGraph }> {
    return remoteSceneGraphMap
  }
}

const remoteSceneGraphMap = new Map<
  string,
  {
    key: string
    source: string
    graph: SceneGraph
  }
>()
