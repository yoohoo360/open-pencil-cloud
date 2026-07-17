import { createContext } from '#react/internal/create-context'
import type { ReactiveRef } from '#react/internal/reactive'
import type { SceneNode } from '@open-pencil/scene-graph'

import type { useLayout } from '#react/controls/layout/use'

/** Unwrapped layout context — all ReactiveRef fields accessible via `.value`. */
export type LayoutControlsContext = ReturnType<typeof useLayout> & {
  node: ReactiveRef<SceneNode | null>
}

export const [useLayoutControlsContext, LayoutControlsProvider] =
  createContext<LayoutControlsContext>('LayoutControls')

/** @deprecated Use LayoutControlsProvider */
export function provideLayoutControls(_ctx: LayoutControlsContext) {
  throw new Error('[open-pencil] provideLayoutControls() is Vue-only.')
}
