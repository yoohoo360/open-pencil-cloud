import type { Editor } from '@open-pencil/core/editor'
import type {
  GridTrack,
  LayoutAlign,
  LayoutCounterAlign,
  LayoutSizing,
  SceneNode
} from '@open-pencil/scene-graph'

export type AlignCell = { primary: LayoutAlign; counter: LayoutCounterAlign }
export type LayoutAxis = 'width' | 'height'
export type SizeLimitProp = 'minWidth' | 'maxWidth' | 'minHeight' | 'maxHeight'
export type GridTrackProp = 'gridTemplateColumns' | 'gridTemplateRows'

type LayoutPanelStrings = {
  sizingFixed: string
  sizingHug: string
  sizingFill: string
}

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

export function createTrackSizingOptions(panels: {
  sizingFillFr: string
  sizingFixedPx: string
  auto: string
}) {
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

export function isNodeInAutoLayout(editor: Editor, node: SceneNode | null): boolean {
  if (!node?.parentId) return false
  const parent = editor.getNode(node.parentId)
  return parent ? parent.layoutMode !== 'NONE' : false
}

export function hasUniformPadding(node: SceneNode | null): boolean {
  if (!node) return true
  return (
    node.paddingTop === node.paddingRight &&
    node.paddingRight === node.paddingBottom &&
    node.paddingBottom === node.paddingLeft
  )
}

export function hasSymmetricPadding(node: SceneNode | null): boolean {
  if (!node) return true
  return node.paddingLeft === node.paddingRight && node.paddingTop === node.paddingBottom
}

export function sizingLabels(panels: LayoutPanelStrings): Partial<Record<LayoutSizing, string>> {
  return {
    FIXED: panels.sizingFixed,
    HUG: panels.sizingHug,
    FILL: panels.sizingFill
  }
}

export function createGridTrackActions(editor: Editor, getNode: () => SceneNode | null) {
  function updateGridTrack(prop: GridTrackProp, index: number, updates: Partial<GridTrack>) {
    const node = getNode()
    if (!node) return
    const tracks = [...node[prop]]
    tracks[index] = { ...tracks[index], ...updates }
    editor.updateNodeWithUndo(node.id, { [prop]: tracks }, 'Change grid track')
  }

  function addTrack(prop: GridTrackProp) {
    const node = getNode()
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { [prop]: [...node[prop], { sizing: 'FR' as const, value: 1 }] },
      'Add grid track'
    )
  }

  function removeTrack(prop: GridTrackProp, index: number) {
    const node = getNode()
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { [prop]: node[prop].filter((_: GridTrack, i: number) => i !== index) },
      'Remove grid track'
    )
  }

  return { updateGridTrack, addTrack, removeTrack }
}

export function createLayoutActions({
  editor,
  getNode,
  isInAutoLayout
}: {
  editor: Editor
  getNode: () => SceneNode | null
  isInAutoLayout: () => boolean
}) {
  function updateProp(key: string, value: number | string) {
    const node = getNode()
    if (node) editor.updateNode(node.id, { [key]: value })
  }

  function updateSizeLimit(prop: SizeLimitProp, value: number) {
    const node = getNode()
    if (!node) return
    editor.updateNode(node.id, { [prop]: value })
  }

  function setSizeLimitToCurrent(prop: SizeLimitProp) {
    const node = getNode()
    if (!node) return
    const value = prop === 'minWidth' || prop === 'maxWidth' ? node.width : node.height
    editor.updateNodeWithUndo(node.id, { [prop]: Math.round(value) }, `Set ${prop}`)
  }

  function commitSizeLimit(prop: SizeLimitProp, _value: number, previous: number) {
    const node = getNode()
    if (!node) return
    editor.commitNodeUpdate(node.id, { [prop]: previous }, `Change ${prop}`)
  }

  function addSizeLimit(prop: SizeLimitProp) {
    const node = getNode()
    if (!node) return
    const fallback = prop === 'minWidth' || prop === 'maxWidth' ? node.width : node.height
    editor.updateNodeWithUndo(node.id, { [prop]: Math.round(fallback) }, `Add ${prop}`)
  }

  function removeSizeLimit(prop: SizeLimitProp) {
    const node = getNode()
    if (!node) return
    editor.updateNodeWithUndo(node.id, { [prop]: null }, `Remove ${prop}`)
  }

  function commitProp(key: string, _value: number | string, previous: number | string) {
    const node = getNode()
    if (node) {
      editor.commitNodeUpdate(
        node.id,
        { [key]: previous } as Partial<SceneNode>,
        `Change ${key}`
      )
    }
  }

  function setAxisSizing(axis: LayoutAxis, sizing: LayoutSizing) {
    const node = getNode()
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      axisSizingPatchForNode(node, axis, sizing, isInAutoLayout()),
      `Set ${axis} sizing`
    )
  }

  function updateAxisSize(axis: LayoutAxis, value: number) {
    const node = getNode()
    if (!node) return
    const sizing =
      axis === 'width'
        ? widthSizingForNode(node, isInAutoLayout())
        : heightSizingForNode(node, isInAutoLayout())
    if (sizing !== 'FIXED') setAxisSizing(axis, 'FIXED')
    editor.updateNode(node.id, { [axis]: value })
  }

  function commitAxisSize(axis: LayoutAxis, _value: number, previous: number) {
    const node = getNode()
    if (node) editor.commitNodeUpdate(node.id, { [axis]: previous }, `Change ${axis}`)
  }

  function setAlignment(primary: LayoutAlign, counter: LayoutCounterAlign) {
    const node = getNode()
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { primaryAxisAlign: primary, counterAxisAlign: counter },
      'Change alignment'
    )
  }

  function setGapAuto(enabled: boolean) {
    const node = getNode()
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { primaryAxisAlign: enabled ? 'SPACE_BETWEEN' : 'MIN' },
      enabled ? 'Set gap to auto' : 'Set gap to fixed'
    )
  }

  function setLayoutDirection(direction: SceneNode['layoutDirection']) {
    const node = getNode()
    if (!node) return
    editor.updateNodeWithUndo(node.id, { layoutDirection: direction }, 'Change layout direction')
  }

  function setHorizontalPadding(value: number) {
    const node = getNode()
    if (!node) return
    editor.updateNode(node.id, { paddingLeft: value, paddingRight: value })
  }

  function commitHorizontalPadding(_value: number, previous: number) {
    const node = getNode()
    if (!node) return
    editor.commitNodeUpdate(
      node.id,
      { paddingLeft: previous, paddingRight: previous } satisfies Partial<SceneNode>,
      'Change horizontal padding'
    )
  }

  function setVerticalPadding(value: number) {
    const node = getNode()
    if (!node) return
    editor.updateNode(node.id, { paddingTop: value, paddingBottom: value })
  }

  function commitVerticalPadding(_value: number, previous: number) {
    const node = getNode()
    if (!node) return
    editor.commitNodeUpdate(
      node.id,
      { paddingTop: previous, paddingBottom: previous } satisfies Partial<SceneNode>,
      'Change vertical padding'
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
    setLayoutDirection,
    setHorizontalPadding,
    commitHorizontalPadding,
    setVerticalPadding,
    commitVerticalPadding
  }
}
