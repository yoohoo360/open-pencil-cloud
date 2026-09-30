import type { NodeType } from '@open-pencil/scene-graph'

export const CONTEXT_MENU_ITEM_IDS = [
  'selection.duplicate',
  'selection.delete',
  'view.zoomSelection',
  'selection.moveToPageWhenAvailable',
  'selection.bringForward',
  'selection.bringToFront',
  'selection.sendBackward',
  'selection.sendToBack',
  'selection.group',
  'selection.frameSelection',
  'selection.ungroupWhenGroup',
  'selection.wrapInAutoLayout',
  'selection.toggleMask',
  'selection.flatten',
  'selection.outlineText',
  'selection.outlineStroke',
  'selection.componentAction',
  'selection.componentSetAction',
  'selection.instanceActions',
  'selection.toggleVisibility',
  'selection.toggleLock',
  'selection.flipHorizontal',
  'selection.flipVertical'
] as const

export type ContextMenuItemId = (typeof CONTEXT_MENU_ITEM_IDS)[number]

export const CONTEXT_MENU_NODE_KINDS = [
  'default',
  'FRAME',
  'SECTION',
  'GROUP',
  'RECTANGLE',
  'ELLIPSE',
  'LINE',
  'STAR',
  'POLYGON',
  'TEXT',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
] as const

export type ContextMenuNodeKind = (typeof CONTEXT_MENU_NODE_KINDS)[number]

export const CONTEXT_MENU_ITEM_GROUP: Record<ContextMenuItemId, string> = {
  'selection.duplicate': 'edit',
  'selection.delete': 'edit',
  'view.zoomSelection': 'zoom',
  'selection.moveToPageWhenAvailable': 'arrange',
  'selection.bringForward': 'arrange',
  'selection.bringToFront': 'arrange',
  'selection.sendBackward': 'arrange',
  'selection.sendToBack': 'arrange',
  'selection.group': 'object',
  'selection.frameSelection': 'object',
  'selection.ungroupWhenGroup': 'object',
  'selection.wrapInAutoLayout': 'object',
  'selection.toggleMask': 'object',
  'selection.flatten': 'object',
  'selection.outlineText': 'object',
  'selection.outlineStroke': 'object',
  'selection.componentAction': 'component',
  'selection.componentSetAction': 'component',
  'selection.instanceActions': 'component',
  'selection.toggleVisibility': 'visibility',
  'selection.toggleLock': 'visibility',
  'selection.flipHorizontal': 'flip',
  'selection.flipVertical': 'flip'
}

const EDIT = ['selection.duplicate', 'selection.delete'] as const satisfies readonly ContextMenuItemId[]
const ZOOM = ['view.zoomSelection'] as const satisfies readonly ContextMenuItemId[]
const ARRANGE = [
  'selection.moveToPageWhenAvailable',
  'selection.bringForward',
  'selection.bringToFront',
  'selection.sendBackward',
  'selection.sendToBack'
] as const satisfies readonly ContextMenuItemId[]
const OBJECT = [
  'selection.group',
  'selection.frameSelection',
  'selection.ungroupWhenGroup',
  'selection.wrapInAutoLayout',
  'selection.toggleMask',
  'selection.flatten',
  'selection.outlineText',
  'selection.outlineStroke'
] as const satisfies readonly ContextMenuItemId[]
const TEXT_OBJECT = [
  'selection.outlineText',
  'selection.group',
  'selection.frameSelection',
  'selection.ungroupWhenGroup',
  'selection.wrapInAutoLayout'
] as const satisfies readonly ContextMenuItemId[]
const COMPONENT = [
  'selection.componentAction',
  'selection.componentSetAction',
  'selection.instanceActions'
] as const satisfies readonly ContextMenuItemId[]
const VISIBILITY = ['selection.toggleVisibility', 'selection.toggleLock'] as const satisfies readonly ContextMenuItemId[]
const FLIP = ['selection.flipHorizontal', 'selection.flipVertical'] as const satisfies readonly ContextMenuItemId[]

function concat(...groups: readonly (readonly ContextMenuItemId[])[]): ContextMenuItemId[] {
  return groups.flatMap((group) => [...group])
}

const DEFAULT_ORDER = concat(EDIT, ZOOM, ARRANGE, OBJECT, COMPONENT, VISIBILITY, FLIP)

const DEFAULT_ORDER_BY_KIND: Record<ContextMenuNodeKind, readonly ContextMenuItemId[]> = {
  default: DEFAULT_ORDER,
  FRAME: DEFAULT_ORDER,
  SECTION: DEFAULT_ORDER,
  RECTANGLE: DEFAULT_ORDER,
  ELLIPSE: DEFAULT_ORDER,
  LINE: DEFAULT_ORDER,
  STAR: DEFAULT_ORDER,
  POLYGON: DEFAULT_ORDER,
  VECTOR: DEFAULT_ORDER,
  BOOLEAN_OPERATION: DEFAULT_ORDER,
  TEXT: concat(EDIT, ZOOM, ARRANGE, TEXT_OBJECT, COMPONENT, VISIBILITY, FLIP),
  GROUP: concat(EDIT, ZOOM, OBJECT, ARRANGE, COMPONENT, VISIBILITY, FLIP),
  COMPONENT: concat(EDIT, ZOOM, COMPONENT, ARRANGE, OBJECT, VISIBILITY, FLIP),
  COMPONENT_SET: concat(EDIT, ZOOM, COMPONENT, ARRANGE, OBJECT, VISIBILITY, FLIP),
  INSTANCE: concat(EDIT, ZOOM, COMPONENT, ARRANGE, OBJECT, VISIBILITY, FLIP)
}

const ITEM_ID_SET = new Set<string>(CONTEXT_MENU_ITEM_IDS)

export function isContextMenuItemId(value: string): value is ContextMenuItemId {
  return ITEM_ID_SET.has(value)
}

export function isContextMenuNodeKind(value: string): value is ContextMenuNodeKind {
  return (CONTEXT_MENU_NODE_KINDS as readonly string[]).includes(value)
}

export function contextMenuKindForNodeType(
  nodeType: NodeType | null | undefined
): ContextMenuNodeKind {
  if (nodeType === 'ROUNDED_RECTANGLE') return 'RECTANGLE'
  if (nodeType && isContextMenuNodeKind(nodeType)) return nodeType
  return 'default'
}

export function defaultContextMenuOrder(kind: ContextMenuNodeKind): ContextMenuItemId[] {
  return [...DEFAULT_ORDER_BY_KIND[kind]]
}

export function catalogContextMenuOrder(kind: ContextMenuNodeKind): ContextMenuItemId[] {
  const preferred = defaultContextMenuOrder(kind)
  const next = [...preferred]
  const seen = new Set(preferred)
  for (const id of CONTEXT_MENU_ITEM_IDS) {
    if (seen.has(id)) continue
    next.push(id)
  }
  return next
}

export function normalizeContextMenuOrder(
  kind: ContextMenuNodeKind,
  stored: readonly unknown[] | undefined
): ContextMenuItemId[] {
  const fallback = catalogContextMenuOrder(kind)
  const seen = new Set<ContextMenuItemId>()
  const next: ContextMenuItemId[] = []
  for (const value of stored ?? []) {
    if (typeof value !== 'string' || !isContextMenuItemId(value) || seen.has(value)) continue
    seen.add(value)
    next.push(value)
  }
  for (const id of fallback) {
    if (seen.has(id)) continue
    next.push(id)
  }
  return next
}

export type ContextMenuOrders = Partial<Record<ContextMenuNodeKind, ContextMenuItemId[]>>

export function normalizeContextMenuOrders(value: unknown): ContextMenuOrders {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const stored = value as Record<string, unknown>
  const next: ContextMenuOrders = {}
  for (const kind of CONTEXT_MENU_NODE_KINDS) {
    const raw = stored[kind]
    if (!Array.isArray(raw)) continue
    const order = normalizeContextMenuOrder(kind, raw)
    const defaults = catalogContextMenuOrder(kind)
    if (order.length === defaults.length && order.every((id, index) => id === defaults[index])) continue
    next[kind] = order
  }
  return next
}

export function resolveContextMenuOrder(
  kind: ContextMenuNodeKind,
  orders: ContextMenuOrders
): ContextMenuItemId[] {
  return normalizeContextMenuOrder(kind, orders[kind])
}

export function moveContextMenuItem(
  order: readonly ContextMenuItemId[],
  index: number,
  delta: number
): ContextMenuItemId[] {
  const target = index + delta
  if (index < 0 || index >= order.length || target < 0 || target >= order.length) return [...order]
  const next = [...order]
  const [item] = next.splice(index, 1)
  if (!item) return [...order]
  next.splice(target, 0, item)
  return next
}

export function contextMenuGroupsFromOrder(
  order: readonly ContextMenuItemId[],
  source: 'canvas' | 'layers'
): ContextMenuItemId[][] {
  const groups: ContextMenuItemId[][] = []
  let current: ContextMenuItemId[] = []
  let lastGroup: string | null = null
  for (const id of order) {
    if (source === 'canvas' && id === 'view.zoomSelection') continue
    const group = CONTEXT_MENU_ITEM_GROUP[id]
    if (lastGroup !== null && group !== lastGroup && current.length > 0) {
      groups.push(current)
      current = []
    }
    current.push(id)
    lastGroup = group
  }
  if (current.length > 0) groups.push(current)
  return groups
}
