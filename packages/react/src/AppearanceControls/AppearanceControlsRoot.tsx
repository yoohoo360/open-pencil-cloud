import { useMemo, type ReactNode } from 'react'

import { useEditor } from '../context/editorContext'
import { MIXED, type MixedValue } from '../controls/useNodeProps'
import { useSceneSnapshot } from '../store/useEditorStore'

import type { SceneNode } from '@open-pencil/core'

const CORNER_RADIUS_TYPES = new Set([
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'FRAME',
  'COMPONENT',
  'INSTANCE'
])

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

export interface AppearanceControlsRootProps {
  children: (ctx: {
    node: SceneNode | null
    isMulti: boolean
    active: boolean
    hasCornerRadius: boolean
    independentCorners: boolean | typeof MIXED
    cornerRadiusValue: number | typeof MIXED
    opacityPercent: number | typeof MIXED
    visibilityState: 'visible' | 'hidden' | 'mixed'
    updateProp: (key: string, value: number | string) => void
    commitProp: (key: string, value: number | string, previous: number | string) => void
    toggleVisibility: () => void
    toggleIndependentCorners: () => void
    updateCornerProp: (key: string, value: number) => void
    commitCornerProp: (key: string, value: number, previous: number) => void
  }) => ReactNode
}

export function AppearanceControlsRoot({ children }: AppearanceControlsRootProps) {
  const editor = useEditor()

  const nodes = useSceneSnapshot((e) => e.getSelectedNodes())
  const node = useSceneSnapshot<SceneNode | null>((e) => e.getSelectedNode() ?? null)

  const isMulti = nodes.length > 1
  const active = nodes.length > 0

  const hasCornerRadius = useMemo(() => {
    if (isMulti) return nodes.every((n) => CORNER_RADIUS_TYPES.has(n.type))
    return node ? CORNER_RADIUS_TYPES.has(node.type) : false
  }, [nodes, node, isMulti])

  const independentCorners = useMemo<boolean | typeof MIXED>(() => {
    if (isMulti) return mergedProp(nodes, 'independentCorners')
    return node?.independentCorners ?? false
  }, [nodes, node, isMulti])

  const cornerRadiusValue = useMemo<number | typeof MIXED>(() => {
    if (isMulti) return mergedProp(nodes, 'cornerRadius')
    return node?.cornerRadius ?? 0
  }, [nodes, node, isMulti])

  const opacityPercent = useMemo<number | typeof MIXED>(() => {
    const v = mergedProp(nodes, 'opacity')
    return v === MIXED ? MIXED : Math.round((v as number) * 100)
  }, [nodes])

  const visibilityState = useMemo<'visible' | 'hidden' | 'mixed'>(() => {
    const v = mergedProp(nodes, 'visible')
    if (v === MIXED) return 'mixed'
    return v ? 'visible' : 'hidden'
  }, [nodes])

  function updateProp(key: string, value: number | string) {
    if (isMulti) {
      for (const n of nodes) editor.updateNode(n.id, { [key]: value })
    } else if (node) {
      editor.updateNode(node.id, { [key]: value })
    }
  }

  function commitProp(key: string, _value: number | string, previous: number | string) {
    if (isMulti) {
      for (const n of nodes) {
        editor.commitNodeUpdate(n.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
      }
    } else if (node) {
      editor.commitNodeUpdate(node.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
    }
  }

  function toggleVisibility() {
    if (isMulti) {
      const liveNodes = nodes
        .map((n) => editor.getNode(n.id))
        .filter((n): n is SceneNode => n != null)
      if (liveNodes.length === 0) return
      const allVisible = liveNodes.every((n) => n.visible)
      editor.undo.beginBatch('Toggle visibility')
      for (const n of liveNodes) {
        editor.updateNodeWithUndo(n.id, { visible: !allVisible }, 'Toggle visibility')
      }
      editor.undo.commitBatch()
      return
    }
    if (!node) return
    const liveNode = editor.getNode(node.id)
    if (!liveNode) return
    editor.updateNodeWithUndo(liveNode.id, { visible: !liveNode.visible }, 'Toggle visibility')
  }

  function toggleIndependentCorners() {
    const targets = isMulti ? nodes : node ? [node] : []
    for (const n of targets) {
      if (n.independentCorners) {
        const uniform = n.topLeftRadius
        editor.updateNodeWithUndo(
          n.id,
          {
            independentCorners: false,
            cornerRadius: uniform,
            topLeftRadius: uniform,
            topRightRadius: uniform,
            bottomRightRadius: uniform,
            bottomLeftRadius: uniform
          } as Partial<SceneNode>,
          'Uniform corner radius'
        )
      } else {
        editor.updateNodeWithUndo(
          n.id,
          {
            independentCorners: true,
            topLeftRadius: n.cornerRadius,
            topRightRadius: n.cornerRadius,
            bottomRightRadius: n.cornerRadius,
            bottomLeftRadius: n.cornerRadius
          } as Partial<SceneNode>,
          'Independent corner radii'
        )
      }
    }
  }

  function updateCornerProp(key: string, value: number) {
    if (isMulti) {
      for (const n of nodes) editor.updateNode(n.id, { [key]: value })
    } else if (node) {
      editor.updateNode(node.id, { [key]: value })
    }
  }

  function commitCornerProp(key: string, _value: number, previous: number) {
    if (isMulti) {
      for (const n of nodes) {
        editor.commitNodeUpdate(n.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
      }
    } else if (node) {
      editor.commitNodeUpdate(node.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
    }
  }

  return (
    <>
      {children({
        node,
        isMulti,
        active,
        hasCornerRadius,
        independentCorners,
        cornerRadiusValue,
        opacityPercent,
        visibilityState,
        updateProp,
        commitProp,
        toggleVisibility,
        toggleIndependentCorners,
        updateCornerProp,
        commitCornerProp
      })}
    </>
  )
}

export default AppearanceControlsRoot
