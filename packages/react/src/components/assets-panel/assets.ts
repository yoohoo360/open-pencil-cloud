import type { Editor } from '@open-pencil/core/editor'
import { renderNodesToImage } from '@open-pencil/core/io'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { createInstanceFromComponent } from '#react/graph/instances'
import { getLib, getRemoteImports } from '#react/graph/remote-lib'

import { findAssetPage } from './page'

export const COMPONENT_MIME = 'application/x-openpencil-component'
export const COMPONENT_LIB_MIME = 'application/x-openpencil-component-lib'
export const LOCAL_LIBRARY_KEY = 'default'

export type LocalAsset = {
  id: string
  name: string
  node: SceneNode
  componentId: string | null
  variants: Array<{ name: string; values: string[] }>
  variantCount: number
  hasConflicts: boolean
  sourceLibraryKey: string | null
  description: string
  docsURL: string | null
  pageId: string
  pageName: string
}

export type AssetGroup = {
  pageId: string
  pageName: string
  assets: LocalAsset[]
}

export type AssetLibraryItem = {
  key: string
  name: string
  remote: boolean
}

function variantInfoFromGraph(graph: SceneGraph, componentSetId: string) {
  const set = graph.getNode(componentSetId)
  if (set?.type !== 'COMPONENT_SET') return []
  const byName = new Map<string, Set<string>>()
  for (const definition of set.componentPropertyDefinitions) {
    if (definition.type !== 'VARIANT') continue
    byName.set(definition.name, new Set(definition.variantOptions ?? []))
  }
  for (const childId of set.childIds) {
    const child = graph.getNode(childId)
    if (child?.type !== 'COMPONENT') continue
    for (const [name, value] of Object.entries(child.componentPropertyValues)) {
      if (!value) continue
      const values = byName.get(name) ?? new Set<string>()
      values.add(value)
      byName.set(name, values)
    }
  }
  return [...byName].map(([name, values]) => ({
    name,
    values: [...values].sort((a, b) => a.localeCompare(b))
  }))
}

function defaultVariantFromGraph(graph: SceneGraph, node: SceneNode): SceneNode | undefined {
  if (node.type !== 'COMPONENT_SET') return node
  return node.childIds
    .map((id) => graph.getNode(id))
    .filter((child): child is SceneNode => child?.type === 'COMPONENT')
    .sort((a, b) => a.y - b.y || a.x - b.x || a.name.localeCompare(b.name))[0]
}

function hasVariantConflicts(graph: SceneGraph, componentSetId: string): boolean {
  const set = graph.getNode(componentSetId)
  if (set?.type !== 'COMPONENT_SET') return false
  const definitions = set.componentPropertyDefinitions.filter(
    (definition) => definition.type === 'VARIANT'
  )
  const counts = new Map<string, number>()
  for (const childId of set.childIds) {
    const child = graph.getNode(childId)
    if (child?.type !== 'COMPONENT') continue
    const key = definitions
      .map((definition) => `${definition.name}=${child.componentPropertyValues[definition.name] ?? ''}`)
      .join('\0')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.values()].some((count) => count > 1)
}

export function listAssetLibraries(graph: SceneGraph, localName: string): AssetLibraryItem[] {
  return [
    { key: LOCAL_LIBRARY_KEY, name: localName, remote: false },
    ...[...getRemoteImports(graph).values()].map((lib) => ({
      key: lib.key,
      name: lib.name,
      remote: true
    }))
  ]
}

export function listAssets(
  editor: Editor,
  graph: SceneGraph,
  fallbackPageName: string
): LocalAsset[] {
  return [...graph.nodes.values()]
    .filter((node) => node.type === 'COMPONENT' || node.type === 'COMPONENT_SET')
    .filter((node) => {
      if (node.type === 'COMPONENT_SET') return true
      const parent = node.parentId ? graph.getNode(node.parentId) : null
      return parent?.type !== 'COMPONENT_SET'
    })
    .map((node) => {
      const defaultVariant = defaultVariantFromGraph(graph, node)
      const variants = node.type === 'COMPONENT_SET' ? variantInfoFromGraph(graph, node.id) : []
      const page = findAssetPage(node, graph)
      return {
        id: node.id,
        name: node.name,
        node,
        componentId: defaultVariant?.id ?? null,
        variants,
        variantCount: node.type === 'COMPONENT_SET' ? node.childIds.length : 0,
        hasConflicts: node.type === 'COMPONENT_SET' ? hasVariantConflicts(graph, node.id) : false,
        sourceLibraryKey: node.sourceLibraryKey,
        description: node.symbolDescription,
        docsURL: node.symbolLinks[0]?.uri ?? null,
        pageId: page?.id ?? editor.state.currentPageId,
        pageName: page?.name ?? fallbackPageName
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listLocalAssets(editor: Editor, fallbackPageName: string): LocalAsset[] {
  return listAssets(editor, editor.graph, fallbackPageName)
}

export function filterAssets(assets: LocalAsset[], query: string): LocalAsset[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return assets
  return assets.filter((asset) => asset.name.toLowerCase().includes(normalized))
}

export function groupAssets(assets: LocalAsset[]): AssetGroup[] {
  const groups = new Map<string, AssetGroup>()
  for (const asset of assets) {
    const group = groups.get(asset.pageId) ?? {
      pageId: asset.pageId,
      pageName: asset.pageName,
      assets: []
    }
    group.assets.push(asset)
    groups.set(asset.pageId, group)
  }
  return [...groups.values()].sort((a, b) => a.pageName.localeCompare(b.pageName))
}

export function viewportCanvasCenter(): Vector {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-test-id="canvas-element"]')
  if (canvas) {
    const rect = canvas.getBoundingClientRect()
    return { x: rect.width / 2, y: rect.height / 2 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

export function assetInsertionPoint(
  component: Pick<SceneNode, 'width' | 'height'>,
  canvasWorld: Vector,
  parentOffset: Vector
): Vector {
  return {
    x: canvasWorld.x - parentOffset.x - component.width / 2,
    y: canvasWorld.y - parentOffset.y - component.height / 2
  }
}

export function resolveAssetGraph(editor: Editor, sourceLibraryKey?: string): SceneGraph {
  if (!sourceLibraryKey) return editor.graph
  return getLib(editor.graph, sourceLibraryKey)?.graph ?? editor.graph
}

export function insertAssetInstance(
  editor: Editor,
  asset: LocalAsset,
  sourceLibraryKey?: string
): boolean {
  if (!asset.componentId) return false
  const graph = resolveAssetGraph(editor, sourceLibraryKey)
  const component = graph.getNode(asset.componentId)
  if (!component) return false
  const parentId = editor.state.enteredContainerId ?? editor.state.currentPageId
  const center = viewportCanvasCenter()
  const canvasWorld = editor.screenToCanvas(center.x, center.y)
  const parentOffset =
    parentId === editor.state.currentPageId
      ? { x: 0, y: 0 }
      : editor.graph.getAbsolutePosition(parentId)
  const point = assetInsertionPoint(component, canvasWorld, parentOffset)
  createInstanceFromComponent(
    editor,
    asset.componentId,
    point.x,
    point.y,
    parentId,
    sourceLibraryKey
  )
  editor.requestRender()
  return true
}

export async function renderAssetPreview(
  editor: Editor,
  nodeId: string,
  scale: number,
  pageId?: string,
  graph: SceneGraph = editor.graph
): Promise<Blob | null> {
  const renderer = editor.renderer
  if (!renderer) return null
  const data = await Promise.resolve(
    renderNodesToImage(renderer.ck, renderer, graph, pageId ?? editor.state.currentPageId, [nodeId], {
      scale,
      format: 'PNG'
    })
  )
  return data ? new Blob([data], { type: 'image/png' }) : null
}

export function openExternalLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
