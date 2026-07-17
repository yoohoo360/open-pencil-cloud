import { useState } from 'react'

import { useEditor } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'
import { useI18n } from '../i18n'

import type { SceneNode, LayoutSizing, LayoutAlign, LayoutCounterAlign, GridTrack } from '@open-pencil/core'

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

/**
 * Returns layout-related state and actions for the current selection.
 *
 * Use this hook to build auto-layout and grid panels that need sizing,
 * padding, alignment, and track editing behavior.
 */
export function useLayout() {
  const editor = useEditor()
  const { panels } = useI18n()

  const node = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)
  const layoutDirection: SceneNode['layoutDirection'] = node?.layoutDirection ?? 'AUTO'

  const isInAutoLayout = (() => {
    if (!node?.parentId) return false
    const parent = editor.getNode(node.parentId)
    return parent ? parent.layoutMode !== 'NONE' : false
  })()

  const isGrid = node?.layoutMode === 'GRID'
  const isFlex = node?.layoutMode === 'HORIZONTAL' || node?.layoutMode === 'VERTICAL'

  const widthSizing: LayoutSizing = (() => {
    if (!node) return 'FIXED'
    if (isFlex) return node.layoutMode === 'HORIZONTAL' ? node.primaryAxisSizing : node.counterAxisSizing
    if (isInAutoLayout && node.layoutGrow > 0) return 'FILL'
    return 'FIXED'
  })()

  const heightSizing: LayoutSizing = (() => {
    if (!node) return 'FIXED'
    if (isFlex) return node.layoutMode === 'VERTICAL' ? node.primaryAxisSizing : node.counterAxisSizing
    if (isInAutoLayout && node.layoutAlignSelf === 'STRETCH') return 'FILL'
    return 'FIXED'
  })()

  const widthSizingOptions: { value: LayoutSizing; label: string }[] = [
    { value: 'FIXED', label: panels.sizingFixed }
  ]
  if (isFlex) widthSizingOptions.push({ value: 'HUG', label: panels.sizingHug })
  if (isInAutoLayout || isFlex) widthSizingOptions.push({ value: 'FILL', label: panels.sizingFill })

  const heightSizingOptions: { value: LayoutSizing; label: string }[] = [
    { value: 'FIXED', label: panels.sizingFixed }
  ]
  if (isFlex) heightSizingOptions.push({ value: 'HUG', label: panels.sizingHug })
  if (isInAutoLayout || isFlex) heightSizingOptions.push({ value: 'FILL', label: panels.sizingFill })

  const alignGrid = node?.layoutMode === 'VERTICAL' ? ALIGN_VERTICAL : ALIGN_HORIZONTAL

  const [showIndividualPadding, setShowIndividualPadding] = useState(false)

  const hasUniformPadding = (() => {
    if (!node) return true
    return (
      node.paddingTop === node.paddingRight &&
      node.paddingRight === node.paddingBottom &&
      node.paddingBottom === node.paddingLeft
    )
  })()

  function updateProp(key: string, value: number | string) {
    if (node) editor.updateNode(node.id, { [key]: value })
  }

  function commitProp(key: string, _value: number | string, previous: number | string) {
    if (node)
      editor.commitNodeUpdate(
        node.id,
        { [key]: previous } as Partial<SceneNode>,
        `Change ${key}`
      )
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

  const trackSizingOptions = [
    { value: 'FR' as const, label: panels.sizingFillFr },
    { value: 'FIXED' as const, label: panels.sizingFixedPx },
    { value: 'AUTO' as const, label: panels.auto }
  ]

  return {
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
    trackSizingOptions,
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
  }
}
