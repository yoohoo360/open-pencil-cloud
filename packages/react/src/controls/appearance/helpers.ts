import type { Editor } from '@open-pencil/core/editor'
import type { BlendMode, SceneNode } from '@open-pencil/scene-graph'

import type { CornerGeometryKey } from '#react/controls/appearance/types'
import { MIXED, type MixedValue } from '#react/controls/node-props/use'

const CORNER_RADIUS_TYPES = new Set([
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'FRAME',
  'COMPONENT',
  'INSTANCE'
])

type AppearanceStateOptions = {
  node: SceneNode | null
  nodes: SceneNode[]
  isMulti: boolean
  merged: <K extends keyof SceneNode>(key: K) => MixedValue<SceneNode[K]>
}

type AppearanceActionOptions = AppearanceStateOptions & {
  editor: Editor
}

function hasUnequalCorners(node: SceneNode) {
  return !(
    node.topLeftRadius === node.topRightRadius &&
    node.topLeftRadius === node.bottomRightRadius &&
    node.topLeftRadius === node.bottomLeftRadius
  )
}

type AppearanceState = {
  hasCornerRadius: boolean
  independentCorners: MixedValue<boolean>
  showIndependentCorners: boolean
  cornerRadiusValue: MixedValue<number>
  cornerSmoothingPercent: MixedValue<number>
  opacityPercent: MixedValue<number>
  blendModeValue: MixedValue<BlendMode>
  visibilityState: 'visible' | 'hidden' | 'mixed'
}

export function createAppearanceState({ node, nodes, isMulti, merged }: AppearanceStateOptions): AppearanceState {
  const hasCornerRadius = isMulti
    ? nodes.every((n) => CORNER_RADIUS_TYPES.has(n.type))
    : node
      ? CORNER_RADIUS_TYPES.has(node.type)
      : false

  const independentCorners: MixedValue<boolean> = isMulti
    ? (merged('independentCorners') as MixedValue<boolean>)
    : (node?.independentCorners ?? false)

  const showIndependentCorners = isMulti
    ? false
    : node
      ? node.independentCorners || hasUnequalCorners(node)
      : false

  const cornerRadiusValue: MixedValue<number> = isMulti
    ? (merged('cornerRadius') as MixedValue<number>)
    : (node?.cornerRadius ?? 0)

  const cornerSmoothingValue = merged('cornerSmoothing')
  const cornerSmoothingPercent: MixedValue<number> =
    cornerSmoothingValue === MIXED
      ? MIXED
      : Math.round(Math.max(0, Math.min(cornerSmoothingValue as number, 1)) * 100)

  const opacityValue = merged('opacity')
  const opacityPercent: MixedValue<number> =
    opacityValue === MIXED ? MIXED : Math.round((opacityValue as number) * 100)

  const blendModeMerged = merged('blendMode')
  const blendModeValue: MixedValue<BlendMode> =
    blendModeMerged === MIXED ? MIXED : (blendModeMerged as BlendMode)

  const visibleMerged = merged('visible')
  const visibilityState: 'visible' | 'hidden' | 'mixed' =
    visibleMerged === MIXED ? 'mixed' : visibleMerged ? 'visible' : 'hidden'

  return {
    hasCornerRadius,
    independentCorners,
    showIndependentCorners,
    cornerRadiusValue,
    cornerSmoothingPercent,
    opacityPercent,
    blendModeValue,
    visibilityState
  }
}

export function createAppearanceActions({ editor, node, nodes, isMulti }: AppearanceActionOptions) {
  const previousCornerValues = new Map<CornerGeometryKey, Map<string, number>>()

  function setBlendMode(value: BlendMode) {
    const selected = node
    const targets = isMulti ? [...nodes] : []
    if (!isMulti && selected) targets.push(selected)
    const changed = targets.filter((target) => target.blendMode !== value)
    if (changed.length === 0) return

    editor.undo.runBatch('Change blend mode', () => {
      for (const target of changed) {
        editor.updateNodeWithUndo(target.id, { blendMode: value }, 'Change blend mode')
      }
    })
  }

  function toggleVisibility() {
    if (isMulti) {
      const liveNodes = nodes
        .map((n) => editor.getNode(n.id))
        .filter((n): n is SceneNode => n != null)
      if (liveNodes.length === 0) return
      const allVisible = liveNodes.every((n) => n.visible)
      editor.undo.runBatch('Toggle visibility', () => {
        for (const n of liveNodes) {
          editor.updateNodeWithUndo(n.id, { visible: !allVisible }, 'Toggle visibility')
        }
      })
      return
    }

    const selected = node
    if (!selected) return
    const liveNode = editor.getNode(selected.id)
    if (!liveNode) return
    editor.updateNodeWithUndo(liveNode.id, { visible: !liveNode.visible }, 'Toggle visibility')
  }

  function toggleIndependentCorners() {
    const selected = node
    const targets = isMulti ? [...nodes] : []
    if (!isMulti && selected) targets.push(selected)
    if (targets.length === 0) return
    const makeIndependent = !targets.every(
      (target) => target.independentCorners || hasUnequalCorners(target)
    )

    editor.undo.runBatch(
      makeIndependent ? 'Independent corner radii' : 'Uniform corner radius',
      () => {
        for (const target of targets) {
          if (makeIndependent) {
            if (target.independentCorners) continue
            editor.updateNodeWithUndo(
              target.id,
              {
                independentCorners: true,
                topLeftRadius: target.cornerRadius,
                topRightRadius: target.cornerRadius,
                bottomRightRadius: target.cornerRadius,
                bottomLeftRadius: target.cornerRadius
              } as Partial<SceneNode>,
              'Independent corner radii'
            )
          } else {
            const uniform = target.topLeftRadius
            editor.updateNodeWithUndo(
              target.id,
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
          }
        }
      }
    )
  }

  function cornerTargets() {
    if (isMulti) return nodes
    return node ? [node] : []
  }

  function updateCornerProp(key: CornerGeometryKey, value: number) {
    let snapshots = previousCornerValues.get(key)
    if (!snapshots) {
      snapshots = new Map()
      previousCornerValues.set(key, snapshots)
    }
    const normalized = key === 'cornerSmoothing' ? Math.max(0, Math.min(value, 1)) : value
    for (const target of cornerTargets()) {
      if (!snapshots.has(target.id)) snapshots.set(target.id, target[key])
      editor.updateNode(target.id, { [key]: normalized })
    }
  }

  function commitCornerProp(key: CornerGeometryKey, _value: number, previous: number) {
    const targets = cornerTargets()
    const snapshots = previousCornerValues.get(key)
    const commit = () => {
      for (const target of targets) {
        editor.commitNodeUpdate(
          target.id,
          { [key]: snapshots?.get(target.id) ?? previous } as Partial<SceneNode>,
          `Change ${key}`
        )
      }
    }
    if (targets.length > 1) editor.undo.runBatch(`Change ${key}`, commit)
    else commit()
    previousCornerValues.delete(key)
  }

  return {
    setBlendMode,
    toggleVisibility,
    toggleIndependentCorners,
    updateCornerProp,
    commitCornerProp
  }
}
