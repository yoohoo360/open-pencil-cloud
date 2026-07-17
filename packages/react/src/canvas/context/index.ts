import { createContext } from '#react/internal/create-context'
import type { ReactiveRef as Ref } from '#react/internal/reactive'
import type { SceneNode } from '@open-pencil/scene-graph'

export interface CanvasContext {
  canvasRef: Ref<HTMLCanvasElement | null>
  ready: Ref<boolean>
  renderNow: () => void
  hitTestSectionTitle: (cx: number, cy: number) => SceneNode | null
  hitTestComponentLabel: (cx: number, cy: number) => SceneNode | null
  hitTestFrameTitle: (cx: number, cy: number) => SceneNode | null
}

export const [useCanvasContext, CanvasContextProvider, useOptionalCanvasContext] =
  createContext<CanvasContext>('Canvas')

/** @deprecated Use CanvasContextProvider */
export function provideCanvas(_ctx: CanvasContext) {
  throw new Error('[open-pencil] provideCanvas() is Vue-only. Use <CanvasContextProvider value={ctx}> instead.')
}
