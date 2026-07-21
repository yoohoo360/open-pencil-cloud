import { createContext, useContext } from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'

export type LayoutControlsContextValue = Record<string, unknown> & { node: SceneNode }

const LayoutControlsReactContext = createContext<LayoutControlsContextValue | null>(null)
LayoutControlsReactContext.displayName = 'LayoutControls'

export function useLayoutControlsContext(): LayoutControlsContextValue {
  const ctx = useContext(LayoutControlsReactContext)
  if (!ctx) throw new Error('Layout controls must be used within LayoutControlsRoot')
  return ctx
}

export { LayoutControlsReactContext as LayoutControlsProvider }
export type { LayoutControlsContextValue as LayoutControlsContext }
