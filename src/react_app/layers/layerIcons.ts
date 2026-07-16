import {
  Circle,
  Columns3,
  Component,
  Diamond,
  Frame,
  Grid3x3,
  Group,
  LayoutGrid,
  Minus,
  PenTool,
  Rows3,
  Square,
  Type,
  type LucideIcon
} from 'lucide-react'

const NODE_ICONS: Partial<Record<string, LucideIcon>> = {
  SECTION: LayoutGrid,
  ELLIPSE: Circle,
  FRAME: Frame,
  GROUP: Group,
  COMPONENT: Diamond,
  COMPONENT_SET: Component,
  INSTANCE: Diamond,
  LINE: Minus,
  TEXT: Type,
  VECTOR: PenTool,
  RECTANGLE: Square
}

const AUTO_LAYOUT_ICONS: Partial<Record<string, LucideIcon>> = {
  VERTICAL: Rows3,
  HORIZONTAL: Columns3,
  GRID: Grid3x3
}

export const COMPONENT_TYPES = new Set(['COMPONENT', 'COMPONENT_SET', 'INSTANCE'])

export function nodeIcon(node: { type: string; layoutMode: string }): LucideIcon {
  if (node.type === 'FRAME' && node.layoutMode !== 'NONE') {
    return AUTO_LAYOUT_ICONS[node.layoutMode] ?? Frame
  }
  return NODE_ICONS[node.type] ?? Square
}
