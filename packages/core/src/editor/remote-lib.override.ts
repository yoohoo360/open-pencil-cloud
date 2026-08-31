import { cloneNodeProps, type SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

export type RemoteLibrary = {
  key: string
  source: string
  name: string
  url: string
  graph: SceneGraph
}

type RemoteImportRecord = {
  key: string
  source: string
  componentSets: Map<string, string>
}

type RemoteLibState = {
  remoteLibs: Map<string, RemoteLibrary>
  imports: Map<string, RemoteImportRecord>
}

const remoteLibState = new WeakMap<SceneGraph, RemoteLibState>()

function stateOf(graph: SceneGraph): RemoteLibState {
  const existing = remoteLibState.get(graph)
  if (existing) return existing
  const created: RemoteLibState = {
    remoteLibs: new Map(),
    imports: new Map()
  }
  remoteLibState.set(graph, created)
  return created
}

function remapLibId(importId: string, id: string): string {
  const parts = id.split(':')
  if (parts.length >= 2) parts[0] = importId
  else parts.unshift(importId)
  return parts.join(':')
}

function remapLibNode(importId: string, node: SceneNode): SceneNode {
  node.id = remapLibId(importId, node.id)
  if (node.parentId) node.parentId = remapLibId(importId, node.parentId)
  if (node.componentId) node.componentId = remapLibId(importId, node.componentId)
  if (node.childIds.length > 0) {
    node.childIds = node.childIds.map((childId) => remapLibId(importId, childId))
  }
  return node
}

function markRemote(node: SceneNode): SceneNode {
  Object.assign(node, { remote: true })
  return node
}

export function addLib(
  graph: SceneGraph,
  source: string,
  name: string,
  url: string,
  imported: SceneGraph
): void {
  const remapped = new Map<string, SceneNode>()
  for (const node of imported.nodes.values()) {
    const next = remapLibNode(source, node)
    remapped.set(next.id, next)
  }
  imported.nodes.clear()
  for (const [id, node] of remapped) imported.nodes.set(id, node)
  imported.rootId = remapLibId(source, imported.rootId)
  stateOf(graph).remoteLibs.set(source, { key: source, source, name, url, graph: imported })
}

export function getLib(graph: SceneGraph, sourceLibraryKey: string): RemoteLibrary | undefined {
  return stateOf(graph).remoteLibs.get(sourceLibraryKey)
}

export function getRemoteImports(graph: SceneGraph): Map<string, RemoteLibrary> {
  return stateOf(graph).remoteLibs
}

function ensureLibPage(graph: SceneGraph, libraryKey: string): SceneNode {
  const existing = graph
    .getPages(true)
    .find((page) => page.name === libraryKey || page.id === libraryKey)
  if (existing) {
    if (!existing.internalOnly || existing.visible) {
      graph.updateNode(existing.id, { internalOnly: true, visible: false })
    }
    return graph.getNode(existing.id) ?? existing
  }
  return markRemote(
    graph.createNodeWithId(libraryKey, 'CANVAS', graph.rootId, {
      name: libraryKey,
      width: 0,
      height: 0,
      internalOnly: true,
      visible: false
    })
  )
}

function copyRemoteNodeTree(
  graph: SceneGraph,
  findGraph: SceneGraph | undefined,
  node: SceneNode,
  parentId: string
): void {
  if (!graph.nodes.get(node.id)) {
    markRemote(
      graph.createNodeWithId(node.id, node.type, parentId, {
        ...cloneNodeProps(node, null),
        parentId
      })
    )
  }
  for (const childId of node.childIds) {
    const child = findGraph?.getNode(childId)
    if (child) copyRemoteNodeTree(graph, findGraph, child, node.id)
  }
}

export function addRemoteComponent(
  graph: SceneGraph,
  sourceLibraryKey: string,
  component: SceneNode,
  componentSet?: SceneNode
): boolean {
  const state = stateOf(graph)
  const existing = state.imports.get(sourceLibraryKey)
  if (!existing) {
    state.imports.set(sourceLibraryKey, {
      key: sourceLibraryKey,
      source: sourceLibraryKey,
      componentSets: new Map(
        componentSet?.type === 'COMPONENT_SET' ? [[componentSet.id, componentSet.name]] : []
      )
    })
  } else if (componentSet?.type === 'COMPONENT_SET') {
    existing.componentSets.set(componentSet.id, componentSet.name)
  }

  const libPage = ensureLibPage(graph, sourceLibraryKey)
  const findGraph = state.remoteLibs.get(sourceLibraryKey)?.graph

  if (componentSet?.type !== 'COMPONENT_SET') {
    copyRemoteNodeTree(graph, findGraph, component, libPage.id)
    return true
  }

  let libComponentSet = graph.nodes.get(componentSet.id)
  if (!libComponentSet) {
    libComponentSet = markRemote(
      graph.createNodeWithId(componentSet.id, 'COMPONENT_SET', libPage.id, {
        ...cloneNodeProps(componentSet, null),
        parentId: libPage.id,
        childIds: []
      })
    )
  }

  for (const childId of componentSet.childIds) {
    const child = findGraph?.getNode(childId)
    if (child && !graph.getNode(childId)) {
      copyRemoteNodeTree(graph, findGraph, child, libComponentSet.id)
    }
  }
  libComponentSet.childIds = [...componentSet.childIds]
  return true
}

export function removeRemoteComponent(
  graph: SceneGraph,
  sourceLibraryKey: string,
  component: SceneNode,
  componentSet?: SceneNode
): void {
  if (componentSet?.childIds.includes(component.id)) {
    componentSet.childIds = componentSet.childIds.filter((id) => id !== component.id)
    graph.nodes.set(componentSet.id, componentSet)
  }

  const removeNodeTree = (nodeId: string) => {
    const node = graph.nodes.get(nodeId)
    if (!node) return
    for (const childId of node.childIds) removeNodeTree(childId)
    graph.nodes.delete(nodeId)
  }
  removeNodeTree(component.id)

  if (componentSet?.type !== 'COMPONENT_SET') return

  const remaining = componentSet.childIds.filter((id) => graph.nodes.get(id)?.type === 'COMPONENT')
  if (remaining.length > 0) return

  graph.nodes.delete(componentSet.id)
  const libPage = graph.nodes.get(sourceLibraryKey)
  if (libPage?.childIds.includes(componentSet.id)) {
    libPage.childIds = libPage.childIds.filter((id) => id !== componentSet.id)
    graph.nodes.set(libPage.id, libPage)
  }
  if (libPage && libPage.childIds.length === 0) {
    graph.nodes.delete(libPage.id)
    stateOf(graph).imports.delete(sourceLibraryKey)
  }
}
