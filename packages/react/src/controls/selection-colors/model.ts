import type { BindingTarget } from '#react/controls/binding/types'

import { colorToHex } from '@open-pencil/core/color'
import type { Editor } from '@open-pencil/core/editor'
import type {
  Effect,
  Fill,
  SceneGraph,
  SceneNode,
  Stroke,
  StyleRun
} from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

export type SelectionColorOccurrence =
  | { type: 'fill'; nodeId: string; index: number }
  | { type: 'stroke'; nodeId: string; index: number }
  | { type: 'effect'; nodeId: string; index: number }
  | { type: 'fill-stop'; nodeId: string; fillIndex: number; stopIndex: number }
  | { type: 'style-run-fill'; nodeId: string; runIndex: number; fillIndex: number }

export interface SelectionColorGroup {
  key: string
  color: Color
  opacity: number
  occurrences: SelectionColorOccurrence[]
}

export function selectionColorKey(color: Color, opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity))
  return `${colorToHex(color).toLowerCase()}:${Math.round(clamped * 100)}`
}

export function selectionColorBindingTargets(
  occurrences: readonly SelectionColorOccurrence[]
): BindingTarget[] {
  const targets: BindingTarget[] = []
  for (const occurrence of occurrences) {
    if (occurrence.type === 'fill') {
      targets.push({ nodeId: occurrence.nodeId, path: `fills/${occurrence.index}/color` })
    } else if (occurrence.type === 'stroke') {
      targets.push({ nodeId: occurrence.nodeId, path: `strokes/${occurrence.index}/color` })
    }
  }
  return targets
}

export function collectSubtreeNodes(graph: SceneGraph, selectedIds: Iterable<string>): SceneNode[] {
  const nodes: SceneNode[] = []
  const seen = new Set<string>()

  function visit(id: string) {
    if (seen.has(id)) return
    seen.add(id)
    const node = graph.getNode(id)
    if (!node || node.type === 'CANVAS' || node.internalOnly) return
    nodes.push(node)
    for (const childId of node.childIds) visit(childId)
  }

  for (const id of selectedIds) visit(id)
  return nodes
}

function addOccurrence(
  groups: Map<string, SelectionColorGroup>,
  color: Color,
  opacity: number,
  occurrence: SelectionColorOccurrence
) {
  const key = selectionColorKey(color, opacity)
  const existing = groups.get(key)
  if (existing) {
    existing.occurrences.push(occurrence)
    return
  }
  groups.set(key, {
    key,
    color: { r: color.r, g: color.g, b: color.b, a: color.a },
    opacity,
    occurrences: [occurrence]
  })
}

function collectFillColors(node: SceneNode, groups: Map<string, SelectionColorGroup>) {
  node.fills.forEach((fill, index) => {
    if (fill.type === 'SOLID') {
      addOccurrence(groups, fill.color, fill.opacity, { type: 'fill', nodeId: node.id, index })
    }
    fill.gradientStops?.forEach((stop, stopIndex) => {
      addOccurrence(groups, stop.color, stop.color.a, {
        type: 'fill-stop',
        nodeId: node.id,
        fillIndex: index,
        stopIndex
      })
    })
  })
}

function collectStrokeColors(node: SceneNode, groups: Map<string, SelectionColorGroup>) {
  node.strokes.forEach((stroke, index) => {
    addOccurrence(groups, stroke.color, stroke.opacity, {
      type: 'stroke',
      nodeId: node.id,
      index
    })
  })
}

function collectEffectColors(node: SceneNode, groups: Map<string, SelectionColorGroup>) {
  node.effects.forEach((effect, index) => {
    if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') return
    addOccurrence(groups, effect.color, effect.color.a, {
      type: 'effect',
      nodeId: node.id,
      index
    })
  })
}

function collectStyleRunColors(node: SceneNode, groups: Map<string, SelectionColorGroup>) {
  node.styleRuns.forEach((run, runIndex) => {
    run.style.fills?.forEach((fill, fillIndex) => {
      if (fill.type !== 'SOLID') return
      addOccurrence(groups, fill.color, fill.opacity, {
        type: 'style-run-fill',
        nodeId: node.id,
        runIndex,
        fillIndex
      })
    })
  })
}

export function collectSelectionColors(
  graph: SceneGraph,
  selectedIds: Iterable<string>
): SelectionColorGroup[] {
  const groups = new Map<string, SelectionColorGroup>()
  for (const node of collectSubtreeNodes(graph, selectedIds)) {
    collectFillColors(node, groups)
    collectStrokeColors(node, groups)
    collectEffectColors(node, groups)
    collectStyleRunColors(node, groups)
  }
  return [...groups.values()]
}

export function shouldShowSelectionColors(
  selectedIds: Iterable<string>,
  groups: readonly SelectionColorGroup[]
): boolean {
  if (groups.length === 0) return false
  const ids = selectedIds instanceof Set ? selectedIds : new Set(selectedIds)
  if (ids.size > 1) return true
  const rootId = [...ids][0]
  if (!rootId) return false
  return groups.some((group) =>
    group.occurrences.some((occurrence) => occurrence.nodeId !== rootId)
  )
}

function withRgb(base: Color, next: Color): Color {
  return { r: next.r, g: next.g, b: next.b, a: base.a }
}

function matchesKey(color: Color, opacity: number, key: string): boolean {
  return selectionColorKey(color, opacity) === key
}

function replaceFill(fill: Fill, fromKey: string, color?: Color, opacity?: number): Fill {
  let next = fill
  if (fill.type === 'SOLID' && matchesKey(fill.color, fill.opacity, fromKey)) {
    next = {
      ...next,
      color: color ? withRgb(fill.color, color) : next.color,
      opacity: opacity ?? next.opacity
    }
  }
  if (!fill.gradientStops) return next
  let stopsChanged = false
  const gradientStops = fill.gradientStops.map((stop) => {
    if (!matchesKey(stop.color, stop.color.a, fromKey)) return stop
    stopsChanged = true
    const nextColor = color ? withRgb(stop.color, color) : { ...stop.color }
    if (opacity !== undefined) nextColor.a = opacity
    return { ...stop, color: nextColor }
  })
  return stopsChanged ? { ...next, gradientStops } : next
}

function replaceStroke(stroke: Stroke, fromKey: string, color?: Color, opacity?: number): Stroke {
  if (!matchesKey(stroke.color, stroke.opacity, fromKey)) return stroke
  return {
    ...stroke,
    color: color ? withRgb(stroke.color, color) : stroke.color,
    opacity: opacity ?? stroke.opacity
  }
}

function replaceEffect(effect: Effect, fromKey: string, color?: Color, opacity?: number): Effect {
  if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') return effect
  if (!matchesKey(effect.color, effect.color.a, fromKey)) return effect
  const nextColor = color ? withRgb(effect.color, color) : { ...effect.color }
  if (opacity !== undefined) nextColor.a = opacity
  return { ...effect, color: nextColor }
}

function replaceStyleRun(
  run: StyleRun,
  fromKey: string,
  color?: Color,
  opacity?: number
): StyleRun {
  if (!run.style.fills) return run
  let fillsChanged = false
  const fills = run.style.fills.map((fill) => {
    const next = replaceFill(fill, fromKey, color, opacity)
    if (next !== fill) fillsChanged = true
    return next
  })
  if (!fillsChanged) return run
  return { ...run, style: { ...run.style, fills } }
}

function arraysEqual<T>(left: T[], right: T[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

export function replaceColorsOnNode(
  node: SceneNode,
  fromKey: string,
  change: { color?: Color; opacity?: number }
): Partial<SceneNode> | null {
  const color = change.color
  const opacity = change.opacity
  const patch: Partial<SceneNode> = {}

  const fills = node.fills.map((fill) => replaceFill(fill, fromKey, color, opacity))
  if (!arraysEqual(fills, node.fills)) patch.fills = fills

  const strokes = node.strokes.map((stroke) => replaceStroke(stroke, fromKey, color, opacity))
  if (!arraysEqual(strokes, node.strokes)) patch.strokes = strokes

  const effects = node.effects.map((effect) => replaceEffect(effect, fromKey, color, opacity))
  if (!arraysEqual(effects, node.effects)) patch.effects = effects

  const styleRuns = node.styleRuns.map((run) => replaceStyleRun(run, fromKey, color, opacity))
  if (!arraysEqual(styleRuns, node.styleRuns)) patch.styleRuns = styleRuns

  return Object.keys(patch).length > 0 ? patch : null
}

export function replaceSelectionColor(
  editor: Editor,
  selectedIds: Iterable<string>,
  fromKey: string,
  change: { color?: Color; opacity?: number }
): void {
  const nodes = collectSubtreeNodes(editor.graph, selectedIds)
  editor.undo.runBatch('Change selection color', () => {
    for (const node of nodes) {
      const patch = replaceColorsOnNode(node, fromKey, change)
      if (patch) editor.updateNodeWithUndo(node.id, patch, 'Change selection color')
    }
  })
}
