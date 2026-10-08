import { listHostedComponents } from '#react/hosted-components/registry'
import type { HostedComponentDef, HostedMatch } from '#react/hosted-components/types'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

function pluginIdOf(def: HostedComponentDef): string {
  return def.pluginId ?? 'open-pencil'
}

function markKeyOf(def: HostedComponentDef): string {
  return def.markKey ?? 'hosted'
}

export function hasHostedMark(node: SceneNode | undefined, def: HostedComponentDef): boolean {
  if (!node) return false
  const pluginId = pluginIdOf(def)
  const markKey = markKeyOf(def)
  return node.pluginData.some((entry) => entry.pluginId === pluginId && entry.key === markKey)
}

export function defaultMatchComponent(
  node: SceneNode,
  graph: SceneGraph,
  def: HostedComponentDef
): boolean {
  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') return false
  if (hasHostedMark(node, def)) return true
  if (node.sourceLibraryKey === def.libraryKey) return true
  let current: SceneNode | undefined = node
  while (current) {
    if (current.id === def.libraryKey || current.name === def.libraryKey) return true
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return false
}

export function defaultMatchInstance(
  node: SceneNode,
  graph: SceneGraph,
  def: HostedComponentDef
): boolean {
  if (node.type !== 'INSTANCE') return false
  if (node.sourceLibraryKey === def.libraryKey) return true
  const component = node.componentId ? graph.getNode(node.componentId) : undefined
  if (!component) return false
  return def.matchComponent
    ? def.matchComponent(component, graph)
    : defaultMatchComponent(component, graph, def)
}

export function matchHostedComponent(
  node: SceneNode | undefined,
  graph: SceneGraph
): HostedComponentDef | null {
  if (!node) return null
  for (const def of listHostedComponents()) {
    if (node.type === 'INSTANCE') {
      const ok = def.matchInstance
        ? def.matchInstance(node, graph)
        : defaultMatchInstance(node, graph, def)
      if (ok) return def
      continue
    }
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      const ok = def.matchComponent
        ? def.matchComponent(node, graph)
        : defaultMatchComponent(node, graph, def)
      if (ok) return def
    }
  }
  return null
}

export function enclosingHostedInstance(
  graph: SceneGraph,
  nodeId: string
): HostedMatch | null {
  let current = graph.getNode(nodeId)
  while (current) {
    const def = matchHostedComponent(current, graph)
    if (def && current.type === 'INSTANCE') return { def, host: current }
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

export function isHostedDescendant(graph: SceneGraph, node: SceneNode | undefined): boolean {
  if (!node) return false
  const match = enclosingHostedInstance(graph, node.id)
  return Boolean(match && match.host.id !== node.id)
}

export function isHostedTextLayer(graph: SceneGraph, node: SceneNode | undefined): boolean {
  return node?.type === 'TEXT' && isHostedDescendant(graph, node)
}

export function resolveHostedSelection(graph: SceneGraph, hit: SceneNode): SceneNode {
  const match = enclosingHostedInstance(graph, hit.id)
  if (!match) return hit
  const resolve = match.def.canvas?.resolveSelection
  if (resolve) return resolve(graph, hit)
  return match.host
}

export function hostedAllowsTextEdit(graph: SceneGraph, node: SceneNode): boolean {
  const match = enclosingHostedInstance(graph, node.id)
  if (!match) return true
  const allow = match.def.canvas?.allowTextEdit
  if (allow) return allow(graph, node)
  return false
}

export function hostedShowsLayerChildren(graph: SceneGraph, node: SceneNode): boolean {
  const def = matchHostedComponent(node, graph)
  if (!def || node.type !== 'INSTANCE') return true
  return def.canvas?.showLayerChildren ?? false
}

export function hostedAllowsEnterContainer(graph: SceneGraph, node: SceneNode): boolean {
  const def = matchHostedComponent(node, graph)
  if (!def || node.type !== 'INSTANCE') return true
  return def.canvas?.allowEnterContainer ?? false
}

export function hostedPanelChrome(graph: SceneGraph, nodeId: string) {
  const match = enclosingHostedInstance(graph, nodeId)
  return match?.def.panelChrome ?? {}
}
