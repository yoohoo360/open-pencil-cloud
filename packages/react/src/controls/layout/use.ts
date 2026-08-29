import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'

import {
  ALIGN_HORIZONTAL,
  ALIGN_VERTICAL,
  createGridTrackActions,
  createLayoutActions,
  createTrackSizingOptions,
  hasSymmetricPadding,
  hasUniformPadding,
  heightSizingForNode,
  isNodeInAutoLayout,
  sizingLabels,
  sizingOptionsForNode,
  trackLabel,
  widthSizingForNode
} from '#react/controls/layout/helpers'
import { useEditor } from '#react/editor/context'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export function useLayout() {
  const editor = useEditor()
  const { panels } = useI18n()
  const [showIndividualPadding, setShowIndividualPadding] = useState(false)
  const node = useSceneComputed(() => editor.getSelectedNode() ?? null)
  const isInAutoLayout = isNodeInAutoLayout(editor, node)
  const isGrid = node?.layoutMode === 'GRID'
  const isFlex = node?.layoutMode === 'HORIZONTAL' || node?.layoutMode === 'VERTICAL'
  const gapAuto = node?.primaryAxisAlign === 'SPACE_BETWEEN'
  const alignGrid = node?.layoutMode === 'VERTICAL' ? ALIGN_VERTICAL : ALIGN_HORIZONTAL
  const widthSizing = widthSizingForNode(node, isInAutoLayout)
  const heightSizing = heightSizingForNode(node, isInAutoLayout)
  const labels = sizingLabels(panels)
  const widthSizingOptions = sizingOptionsForNode(node, isInAutoLayout, labels)
  const heightSizingOptions = sizingOptionsForNode(node, isInAutoLayout, labels)

  const getNode = () => editor.getSelectedNode() ?? null
  const actions = useMemo(
    () =>
      createLayoutActions({
        editor,
        getNode,
        isInAutoLayout: () => isNodeInAutoLayout(editor, editor.getSelectedNode() ?? null)
      }),
    [editor]
  )
  const tracks = useMemo(() => createGridTrackActions(editor, getNode), [editor])

  return {
    editor,
    node,
    layoutDirection: (node?.layoutDirection ?? 'AUTO') as SceneNode['layoutDirection'],
    gapAuto: Boolean(gapAuto),
    isInAutoLayout,
    isGrid: Boolean(isGrid),
    isFlex: Boolean(isFlex),
    widthSizing,
    heightSizing,
    widthSizingOptions,
    heightSizingOptions,
    alignGrid,
    showIndividualPadding,
    hasUniformPadding: hasUniformPadding(node),
    hasSymmetricPadding: hasSymmetricPadding(node),
    trackSizingOptions: createTrackSizingOptions(panels),
    trackLabel,
    toggleIndividualPadding: () => setShowIndividualPadding((value) => !value),
    ...actions,
    ...tracks
  }
}

export type LayoutControls = ReturnType<typeof useLayout>

const LayoutControlsContext = createContext<LayoutControls | null>(null)

export function LayoutControlsProvider({
  value,
  children
}: {
  value: LayoutControls
  children: ReactNode
}) {
  return createElement(LayoutControlsContext.Provider, { value }, children)
}

export function useLayoutControlsContext(): LayoutControls {
  const context = useContext(LayoutControlsContext)
  if (!context) {
    throw new Error('useLayoutControlsContext must be used within LayoutControlsProvider')
  }
  return context
}
