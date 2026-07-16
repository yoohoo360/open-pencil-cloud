import {
  Circle,
  Frame,
  Hand,
  LayoutGrid,
  Minus,
  MousePointer,
  PenTool,
  Square,
  Star,
  Triangle,
  Type,
  type LucideIcon
} from 'lucide-react'

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
