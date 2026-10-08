import type { Editor } from '@open-pencil/core/editor'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import type { ComponentType } from 'react'

/** Narrow canvas API for hosted component panels and event handlers. */
export type HostedComponentContext = {
  editor: Editor
  graph: SceneGraph
  getNode: (id: string) => SceneNode | undefined
  updateNode: (id: string, patch: Partial<SceneNode>) => void
  createNode: (
    type: SceneNode['type'],
    parentId: string,
    props?: Partial<SceneNode>
  ) => SceneNode
  deleteNode: (id: string) => void
  reorderChild: (childId: string, parentId: string, index: number) => void
  getPluginData: (nodeId: string, key: string) => string
  setPluginData: (nodeId: string, key: string, value: string) => void
  requestRender: () => void
  select: (ids: string[]) => void
  getSelectedIds: () => string[]
}

export type HostedPanelSection = {
  id: string
  /** Rendered inside Design panel when a matching host is selected. */
  render: ComponentType
}

/** Standard Design-panel sections that hosted chrome can allowlist. */
export type HostedDesignSectionId =
  | 'position'
  | 'constraints'
  | 'layout'
  | 'appearance'
  | 'mask'
  | 'typography'
  | 'fill'
  | 'stroke'
  | 'selectionColors'
  | 'layoutGrid'
  | 'effects'
  | 'export'

export type HostedPanelChrome = {
  /** Skip Figma-style component property bindings for the host instance. */
  hideComponentProperties?: boolean
  /**
   * When set, only these standard design sections are shown for the host
   * (descendants still hide all standard sections).
   * Omit to show the full default set (unless `hideStandardDesignSections`).
   */
  designSections?: HostedDesignSectionId[]
  /** Hide every standard design section on the host (plugin panel sections still render). */
  hideStandardDesignSections?: boolean
  /** Do not show plain TEXT content field for generated text layers. */
  hidePlainTypographyContent?: boolean
  /** Hide go-to-main / detach / instance-swap chrome for the host. */
  hideInstanceActions?: boolean
}

export type HostedCanvasHooks = {
  /**
   * When a descendant is hit, return the node that should become the selection.
   * Default: the hosted instance host.
   */
  resolveSelection?: (graph: SceneGraph, hit: SceneNode) => SceneNode
  /** Whether Skia text editing is allowed on this node. Default: false for hosted descendants. */
  allowTextEdit?: (graph: SceneGraph, node: SceneNode) => boolean
  /** Whether the layer tree expands children of the host. Default: false. */
  showLayerChildren?: boolean
  /** Whether double-click may enter the instance container. Default: false. */
  allowEnterContainer?: boolean
}

export type HostedComponentDef = {
  /** Stable plugin id, e.g. `open-pencil.markdown`. */
  id: string
  /** Component / catalog entry display name. */
  displayName: string
  /** Remote library key used when inserting instances. */
  libraryKey: string
  /** Remote library display name in Assets (defaults to `displayName`). */
  libraryName?: string
  /** `pluginData` namespace (Figma-compatible). Default `open-pencil`. */
  pluginId?: string
  /** Catalog COMPONENT mark key under `pluginId`. Default `hosted`. */
  markKey?: string
  createCatalog: () => SceneGraph
  /** Copy images (or other assets) from the library graph into the document. */
  copyLibraryAssets?: (graph: SceneGraph) => void
  /** Optional migration / fixups when the library already exists. */
  onLibraryPresent?: (graph: SceneGraph, libraryGraph: SceneGraph) => void
  panel: {
    sections: HostedPanelSection[]
  }
  panelChrome?: HostedPanelChrome
  canvas?: HostedCanvasHooks
  /** Project plugin-owned data onto canvas children for one host instance. */
  hydrate: (ctx: HostedComponentContext, hostId: string) => void
  /** Optional override; default matches `libraryKey` / catalog mark. */
  matchComponent?: (node: SceneNode, graph: SceneGraph) => boolean
  matchInstance?: (node: SceneNode, graph: SceneGraph) => boolean
}

export type HostedMatch = {
  def: HostedComponentDef
  host: SceneNode
}
