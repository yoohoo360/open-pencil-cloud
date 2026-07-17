import { createContext } from '../context/createContext'

import type { SceneNode } from '@open-pencil/core'
import type { RefObject } from 'react'

export interface CanvasContext {
  canvasRef: RefObject<HTMLCanvasElement | null>
  ready: boolean
  renderNow: () => void
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null
}

export const [useCanvasContext, CanvasProvider] = createContext<CanvasContext>('canvas')

/** @deprecated Use CanvasProvider */
export function provideCanvas(_ctx: CanvasContext): never {
  throw new Error('[open-pencil] provideCanvas is Vue-only. Use <CanvasProvider value={...}>.')
}
