import type { RefObject } from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'

import { createContext } from '../context/createContext'

export interface CanvasContext {
  canvasRef: RefObject<HTMLCanvasElement | null>
  ready: boolean
  renderNow: () => void
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null
}

export const [useCanvasContext, CanvasProvider] = createContext<CanvasContext>('Canvas')
