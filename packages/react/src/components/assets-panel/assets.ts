import {
  applySlotInsertLayout,
  isSlotNode,
  resolveSelectedInsertionParent
} from '#react/controls/component-props/slot-insert'
import { BUILTIN_LIBRARY_KEY } from '#react/graph/builtin'
import { createInstanceFromComponent } from '#react/graph/instances'
import { getLib, getRemoteImports } from '#react/graph/remote-lib'
import { bootstrapHostedComponents, ensureHostedLibraries } from '#react/hosted-components'

import type { Editor } from '@open-pencil/core/editor'
import { renderNodesToImage } from '@open-pencil/core/io'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { EditorStore } from '#react/app/editor/store'
import type { EnabledLibraryAsset, LibraryService } from '#react/app/libraries/service'
import type { LibrarySummary } from '@open-pencil/core/library'

import { findAssetPage, isInternalOnlyPage } from './page'

export const COMPONENT_MIME = 'application/x-openpencil-component'
export const COMPONENT_LIB_MIME = 'application/x-openpencil-component-lib'
export const LOCAL_LIBRARY_KEY = 'default'
export const FIG_LIBRARY_KEY_PREFIX = 'fig:'

export function figLibraryKey(libraryId: string): string {
  return `${FIG_LIBRARY_KEY_PREFIX}${libraryId}`
}

export function parseFigLibraryKey(key: string): string | null {
  if (!key.startsWith(FIG_LIBRARY_KEY_PREFIX)) return null
  return key.slice(FIG_LIBRARY_KEY_PREFIX.length)
}

export type LocalAsset = {
  id: string
  name: string
  node: SceneNode
  componentId: string | null
  componentIds: string[]
  variants: Array<{ name: string; values: string[] }>
  variantCount: number
  hasConflicts: boolean
  sourceLibraryKey: string | null
  description: string
  docsURL: string | null
  libraryId: string | null
  revisionId: string | null
  assetKey: string | null
  libraryName: string | null
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
  /** Document-sourced library (enabledLibraries), not OSS remote-lib. */
  figLibraryId?: string
}

function variantInfoFromGraph(graph: SceneGraph, componentSetId: string) {
  const set = graph.getNode(componentSetId)
  if (set?.type !== 'COMPONENT_SET') return []
  const byName = new Map<string, Set<string>>()
  for (const definition of set.componentPropertyDefinitions) {
    if (definition.type !== 'VARIANT') continue
    byName.set(definition.name, new Set(definition.variantOptions ?? []))
  }
  for (const child of collectSetComponents(graph, set)) {
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

function collectSetComponents(graph: SceneGraph, set: SceneNode): SceneNode[] {
  const found: SceneNode[] = []
  const seen = new Set<string>()
  function walk(id: string) {
    if (seen.has(id)) return
    seen.add(id)
    const node = graph.getNode(id)
    if (!node) return
    if (node.type === 'COMPONENT') found.push(node)
    if (node.type === 'COMPONENT_SET' && node.id !== set.id) return
    for (const childId of node.childIds) walk(childId)
  }
  for (const childId of set.childIds) walk(childId)
  return found
}

export function owningComponentSet(graph: SceneGraph, node: SceneNode): SceneNode | undefined {
  if (node.type === 'COMPONENT_SET') return node
  let current = node.parentId ? graph.getNode(node.parentId) : undefined
  while (current) {
    if (current.type === 'COMPONENT_SET') return current
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  for (const candidate of graph.nodes.values()) {
    if (candidate.type !== 'COMPONENT_SET') continue
    if (collectSetComponents(graph, candidate).some((child) => child.id === node.id)) {
      return candidate
    }
  }
}

function defaultVariantFromGraph(graph: SceneGraph, node: SceneNode): SceneNode | undefined {
  if (node.type !== 'COMPONENT_SET') return node
  return collectSetComponents(graph, node).sort(
    (a, b) => a.y - b.y || a.x - b.x || a.name.localeCompare(b.name)
  )[0]
}

function hasVariantConflicts(graph: SceneGraph, componentSetId: string): boolean {
  const set = graph.getNode(componentSetId)
  if (set?.type !== 'COMPONENT_SET') return false
  const definitions = set.componentPropertyDefinitions.filter(
    (definition) => definition.type === 'VARIANT'
  )
  const counts = new Map<string, number>()
  for (const child of collectSetComponents(graph, set)) {
    const key = definitions
      .map(
        (definition) => `${definition.name}=${child.componentPropertyValues[definition.name] ?? ''}`
      )
      .join('\0')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.values()].some((count) => count > 1)
}

export function listFigAssetLibraries(
  summaries: LibrarySummary[],
  graph: SceneGraph
): AssetLibraryItem[] {
  const items: AssetLibraryItem[] = []
  for (const summary of summaries) {
    const binding = graph.enabledLibraries.get(summary.libraryId)
    if (!binding?.enabled) continue
    items.push({
      key: figLibraryKey(summary.libraryId),
      name: summary.name,
      remote: true,
      figLibraryId: summary.libraryId
    })
  }
  return items
}

export function listAssetLibraries(
  graph: SceneGraph,
  localName: string,
  builtinName = 'Built-in',
  figSummaries: LibrarySummary[] = []
): AssetLibraryItem[] {
  bootstrapHostedComponents()
  ensureHostedLibraries(graph)
  const builtin = getLib(graph, BUILTIN_LIBRARY_KEY)
  return [
    { key: LOCAL_LIBRARY_KEY, name: localName, remote: false },
    ...listFigAssetLibraries(figSummaries, graph),
    ...(builtin ? [{ key: BUILTIN_LIBRARY_KEY, name: builtinName, remote: true as const }] : []),
    ...[...getRemoteImports(graph).values()]
      .filter((lib) => lib.key !== BUILTIN_LIBRARY_KEY)
      .map((lib) => ({
        key: lib.key,
        name: lib.name,
        remote: true as const
      }))
  ]
}

function toLocalAsset(graph: SceneGraph, node: SceneNode): LocalAsset {
  const setComponents = node.type === 'COMPONENT_SET' ? collectSetComponents(graph, node) : [node]
  const defaultVariant = defaultVariantFromGraph(graph, node)
  const variants = node.type === 'COMPONENT_SET' ? variantInfoFromGraph(graph, node.id) : []
  const page = findAssetPage(node, graph)
  const hidePage = isInternalOnlyPage(page)
  return {
    id: node.id,
    name: node.name,
    node,
    componentId: defaultVariant?.id ?? null,
    componentIds: setComponents.map((component) => component.id),
    variants,
    variantCount: node.type === 'COMPONENT_SET' ? setComponents.length : 0,
    hasConflicts: node.type === 'COMPONENT_SET' ? hasVariantConflicts(graph, node.id) : false,
    sourceLibraryKey: node.sourceLibraryKey,
    description: node.symbolDescription,
    docsURL: node.symbolLinks[0]?.uri ?? null,
    libraryId: null,
    revisionId: null,
    assetKey: null,
    libraryName: null,
    pageId: hidePage ? '' : (page?.id ?? ''),
    pageName: hidePage ? '' : (page?.name ?? '')
  }
}

export function enabledLibraryAssetsToLocalAssets(
  entries: EnabledLibraryAsset[],
  libraryId: string | null,
  fallbackPageName: string
): LocalAsset[] {
  const filtered = libraryId ? entries.filter((entry) => entry.libraryId === libraryId) : entries
  return filtered
    .map(({ libraryId: id, libraryName, revisionId, asset }) => ({
      id: `${id}:${asset.key}`,
      name: asset.name,
      node: createDefaultNode(() => asset.sourceNodeId, asset.type, {
        name: asset.name,
        symbolDescription: asset.description,
        sourceLibraryKey: asset.key
      }),
      componentId: null,
      componentIds: [],
      variants: [],
      variantCount: 0,
      hasConflicts: false,
      sourceLibraryKey: asset.key,
      description: asset.description,
      docsURL: null,
      libraryId: id,
      revisionId,
      assetKey: asset.key,
      libraryName,
      pageId: `library:${id}`,
      pageName: libraryName || fallbackPageName
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listAssets(
  _editor: Editor,
  graph: SceneGraph,
  _fallbackPageName: string
): LocalAsset[] {
  const seen = new Set<string>()
  const assets: LocalAsset[] = []
  for (const node of graph.nodes.values()) {
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') continue
    if (node.librarySource?.readOnly) continue

    const listed = node.type === 'COMPONENT_SET' ? node : (owningComponentSet(graph, node) ?? node)
    if (seen.has(listed.id)) continue
    seen.add(listed.id)

    const asset = toLocalAsset(graph, listed)

    if (!asset?.pageId || !asset?.pageName) {
      continue
    }
    if (asset.node?.type === 'COMPONENT_SET') {
      assets.push(asset)
    }
    const parent = graph.getNode(asset.node.parentId ?? '')

    if (parent && asset.node?.type === 'COMPONENT' && parent?.type !== 'COMPONENT_SET') {
      assets.push(asset)
    }
  }
  return assets.sort((a, b) => a.name.localeCompare(b.name))
}

export function listLocalAssets(editor: Editor, fallbackPageName: string): LocalAsset[] {
  return listAssets(editor, editor.graph, fallbackPageName)
}

export function listLocalAndFigAssets(
  editor: Editor,
  enabledAssets: EnabledLibraryAsset[],
  figLibraryId: string | null,
  fallbackPageName: string
): LocalAsset[] {
  const local = figLibraryId ? [] : listLocalAssets(editor, fallbackPageName)
  const remote = enabledLibraryAssetsToLocalAssets(enabledAssets, figLibraryId, fallbackPageName)
  return [...local, ...remote].sort((a, b) => a.name.localeCompare(b.name))
}

export function assetMatchesComponentId(asset: LocalAsset, componentId: string): boolean {
  if (!componentId) return false
  return (
    asset.id === componentId ||
    asset.componentId === componentId ||
    asset.node.componentKey === componentId ||
    asset.componentIds.includes(componentId)
  )
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

export async function insertDocumentLibraryAsset(
  store: EditorStore,
  asset: LocalAsset,
  libraryService: LibraryService
): Promise<boolean> {
  let componentId = asset.componentId
  if (!componentId && asset.libraryId && asset.revisionId && asset.assetKey) {
    const materialized = await libraryService.materialize(
      store,
      asset.libraryId,
      asset.revisionId,
      asset.assetKey
    )
    componentId = materialized.componentId
  }
  if (!componentId) return false
  const component = store.graph.getNode(componentId)
  if (!component) return false
  const parentId = resolveSelectedInsertionParent(store)
  const parent = store.graph.getNode(parentId)
  const center = viewportCanvasCenter()
  const canvasWorld = store.screenToCanvas(center.x, center.y)
  const parentOffset =
    parentId === store.state.currentPageId
      ? { x: 0, y: 0 }
      : store.graph.getAbsolutePosition(parentId)
  const point =
    parent && isSlotNode(parent)
      ? { x: parent.paddingLeft, y: parent.paddingTop }
      : assetInsertionPoint(component, canvasWorld, parentOffset)
  const instanceId = store.createInstanceFromComponent(componentId, point.x, point.y, parentId)
  if (instanceId && parent && isSlotNode(parent)) applySlotInsertLayout(store, instanceId, parent)
  store.requestRender()
  return Boolean(instanceId)
}

export function insertAssetInstance(
  editor: Editor,
  asset: LocalAsset,
  sourceLibraryKey?: string
): boolean {
  if (asset.libraryId) return false
  if (!asset.componentId) return false
  const graph = resolveAssetGraph(editor, sourceLibraryKey)
  const component = graph.getNode(asset.componentId)
  if (!component) return false
  const parentId = resolveSelectedInsertionParent(editor)
  const parent = editor.graph.getNode(parentId)
  const center = viewportCanvasCenter()
  const canvasWorld = editor.screenToCanvas(center.x, center.y)
  const parentOffset =
    parentId === editor.state.currentPageId
      ? { x: 0, y: 0 }
      : editor.graph.getAbsolutePosition(parentId)
  const point =
    parent && isSlotNode(parent)
      ? { x: parent.paddingLeft, y: parent.paddingTop }
      : assetInsertionPoint(component, canvasWorld, parentOffset)
  const instanceId = createInstanceFromComponent(
    editor,
    asset.componentId,
    point.x,
    point.y,
    parentId,
    sourceLibraryKey
  )
  if (instanceId && parent && isSlotNode(parent)) applySlotInsertLayout(editor, instanceId, parent)
  editor.requestRender()
  return true
}

export async function renderAssetPreview(
  editor: Editor,
  nodeId: string,
  scale: number,
  _pageId?: string,
  graph: SceneGraph = editor.graph
): Promise<Blob | null> {
  const renderer = editor.renderer
  if (!renderer) return null
  const node = graph.getNode(nodeId)
  if (!node) return null
  const resolvedPageId = findAssetPage(node, graph)?.id
  if (!resolvedPageId) return null
  try {
    const data = await Promise.resolve(
      renderNodesToImage(renderer.ck, renderer, graph, resolvedPageId, [nodeId], {
        scale,
        format: 'PNG'
      })
    )
    return data ? new Blob([data], { type: 'image/png' }) : null
  } catch {
    return null
  }
}

export function openExternalLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
