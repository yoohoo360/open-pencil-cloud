import {
  Circle,
  Component,
  Diamond,
  Frame,
  Grid3x3,
  Group,
  Hand,
  LayoutGrid,
  Minus,
  MousePointer,
  PenTool,
  Square,
  Star,
  Triangle,
  Type,
  Columns3,
  Rows3
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { Tool } from '@open-pencil/core/editor'

export const toolIcons: Record<Tool, LucideIcon> = {
  SELECT: MousePointer,
  FRAME: Frame,
  SECTION: LayoutGrid,
  RECTANGLE: Square,
  ELLIPSE: Circle,
  LINE: Minus,
  POLYGON: Triangle,
  STAR: Star,
  PEN: PenTool,
  TEXT: Type,
  HAND: Hand
}

export const NODE_ICONS: Partial<Record<string, LucideIcon>> = {
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

export const AUTO_LAYOUT_ICONS: Partial<Record<string, LucideIcon>> = {
  VERTICAL: Rows3,
  HORIZONTAL: Columns3,
  GRID: Grid3x3
}

export const COMPONENT_TYPES = new Set(['COMPONENT', 'COMPONENT_SET', 'INSTANCE'])

export function nodeIcon(node: { type: string; layoutMode: string }) {
  if (node.type === 'FRAME' && node.layoutMode !== 'NONE') {
    return AUTO_LAYOUT_ICONS[node.layoutMode] ?? Frame
  }
  return NODE_ICONS[node.type] ?? Square
}
