import { useLayout } from '../controls/useLayout'

import type {
  SceneNode,
  LayoutSizing,
  LayoutAlign,
  LayoutCounterAlign,
  GridTrack
} from '@open-pencil/core'
import type { Editor } from '@open-pencil/core/editor'
import type { ReactNode } from 'react'

export interface LayoutControlsRootSlotProps {
  editor: Editor
  node: SceneNode | null
  layoutDirection: SceneNode['layoutDirection']
  isInAutoLayout: boolean
  isGrid: boolean
  isFlex: boolean
  widthSizing: LayoutSizing
  heightSizing: LayoutSizing
  widthSizingOptions: { value: LayoutSizing; label: string }[]
  heightSizingOptions: { value: LayoutSizing; label: string }[]
  alignGrid: { primary: LayoutAlign; counter: LayoutCounterAlign }[]
  showIndividualPadding: boolean
  hasUniformPadding: boolean
  trackSizingOptions: { value: 'FR' | 'FIXED' | 'AUTO'; label: string }[]
  updateProp: (key: string, value: number | string) => void
  commitProp: (key: string, value: number | string, previous: number | string) => void
  setWidthSizing: (sizing: LayoutSizing) => void
  setHeightSizing: (sizing: LayoutSizing) => void
  setUniformPadding: (v: number) => void
  commitUniformPadding: (value: number, previous: number) => void
  setAlignment: (primary: LayoutAlign, counter: LayoutCounterAlign) => void
  setLayoutDirection: (direction: SceneNode['layoutDirection']) => void
  updateGridTrack: (
    prop: 'gridTemplateColumns' | 'gridTemplateRows',
    index: number,
    updates: Partial<GridTrack>
  ) => void
  addTrack: (prop: 'gridTemplateColumns' | 'gridTemplateRows') => void
  removeTrack: (prop: 'gridTemplateColumns' | 'gridTemplateRows', index: number) => void
  trackLabel: (track: GridTrack) => string
  toggleIndividualPadding: () => void
}

export interface LayoutControlsRootProps {
  children?: ReactNode | ((state: LayoutControlsRootSlotProps) => ReactNode)
}

export function LayoutControlsRoot({ children }: LayoutControlsRootProps) {
  const ctx = useLayout()
  const slot: LayoutControlsRootSlotProps = { ...ctx }
  return <>{typeof children === 'function' ? children(slot) : children}</>
}
