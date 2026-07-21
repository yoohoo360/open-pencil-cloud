import { createContext, useContext, type RefObject } from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'

export interface CanvasContext {
  canvasRef: RefObject<HTMLCanvasElement | null>
  ready: boolean
  renderNow: () => void
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null
}

export const CanvasContextProvider = createContext<CanvasContext | null>(null)

export function useCanvasContext(): CanvasContext {
  const ctx = useContext(CanvasContextProvider)
  if (!ctx) throw new Error('[open-pencil] useCanvasContext() called outside <CanvasRoot>')
  return ctx
}
