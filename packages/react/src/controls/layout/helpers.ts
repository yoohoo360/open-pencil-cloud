import { useMemo, useState } from 'react'

import type { Editor } from '@open-pencil/core/editor'
import type {
  GridTrack,
  LayoutAlign,
  LayoutCounterAlign,
  LayoutSizing,
  SceneNode
} from '@open-pencil/scene-graph'

import type { usePanelMessages } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export type AlignCell = { primary: LayoutAlign; counter: LayoutCounterAlign }

type GridTrackProp = 'gridTemplateColumns' | 'gridTemplateRows'

type LayoutPanelStrings = {
  sizingFixed: string
  sizingHug: string
  sizingFill: string
}

export type LayoutAxis = 'width' | 'height'
export type SizeLimitProp = 'minWidth' | 'maxWidth' | 'minHeight' | 'maxHeight'

export const ALIGN_HORIZONTAL: AlignCell[] = [
  { primary: 'MIN', counter: 'MIN' },
  { primary: 'CENTER', counter: 'MIN' },
  { primary: 'MAX', counter: 'MIN' },
  { primary: 'MIN', counter: 'CENTER' },
  { primary: 'CENTER', counter: 'CENTER' },
  { primary: 'MAX', counter: 'CENTER' },
  { primary: 'MIN', counter: 'MAX' },
  { primary: 'CENTER', counter: 'MAX' },
  { primary: 'MAX', counter: 'MAX' }
]

export const ALIGN_VERTICAL: AlignCell[] = [
  { primary: 'MIN', counter: 'MIN' },
  { primary: 'MIN', counter: 'CENTER' },
  { primary: 'MIN', counter: 'MAX' },
  { primary: 'CENTER', counter: 'MIN' },
  { primary: 'CENTER', counter: 'CENTER' },
  { primary: 'CENTER', counter: 'MAX' },
  { primary: 'MAX', counter: 'MIN' },
  { primary: 'MAX', counter: 'CENTER' },
  { primary: 'MAX', counter: 'MAX' }
]

export function createLayoutSelectionState(
  editor: Editor,
  panels: ReturnType<typeof usePanelMessages>
) {
  const node = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)
  const layoutDirection = useMemo(() => node?.layoutDirection ?? 'AUTO', [node])
  const sizingState = createLayoutSizingState(editor, node, panels)
  const gapAuto = useMemo(() => node?.primaryAxisAlign === 'SPACE_BETWEEN', [node])
  const alignGrid = useMemo(
    () => (node?.layoutMode === 'VERTICAL' ? ALIGN_VERTICAL : ALIGN_HORIZONTAL),
    [node]
  )

  return { node, layoutDirection, gapAuto, alignGrid, ...sizingState }
}

export function createTrackSizingOptions(panels: ReturnType<typeof usePanelMessages>) {
  return [
    { value: 'FR' as const, label: panels.sizingFillFr },
    { value: 'FIXED' as const, label: panels.sizingFixedPx },
    { value: 'AUTO' as const, label: panels.auto }
  ]
}

export function trackLabel(track: GridTrack): string {
  if (track.sizing === 'FR') return `${track.value}fr`
  if (track.sizing === 'FIXED') return `${track.value}px`
  return 'Auto'
}

export function createGridTrackActions(editor: Editor, node: SceneNode | null) {
  function updateGridTrack(prop: GridTrackProp, index: number, updates: Partial<GridTrack>) {
    if (!node) return
    const tracks = [...node[prop]]
    tracks[index] = { ...tracks[index], ...updates }
    editor.updateNodeWithUndo(node.id, { [prop]: tracks }, 'Change grid track')
  }

  function addTrack(prop: GridTrackProp) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { [prop]: [...node[prop], { sizing: 'FR' as const, value: 1 }] },
      'Add grid track'
    )
  }

  function removeTrack(prop: GridTrackProp, index: number) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { [prop]: node[prop].filter((_: GridTrack, i: number) => i !== index) },
      'Remove grid track'
    )
  }

  return { updateGridTrack, addTrack, removeTrack }
}

export function createPaddingActions(editor: Editor, node: SceneNode | null) {
  const [showIndividualPadding, setShowIndividualPadding] = useState(false)

  const hasUniformPadding = useMemo(() => {
    if (!node) return true
    return (
      node.paddingTop === node.paddingRight &&
      node.paddingRight === node.paddingBottom &&
      node.paddingBottom === node.paddingLeft
    )
  }, [node])

  const hasSymmetricPadding = useMemo(() => {
    if (!node) return true
    return node.paddingLeft === node.paddingRight && node.paddingTop === node.paddingBottom
  }, [node])

  function setHorizontalPadding(v: number) {
    if (!node) return
    editor.updateNode(node.id, { paddingLeft: v, paddingRight: v })
  }

  function commitHorizontalPadding(_value: number, previous: number) {
    if (!node) return
    editor.commitNodeUpdate(
      node.id,
      { paddingLeft: previous, paddingRight: previous } satisfies Partial<SceneNode>,
      'Change horizontal padding'
    )
  }

  function setVerticalPadding(v: number) {
    if (!node) return
    editor.updateNode(node.id, { paddingTop: v, paddingBottom: v })
  }

  function commitVerticalPadding(_value: number, previous: number) {
    if (!node) return
    editor.commitNodeUpdate(
      node.id,
      { paddingTop: previous, paddingBottom: previous } satisfies Partial<SceneNode>,
      'Change vertical padding'
    )
  }

  function toggleIndividualPadding() {
    setShowIndividualPadding((open) => !open)
  }

  return {
    showIndividualPadding,
    hasUniformPadding,
    hasSymmetricPadding,
    setHorizontalPadding,
    commitHorizontalPadding,
    setVerticalPadding,
    commitVerticalPadding,
    toggleIndividualPadding
  }
}

export function axisSizingPatchForNode(
  node: SceneNode,
  axis: LayoutAxis,
  sizing: LayoutSizing,
  isInAutoLayout: boolean
): Partial<SceneNode> {
  const patch: Partial<SceneNode> = {}
  const isFlex = node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL'
  if (isFlex) {
    const primary =
      (axis === 'width' && node.layoutMode === 'HORIZONTAL') ||
      (axis === 'height' && node.layoutMode === 'VERTICAL')
    patch[primary ? 'primaryAxisSizing' : 'counterAxisSizing'] = sizing
  } else if (sizing === 'HUG' && node.childIds.length > 0) {
    patch[axis === 'width' ? 'counterAxisSizing' : 'primaryAxisSizing'] = 'HUG'
    if (isInAutoLayout) {
      if (axis === 'width') patch.layoutGrow = 0
      else patch.layoutAlignSelf = 'AUTO'
    }
  } else if (axis === 'width') {
    if (node.counterAxisSizing === 'HUG') patch.counterAxisSizing = 'FIXED'
    if (isInAutoLayout) patch.layoutGrow = sizing === 'FILL' ? 1 : 0
  } else {
    if (node.primaryAxisSizing === 'HUG') patch.primaryAxisSizing = 'FIXED'
    if (isInAutoLayout) patch.layoutAlignSelf = sizing === 'FILL' ? 'STRETCH' : 'AUTO'
  }
  return patch
}

export function createLayoutActions({
  editor,
  node,
  isInAutoLayout
}: {
  editor: Editor
  node: SceneNode | null
  isInAutoLayout: boolean
}) {
  function updateProp(key: string, value: number | string) {
    if (node) editor.updateNode(node.id, { [key]: value })
  }

  function updateSizeLimit(prop: SizeLimitProp, value: number) {
    if (!node) return
    editor.updateNode(node.id, { [prop]: value })
  }

  function setSizeLimitToCurrent(prop: SizeLimitProp) {
    const n = node
    if (!n) return
    const value = prop === 'minWidth' || prop === 'maxWidth' ? n.width : n.height
    editor.updateNodeWithUndo(n.id, { [prop]: Math.round(value) }, `Set ${prop}`)
  }

  function commitSizeLimit(prop: SizeLimitProp, _value: number, previous: number) {
    if (!node) return
    editor.commitNodeUpdate(node.id, { [prop]: previous }, `Change ${prop}`)
  }

  function addSizeLimit(prop: SizeLimitProp) {
    const n = node
    if (!n) return
    const fallback = prop === 'minWidth' || prop === 'maxWidth' ? n.width : n.height
    editor.updateNodeWithUndo(n.id, { [prop]: Math.round(fallback) }, `Add ${prop}`)
  }

  function removeSizeLimit(prop: SizeLimitProp) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { [prop]: null }, `Remove ${prop}`)
  }

  function commitProp(key: string, _value: number | string, previous: number | string) {
    if (node) {
      editor.commitNodeUpdate(
        node.id,
        { [key]: previous } as Partial<SceneNode>,
        `Change ${key}`
      )
    }
  }

  function setAxisSizing(axis: LayoutAxis, sizing: LayoutSizing) {
    const n = node
    if (!n) return
    editor.updateNodeWithUndo(
      n.id,
      axisSizingPatchForNode(n, axis, sizing, isInAutoLayout),
      `Set ${axis} sizing`
    )
  }

  function updateAxisSize(axis: LayoutAxis, value: number) {
    const n = node
    if (!n) return
    const sizing =
      axis === 'width'
        ? widthSizingForNode(n, isInAutoLayout)
        : heightSizingForNode(n, isInAutoLayout)
    if (sizing !== 'FIXED') setAxisSizing(axis, 'FIXED')
    editor.updateNode(n.id, { [axis]: value })
  }

  function commitAxisSize(axis: LayoutAxis, _value: number, previous: number) {
    const n = node
    if (n) editor.commitNodeUpdate(n.id, { [axis]: previous }, `Change ${axis}`)
  }

  function setAlignment(primary: LayoutAlign, counter: LayoutCounterAlign) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { primaryAxisAlign: primary, counterAxisAlign: counter },
      'Change alignment'
    )
  }

  function setGapAuto(enabled: boolean) {
    const n = node
    if (!n) return
    editor.updateNodeWithUndo(
      n.id,
      { primaryAxisAlign: enabled ? 'SPACE_BETWEEN' : 'MIN' },
      enabled ? 'Set gap to auto' : 'Set gap to fixed'
    )
  }

  function setLayoutDirection(direction: SceneNode['layoutDirection']) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { layoutDirection: direction },
      'Change layout direction'
    )
  }

  return {
    updateProp,
    updateSizeLimit,
    setSizeLimitToCurrent,
    commitSizeLimit,
    addSizeLimit,
    removeSizeLimit,
    commitProp,
    setAxisSizing,
    updateAxisSize,
    commitAxisSize,
    setAlignment,
    setGapAuto,
    setLayoutDirection
  }
}

export function canNodeHugContents(node: SceneNode | null): boolean {
  return !!node && node.childIds.length > 0
}

export function widthSizingForNode(node: SceneNode | null, isInAutoLayout: boolean): LayoutSizing {
  if (!node) return 'FIXED'
  if (node.layoutMode === 'HORIZONTAL') return node.primaryAxisSizing
  if (node.layoutMode === 'VERTICAL') return node.counterAxisSizing
  if (canNodeHugContents(node) && node.counterAxisSizing === 'HUG') return 'HUG'
  if (isInAutoLayout && node.layoutGrow > 0) return 'FILL'
  return 'FIXED'
}

export function heightSizingForNode(node: SceneNode | null, isInAutoLayout: boolean): LayoutSizing {
  if (!node) return 'FIXED'
  if (node.layoutMode === 'VERTICAL') return node.primaryAxisSizing
  if (node.layoutMode === 'HORIZONTAL') return node.counterAxisSizing
  if (canNodeHugContents(node) && node.primaryAxisSizing === 'HUG') return 'HUG'
  if (isInAutoLayout && node.layoutAlignSelf === 'STRETCH') return 'FILL'
  return 'FIXED'
}

export function sizingOptionsForNode(
  node: SceneNode | null,
  isInAutoLayout: boolean,
  labels: Partial<Record<LayoutSizing, string>> = {}
): { value: LayoutSizing; label: string }[] {
  const isFlex = node?.layoutMode === 'HORIZONTAL' || node?.layoutMode === 'VERTICAL'
  const options: { value: LayoutSizing; label: string }[] = [
    { value: 'FIXED', label: labels.FIXED ?? 'Fixed' }
  ]
  if (isFlex || canNodeHugContents(node)) options.push({ value: 'HUG', label: labels.HUG ?? 'Hug' })
  if (isInAutoLayout || isFlex) options.push({ value: 'FILL', label: labels.FILL ?? 'Fill' })
  return options
}

export function createLayoutSizingState(
  editor: Editor,
  node: SceneNode | null,
  panels: LayoutPanelStrings
) {
  const isInAutoLayout = useMemo(() => {
    if (!node?.parentId) return false
    const parent = editor.getNode(node.parentId)
    return parent ? parent.layoutMode !== 'NONE' : false
  }, [editor, node])

  const isGrid = useMemo(() => node?.layoutMode === 'GRID', [node])
  const isFlex = useMemo(
    () => node?.layoutMode === 'HORIZONTAL' || node?.layoutMode === 'VERTICAL',
    [node]
  )
  const widthSizing = useMemo(
    () => widthSizingForNode(node, isInAutoLayout),
    [node, isInAutoLayout]
  )
  const heightSizing = useMemo(
    () => heightSizingForNode(node, isInAutoLayout),
    [node, isInAutoLayout]
  )
  const widthSizingOptions = useMemo(
    () =>
      sizingOptionsForNode(node, isInAutoLayout, {
        FIXED: panels.sizingFixed,
        HUG: panels.sizingHug,
        FILL: panels.sizingFill
      }),
    [node, isInAutoLayout, panels.sizingFixed, panels.sizingHug, panels.sizingFill]
  )
  const heightSizingOptions = widthSizingOptions

  return {
    isInAutoLayout,
    isGrid,
    isFlex,
    widthSizing,
    heightSizing,
    widthSizingOptions,
    heightSizingOptions
  }
}
