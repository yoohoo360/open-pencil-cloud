import { ancestorPublishedInstance } from '#react/controls/component-props/model'
import { materializeComponent } from '#react/graph/instances'

import type { Editor } from '@open-pencil/core/editor'
import { computeAllLayouts } from '@open-pencil/core/layout'
import type { ComponentPropertyDefinition, SceneNode } from '@open-pencil/scene-graph'
import { CONTAINER_TYPES } from '@open-pencil/scene-graph/node-defaults'

export function isSlotNode(node: SceneNode | undefined): boolean {
  return (
    node?.type === 'FRAME' &&
    node.componentPropertyReferences.some((reference) => reference.field === 'SLOT')
  )
}

export function slotPropertyId(node: SceneNode): string | undefined {
  return node.componentPropertyReferences.find((reference) => reference.field === 'SLOT')
    ?.propertyId
}

export function canAcceptInsertedChild(
  node: SceneNode | undefined,
  getNode: (id: string) => SceneNode | undefined
): boolean {
  if (!node) return false
  if (node.type === 'PAGE' || node.type === 'CANVAS') return true
  if (node.type === 'SECTION' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    return true
  }
  if (node.type === 'GROUP' || node.type === 'FRAME') {
    if (isSlotNode(node)) return true
    return ancestorPublishedInstance(node, getNode) === undefined
  }
  return false
}

export function findSlotFrames(
  root: SceneNode,
  getChildren: (id: string) => SceneNode[]
): SceneNode[] {
  const slots: SceneNode[] = []
  const seen = new Set<string>()
  function walk(node: SceneNode) {
    if (seen.has(node.id)) return
    seen.add(node.id)
    if (isSlotNode(node)) slots.push(node)
    for (const child of getChildren(node.id)) walk(child)
  }
  walk(root)
  return slots
}

function findSlotPath(
  source: SceneNode,
  propertyId: string,
  getChildren: (id: string) => SceneNode[],
  path: number[] = []
): number[] | null {
  const children = getChildren(source.id)
  for (const [index, child] of children.entries()) {
    if (slotPropertyId(child) === propertyId && child.type === 'FRAME') {
      return [...path, index]
    }
    const nested = findSlotPath(child, propertyId, getChildren, [...path, index])
    if (nested) return nested
  }
  return null
}

function nodeAtPath(
  root: SceneNode,
  path: number[],
  getChildren: (id: string) => SceneNode[]
): SceneNode | undefined {
  let node = root
  for (const index of path) {
    const child = getChildren(node.id)[index]
    if (!child) return
    node = child
  }
  return node
}

export function findSlotFrameForProperty(
  root: SceneNode,
  propertyId: string,
  getChildren: (id: string) => SceneNode[],
  getNode?: (id: string) => SceneNode | undefined
): SceneNode | undefined {
  const byRef = findSlotFrames(root, getChildren).find(
    (slot) => slotPropertyId(slot) === propertyId
  )
  if (byRef) return byRef
  const component =
    root.type === 'INSTANCE' && root.componentId && getNode ? getNode(root.componentId) : undefined
  if (!component) return
  const path = findSlotPath(component, propertyId, getChildren)
  if (!path) return
  const mapped = nodeAtPath(root, path, getChildren)
  return mapped?.type === 'FRAME' ? mapped : undefined
}

export function findSlotAtPoint(
  editor: Editor,
  wx: number,
  wy: number,
  excludeIds: Iterable<string> = []
): SceneNode | null {
  const excluded = new Set(excludeIds)
  function walk(parentId: string, offsetX: number, offsetY: number): SceneNode | null {
    const parent = editor.graph.getNode(parentId)
    if (!parent) return null
    let best: SceneNode | null = null
    for (const childId of parent.childIds) {
      const child = editor.graph.getNode(childId)
      if (!child || child.internalOnly || !child.visible) continue
      const ax = offsetX + child.x
      const ay = offsetY + child.y
      if (wx < ax || wx > ax + child.width || wy < ay || wy > ay + child.height) continue
      if (!excluded.has(childId) && isSlotNode(child)) best = child
      if (CONTAINER_TYPES.has(child.type)) {
        const deeper = walk(childId, ax, ay)
        if (deeper) best = deeper
      }
    }
    return best
  }
  return walk(editor.state.currentPageId, 0, 0)
}

export function firstSlotInEnteredInstance(editor: Editor): SceneNode | undefined {
  const enteredId = editor.state.enteredContainerId
  const entered = enteredId ? editor.graph.getNode(enteredId) : undefined
  if (entered && canAcceptInsertedChild(entered, (id) => editor.graph.getNode(id))) return entered
  if (entered?.type === 'INSTANCE') {
    return findSlotFrames(entered, (id) => editor.graph.getChildren(id))[0]
  }
  const selected = editor.getSelectedNode()
  if (selected && canAcceptInsertedChild(selected, (id) => editor.graph.getNode(id)))
    return selected
  if (selected?.type === 'INSTANCE') {
    return findSlotFrames(selected, (id) => editor.graph.getChildren(id))[0]
  }
}

export function resolveInsertionParent(editor: Editor, wx: number, wy: number): string {
  const getNode = (id: string) => editor.graph.getNode(id)
  const entered = editor.state.enteredContainerId
    ? editor.graph.getNode(editor.state.enteredContainerId)
    : undefined
  if (entered && canAcceptInsertedChild(entered, getNode) && pointInNode(editor, entered, wx, wy)) {
    return entered.id
  }

  const selected = editor.getSelectedNode()
  if (
    selected &&
    editor.state.selectedIds.size === 1 &&
    canAcceptInsertedChild(selected, getNode) &&
    pointInNode(editor, selected, wx, wy)
  ) {
    return selected.id
  }

  const slot = findSlotAtPoint(editor, wx, wy, editor.state.selectedIds)
  if (slot) return slot.id

  if (entered?.type === 'INSTANCE' && pointInNode(editor, entered, wx, wy)) {
    const fallback = findSlotFrames(entered, (id) => editor.graph.getChildren(id))[0]
    if (fallback) return fallback.id
  }

  return editor.state.currentPageId
}

function pointInNode(editor: Editor, node: SceneNode, wx: number, wy: number): boolean {
  const abs = editor.graph.getAbsolutePosition(node.id)
  return wx >= abs.x && wx <= abs.x + node.width && wy >= abs.y && wy <= abs.y + node.height
}

export function resolveSelectedInsertionParent(editor: Editor): string {
  const parent = firstSlotInEnteredInstance(editor)
  return parent?.id ?? editor.state.currentPageId
}

export function worldToParentLocal(
  editor: Editor,
  parentId: string,
  wx: number,
  wy: number
): { x: number; y: number } {
  if (parentId === editor.state.currentPageId) return { x: wx, y: wy }
  const abs = editor.graph.getAbsolutePosition(parentId)
  return { x: wx - abs.x, y: wy - abs.y }
}

export function slotInsertOptions(
  components: SceneNode[],
  definition: Pick<ComponentPropertyDefinition, 'preferredValues' | 'onlyPreferredInstances'>
) {
  const preferred = new Set(definition.preferredValues ?? [])
  const onlyPreferred = definition.onlyPreferredInstances === true && preferred.size > 0
  return components
    .filter((node) => node.type === 'COMPONENT')
    .filter((node) => !onlyPreferred || preferred.has(node.id))
    .map((node) => ({
      value: node.id,
      label: node.name,
      preferred: preferred.has(node.id)
    }))
    .sort(
      (left, right) =>
        Number(right.preferred) - Number(left.preferred) || left.label.localeCompare(right.label)
    )
    .map(({ value, label }) => ({ value, label }))
}

function resolveInsertComponentId(
  editor: Editor,
  componentId: string,
  sourceLibraryKey?: string
): string | null {
  const materialized = materializeComponent(editor, componentId, sourceLibraryKey) ?? componentId
  const node = editor.graph.getNode(materialized)
  if (node?.type === 'COMPONENT') return node.id
  if (node?.type !== 'COMPONENT_SET') return null
  return (
    editor.graph
      .getChildren(node.id)
      .filter((child) => child.type === 'COMPONENT')
      .sort((a, b) => a.y - b.y || a.x - b.x || a.name.localeCompare(b.name))[0]?.id ?? null
  )
}

export function applySlotInsertLayout(editor: Editor, childId: string, slot: SceneNode): void {
  const propertyId = slotPropertyId(slot)
  const instance = ancestorPublishedInstance(slot, (id) => editor.graph.getNode(id))
  const definition = propertyId
    ? instance
      ? editor
          .getInstanceComponentPropertyDefinitions(instance.id)
          .find((item) => item.id === propertyId)
      : undefined
    : undefined
  if (!definition?.fillCounterAxisByDefault || slot.layoutMode === 'NONE') return
  editor.graph.updateNode(childId, { counterAxisSizing: 'FILL' })
}

export function insertInstanceIntoSlot(
  editor: Editor,
  slot: SceneNode,
  componentId: string,
  sourceLibraryKey?: string
): string | null {
  if (slot.type !== 'FRAME') return null
  const getNode = (id: string) => editor.graph.getNode(id)
  const propertyId = slotPropertyId(slot)
  const host = ancestorPublishedInstance(slot, getNode)
  const definition = propertyId
    ? host
      ? editor
          .getInstanceComponentPropertyDefinitions(host.id)
          .find((item) => item.id === propertyId)
      : undefined
    : undefined
  if (
    typeof definition?.slotMaxLayers === 'number' &&
    definition.slotMaxLayers > 0 &&
    slot.childIds.length >= definition.slotMaxLayers
  ) {
    return null
  }
  const resolvedId = resolveInsertComponentId(editor, componentId, sourceLibraryKey)
  if (!resolvedId) return null

  const x = slot.paddingLeft
  const y = slot.paddingTop
  const created = editor.graph.createInstance(resolvedId, slot.id, { x, y })
  if (!created) return null
  if (created.parentId !== slot.id) {
    editor.graph.reparentNode(created.id, slot.id)
    editor.graph.updateNode(created.id, { x, y })
  }
  if (sourceLibraryKey) editor.graph.updateNode(created.id, { sourceLibraryKey })
  applySlotInsertLayout(editor, created.id, slot)

  const live = editor.graph.getNode(created.id)
  if (!live) return null
  const { childIds: _childIds, parentId: _parentId, type: _type, ...snapshot } = live
  const instanceId = live.id
  editor.undo.push({
    label: 'Insert into slot',
    forward: () => {
      editor.graph.createInstance(resolvedId, slot.id, { ...snapshot, x, y })
      if (sourceLibraryKey) editor.graph.updateNode(instanceId, { sourceLibraryKey })
      applySlotInsertLayout(editor, instanceId, slot)
      computeAllLayouts(editor.graph, editor.state.currentPageId)
      editor.requestRender()
    },
    inverse: () => {
      editor.graph.deleteNode(instanceId)
      computeAllLayouts(editor.graph, editor.state.currentPageId)
      editor.requestRender()
    }
  })
  computeAllLayouts(editor.graph, editor.state.currentPageId)
  editor.requestRender()
  return instanceId
}

export function insertIntoSlot(
  editor: Editor,
  instances: readonly SceneNode[],
  propertyId: string,
  componentId: string,
  sourceLibraryKey?: string
): string | null {
  if (!componentId) return null
  const getChildren = (id: string) => editor.graph.getChildren(id)
  const getNode = (id: string) => editor.graph.getNode(id)
  const targets = instances.filter((node) => node.type === 'INSTANCE')
  if (targets.length === 0) return null
  let selectedId: string | null = null
  const run = () => {
    for (const instance of targets) {
      const slot = findSlotFrameForProperty(instance, propertyId, getChildren, getNode)
      if (!slot) continue
      const insertedId = insertInstanceIntoSlot(editor, slot, componentId, sourceLibraryKey)
      if (insertedId) selectedId = insertedId
    }
  }
  if (targets.length > 1) editor.undo.runBatch('Insert into slot', run)
  else run()
  if (selectedId) editor.select([selectedId])
  return selectedId
}
