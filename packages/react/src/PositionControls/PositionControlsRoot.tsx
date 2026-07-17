import { useRef, type ReactNode } from 'react'

import { useEditor } from '../context/editorContext'
import { MIXED, type MixedValue } from '../controls/useNodeProps'
import { useSceneSnapshot } from '../store/useEditorStore'

import type { SceneNode } from '@open-pencil/core'

function mergedProp<K extends keyof SceneNode>(
  nodes: SceneNode[],
  key: K
): MixedValue<SceneNode[K]> {
  if (nodes.length === 0) return MIXED
  const first = nodes[0][key]
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i][key] !== first) return MIXED
  }
  return first
}

export interface PositionControlsRootProps {
  children: (ctx: {
    active: boolean
    isMulti: boolean
    ids: string[]
    xValue: number | typeof MIXED
    yValue: number | typeof MIXED
    wValue: number | typeof MIXED
    hValue: number | typeof MIXED
    rotationValue: number | typeof MIXED
    mixed: typeof MIXED
    updateProp: (key: string, value: number) => void
    commitProp: (key: string, value: number, previous: number) => void
    align: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void
    flip: (axis: 'horizontal' | 'vertical') => void
    rotate: (degrees: number) => void
  }) => ReactNode
}

export function PositionControlsRoot({ children }: PositionControlsRootProps) {
  const editor = useEditor()
  const nodes = useSceneSnapshot((e) => e.getSelectedNodes())
  const node = useSceneSnapshot<SceneNode | null>((e) => e.getSelectedNode() ?? null)

  const previousValues = useRef(new Map<string, Record<string, number | string>>())

  const isMulti = nodes.length > 1
  const active = nodes.length > 0
  const ids = nodes.map((n) => n.id)

  const xValue = isMulti
    ? mergedProp(nodes, 'x') === MIXED
      ? MIXED
      : (mergedProp(nodes, 'x') as number)
    : Math.round(node?.x ?? 0)

  const yValue = isMulti
    ? mergedProp(nodes, 'y') === MIXED
      ? MIXED
      : (mergedProp(nodes, 'y') as number)
    : Math.round(node?.y ?? 0)

  const wValue = mergedProp(nodes, 'width')
  const hValue = mergedProp(nodes, 'height')
  const rotationValue = isMulti
    ? mergedProp(nodes, 'rotation') === MIXED
      ? MIXED
      : (mergedProp(nodes, 'rotation') as number)
    : Math.round(node?.rotation ?? 0)

  function storePrevious(key: string) {
    for (const n of nodes) {
      let rec = previousValues.current.get(n.id)
      if (!rec) {
        rec = {}
        previousValues.current.set(n.id, rec)
      }
      if (!(key in rec)) {
        rec[key] = n[key as keyof SceneNode] as number | string
      }
    }
  }

  function updateProp(key: string, value: number) {
    if (nodes.length > 1) {
      storePrevious(key)
      for (const n of nodes) editor.updateNode(n.id, { [key]: value })
    } else if (node) {
      editor.updateNode(node.id, { [key]: value })
    }
  }

  function commitProp(key: string, _value: number, previous: number) {
    if (nodes.length > 1) {
      for (const n of nodes) {
        const prev = previousValues.current.get(n.id)?.[key] ?? previous
        editor.commitNodeUpdate(n.id, { [key]: prev } as Partial<SceneNode>, `Change ${key}`)
      }
      previousValues.current.clear()
    } else if (node) {
      editor.commitNodeUpdate(node.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
    }
  }

  function align(axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') {
    editor.alignNodes(ids, axis, pos)
  }

  function flip(axis: 'horizontal' | 'vertical') {
    editor.flipNodes(ids, axis)
  }

  function rotate(degrees: number) {
    editor.rotateNodes(ids, degrees)
  }

  return (
    <>
      {children({
        active,
        isMulti,
        ids,
        xValue,
        yValue,
        wValue,
        hValue,
        rotationValue,
        mixed: MIXED,
        updateProp,
        commitProp,
        align,
        flip,
        rotate
      })}
    </>
  )
}

export default PositionControlsRoot
