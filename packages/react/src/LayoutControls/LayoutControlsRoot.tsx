import { useMemo, useState, type ReactNode } from 'react'

import { useEditor } from '../context/editorContext'
import { useSceneSnapshot } from '../store/useEditorStore'

import type { GridTrack, LayoutAlign, LayoutCounterAlign, LayoutSizing, SceneNode } from '@open-pencil/core'

type AlignCell = { primary: LayoutAlign; counter: LayoutCounterAlign }

const ALIGN_HORIZONTAL: AlignCell[] = [
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

const ALIGN_VERTICAL: AlignCell[] = [
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

const TRACK_SIZING_OPTIONS = [
  { value: 'FR' as const, label: 'Fr' },
  { value: 'FIXED' as const, label: 'px' },
  { value: 'AUTO' as const, label: 'Auto' }
]

export interface LayoutControlsRootProps {
  children: (ctx: {
    editor: ReturnType<typeof useEditor>
    node: SceneNode | null
    layoutDirection: SceneNode['layoutDirection']
    isInAutoLayout: boolean
    isGrid: boolean
    isFlex: boolean
    widthSizing: LayoutSizing
    heightSizing: LayoutSizing
    widthSizingOptions: { value: LayoutSizing; label: string }[]
    heightSizingOptions: { value: LayoutSizing; label: string }[]
    alignGrid: AlignCell[]
    showIndividualPadding: boolean
    hasUniformPadding: boolean
    trackSizingOptions: typeof TRACK_SIZING_OPTIONS
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
  }) => ReactNode
}

export function LayoutControlsRoot({ children }: LayoutControlsRootProps) {
  const editor = useEditor()
  const node = useSceneSnapshot<SceneNode | null>((e) => e.getSelectedNode() ?? null)
  const [showIndividualPadding, setShowIndividualPadding] = useState(false)

  const layoutDirection = node?.layoutDirection ?? 'AUTO'
  const isFlex =
    node?.layoutMode === 'HORIZONTAL' || node?.layoutMode === 'VERTICAL'
  const isGrid = node?.layoutMode === 'GRID'

  const isInAutoLayout = useMemo(() => {
    if (!node?.parentId) return false
    const parent = editor.getNode(node.parentId)
    return parent ? parent.layoutMode !== 'NONE' : false
  }, [node, editor])

  const widthSizing = useMemo<LayoutSizing>(() => {
    if (!node) return 'FIXED'
    if (isFlex)
      return node.layoutMode === 'HORIZONTAL' ? node.primaryAxisSizing : node.counterAxisSizing
    if (isInAutoLayout && node.layoutGrow > 0) return 'FILL'
    return 'FIXED'
  }, [node, isFlex, isInAutoLayout])

  const heightSizing = useMemo<LayoutSizing>(() => {
    if (!node) return 'FIXED'
    if (isFlex) return node.layoutMode === 'VERTICAL' ? node.primaryAxisSizing : node.counterAxisSizing
    if (isInAutoLayout && node.layoutAlignSelf === 'STRETCH') return 'FILL'
    return 'FIXED'
  }, [node, isFlex, isInAutoLayout])

  const widthSizingOptions = useMemo(() => {
    const options: { value: LayoutSizing; label: string }[] = [{ value: 'FIXED', label: 'Fixed' }]
    if (isFlex) options.push({ value: 'HUG', label: 'Hug' })
    if (isInAutoLayout || isFlex) options.push({ value: 'FILL', label: 'Fill' })
    return options
  }, [isFlex, isInAutoLayout])

  const heightSizingOptions = useMemo(() => {
    const options: { value: LayoutSizing; label: string }[] = [{ value: 'FIXED', label: 'Fixed' }]
    if (isFlex) options.push({ value: 'HUG', label: 'Hug' })
    if (isInAutoLayout || isFlex) options.push({ value: 'FILL', label: 'Fill' })
    return options
  }, [isFlex, isInAutoLayout])

  const alignGrid = node?.layoutMode === 'VERTICAL' ? ALIGN_VERTICAL : ALIGN_HORIZONTAL

  const hasUniformPadding = useMemo(() => {
    if (!node) return true
    return (
      node.paddingTop === node.paddingRight &&
      node.paddingRight === node.paddingBottom &&
      node.paddingBottom === node.paddingLeft
    )
  }, [node])

  function updateProp(key: string, value: number | string) {
    if (node) editor.updateNode(node.id, { [key]: value })
  }

  function commitProp(key: string, _value: number | string, previous: number | string) {
    if (node)
      editor.commitNodeUpdate(node.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
  }

  function setWidthSizing(sizing: LayoutSizing) {
    if (!node) return
    if (isFlex) {
      const key = node.layoutMode === 'HORIZONTAL' ? 'primaryAxisSizing' : 'counterAxisSizing'
      updateProp(key, sizing)
    } else if (isInAutoLayout) {
      updateProp('layoutGrow', sizing === 'FILL' ? 1 : 0)
    }
  }

  function setHeightSizing(sizing: LayoutSizing) {
    if (!node) return
    if (isFlex) {
      const key = node.layoutMode === 'VERTICAL' ? 'primaryAxisSizing' : 'counterAxisSizing'
      updateProp(key, sizing)
    } else if (isInAutoLayout) {
      updateProp('layoutAlignSelf', sizing === 'FILL' ? 'STRETCH' : 'AUTO')
    }
  }

  function setUniformPadding(v: number) {
    if (!node) return
    editor.updateNode(node.id, {
      paddingTop: v,
      paddingRight: v,
      paddingBottom: v,
      paddingLeft: v
    })
  }

  function commitUniformPadding(_value: number, previous: number) {
    if (!node) return
    editor.commitNodeUpdate(
      node.id,
      {
        paddingTop: previous,
        paddingRight: previous,
        paddingBottom: previous,
        paddingLeft: previous
      } as unknown as Partial<SceneNode>,
      'Change padding'
    )
  }

  function setAlignment(primary: LayoutAlign, counter: LayoutCounterAlign) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { primaryAxisAlign: primary, counterAxisAlign: counter },
      'Change alignment'
    )
  }

  function setLayoutDirection(direction: SceneNode['layoutDirection']) {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { layoutDirection: direction }, 'Change layout direction')
  }

  function updateGridTrack(
    prop: 'gridTemplateColumns' | 'gridTemplateRows',
    index: number,
    updates: Partial<GridTrack>
  ) {
    if (!node) return
    const tracks = [...node[prop]]
    tracks[index] = { ...tracks[index], ...updates }
    editor.updateNodeWithUndo(node.id, { [prop]: tracks }, 'Change grid track')
  }

  function addTrack(prop: 'gridTemplateColumns' | 'gridTemplateRows') {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { [prop]: [...node[prop], { sizing: 'FR' as const, value: 1 }] },
      'Add grid track'
    )
  }

  function removeTrack(prop: 'gridTemplateColumns' | 'gridTemplateRows', index: number) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { [prop]: node[prop].filter((_: GridTrack, i: number) => i !== index) },
      'Remove grid track'
    )
  }

  function trackLabel(track: GridTrack): string {
    if (track.sizing === 'FR') return `${track.value}fr`
    if (track.sizing === 'FIXED') return `${track.value}px`
    return 'Auto'
  }

  function toggleIndividualPadding() {
    setShowIndividualPadding((v) => !v)
  }

  return (
    <>
      {children({
        editor,
        node,
        layoutDirection,
        isInAutoLayout,
        isGrid,
        isFlex,
        widthSizing,
        heightSizing,
        widthSizingOptions,
        heightSizingOptions,
        alignGrid,
        showIndividualPadding,
        hasUniformPadding,
        trackSizingOptions: TRACK_SIZING_OPTIONS,
        updateProp,
        commitProp,
        setWidthSizing,
        setHeightSizing,
        setUniformPadding,
        commitUniformPadding,
        setAlignment,
        setLayoutDirection,
        updateGridTrack,
        addTrack,
        removeTrack,
        trackLabel,
        toggleIndividualPadding
      })}
    </>
  )
}

export default LayoutControlsRoot
