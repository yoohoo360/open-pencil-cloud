import { useLayoutControlsContext, type useLayout } from '@open-pencil/react'
import type { SceneNode } from '@open-pencil/scene-graph'

export type GridTrackProp = 'gridTemplateColumns' | 'gridTemplateRows'
export type PaddingProp = 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'

export type LayoutControlsApi = Omit<ReturnType<typeof useLayout>, 'node'> & { node: SceneNode }

export function useLayoutContext(): LayoutControlsApi {
  return useLayoutControlsContext() as LayoutControlsApi
}
