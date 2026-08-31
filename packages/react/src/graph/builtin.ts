import { addLib, getLib } from '#react/graph/remote-lib'

import { SceneGraph, type Fill, type SceneNode } from '@open-pencil/scene-graph'

export const BUILTIN_LIBRARY_KEY = 'builtin'

const PLUGIN_ID = 'open-pencil'
const PLUGIN_KEY = 'builtin'

const BLACK = { r: 0.12, g: 0.12, b: 0.12, a: 1 }
const WHITE = { r: 1, g: 1, b: 1, a: 1 }

function solidFill(color: Fill['color']): Fill {
  return { type: 'SOLID', color, opacity: 1, visible: true, blendMode: 'NORMAL' }
}

function markBuiltin(node: SceneNode): void {
  node.pluginData = [
    ...node.pluginData.filter((entry) => entry.pluginId !== PLUGIN_ID || entry.key !== PLUGIN_KEY),
    { pluginId: PLUGIN_ID, key: PLUGIN_KEY, value: '1' }
  ]
}

function hasBuiltinMark(node: SceneNode | undefined): boolean {
  return Boolean(
    node?.pluginData.some((entry) => entry.pluginId === PLUGIN_ID && entry.key === PLUGIN_KEY)
  )
}

export function createBuiltinCatalog(): SceneGraph {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const rich = graph.createNode('COMPONENT', page.id, {
    name: 'RichText',
    x: 0,
    y: 0,
    width: 320,
    height: 88,
    layoutMode: 'VERTICAL',
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    fills: [solidFill(WHITE)]
  })
  markBuiltin(rich)
  graph.createNode('TEXT', rich.id, {
    name: 'RichText',
    text: 'Write here',
    x: 12,
    y: 12,
    width: 296,
    height: 64,
    fontSize: 14,
    textAutoResize: 'HEIGHT',
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    fills: [solidFill(BLACK)]
  })
  return graph
}

export function copyBuiltinImages(graph: SceneGraph): void {
  const lib = getLib(graph, BUILTIN_LIBRARY_KEY)
  if (!lib) return
  for (const [hash, data] of lib.graph.images) {
    if (!graph.images.has(hash)) graph.images.set(hash, data)
  }
}

export function isBuiltinComponent(node: SceneNode | undefined, graph: SceneGraph): boolean {
  if (!node || (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET')) return false
  if (hasBuiltinMark(node)) return true
  if (node.sourceLibraryKey === BUILTIN_LIBRARY_KEY) return true
  let current: SceneNode | undefined = node
  while (current) {
    if (current.id === BUILTIN_LIBRARY_KEY || current.name === BUILTIN_LIBRARY_KEY) return true
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return false
}

export function isBuiltinInstance(node: SceneNode | undefined, graph: SceneGraph): boolean {
  if (node?.type !== 'INSTANCE') return false
  if (node.sourceLibraryKey === BUILTIN_LIBRARY_KEY) return true
  const component = node.componentId ? graph.getNode(node.componentId) : undefined
  return isBuiltinComponent(component, graph)
}

function ensureWhiteFill(graph: SceneGraph): void {
  for (const node of graph.getAllNodes()) {
    if (node.type !== 'COMPONENT' && node.type !== 'INSTANCE') continue
    if (!isBuiltinComponent(node, graph) && !isBuiltinInstance(node, graph)) continue
    if (node.fills.length > 0) continue
    graph.updateNode(node.id, { fills: [solidFill(WHITE)] })
  }
}

export function ensureBuiltinLibrary(graph: SceneGraph): boolean {
  const existing = getLib(graph, BUILTIN_LIBRARY_KEY)
  if (existing) {
    ensureWhiteFill(existing.graph)
    ensureWhiteFill(graph)
    copyBuiltinImages(graph)
    return false
  }
  addLib(graph, BUILTIN_LIBRARY_KEY, 'Built-in', '', createBuiltinCatalog())
  copyBuiltinImages(graph)
  return true
}

export function enclosingBuiltinInstance(graph: SceneGraph, nodeId: string): SceneNode | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (isBuiltinInstance(current, graph)) return current
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

export function isBuiltinDescendant(graph: SceneGraph, node: SceneNode | undefined): boolean {
  if (!node) return false
  const host = enclosingBuiltinInstance(graph, node.id)
  return Boolean(host && host.id !== node.id)
}

export function isBuiltinTextLayer(graph: SceneGraph, node: SceneNode | undefined): boolean {
  return node?.type === 'TEXT' && isBuiltinDescendant(graph, node)
}

export function collectBuiltinTextLayers(graph: SceneGraph, rootId: string): SceneNode[] {
  const texts: SceneNode[] = []
  const seen = new Set<string>()
  function walk(id: string) {
    if (seen.has(id)) return
    seen.add(id)
    const node = graph.getNode(id)
    if (!node || node.internalOnly) return
    if (node.type === 'TEXT') texts.push(node)
    for (const child of graph.getChildren(id)) walk(child.id)
  }
  for (const child of graph.getChildren(rootId)) walk(child.id)
  return texts
}
