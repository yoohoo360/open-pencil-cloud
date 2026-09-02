import type { Vector } from './primitives'
import type { Stroke, StrokeCap, VectorNetwork } from './types'

export type ArrowCapKind = 'ARROW_LINES' | 'ARROW_EQUILATERAL'

export interface ArrowEndpoint {
  x: number
  y: number
  /** Direction the arrow points, in radians, away from the path. */
  angle: number
  cap: ArrowCapKind
}

export interface ArrowWing {
  from: Vector
  to: Vector
}

/** Arrow head side length relative to stroke weight, tuned to match Figma. */
const ARROW_SIDE_PER_WEIGHT = 4
const WING_SWEEP = Math.PI / 6

export function isArrowCap(cap: string | undefined): cap is ArrowCapKind {
  return cap === 'ARROW_LINES' || cap === 'ARROW_EQUILATERAL'
}

/**
 * Worst-case reach of an arrow head past the path: a head's base corners sit
 * one full head side from the tip, and line-arrow wings are stroked at the
 * shaft weight on top of that. Used to widen visual bounds and render margins
 * so heads are not cropped by caches, exports, or culling. Vertex-level caps
 * in the network count even when no stroke or node cap is an arrow.
 */
export function arrowCapOverflow(
  strokes?: Stroke[],
  fallbackCap?: StrokeCap,
  network?: VectorNetwork | null
): number {
  const networkHasArrow = network?.vertices.some((vertex) => isArrowCap(vertex.strokeCap)) ?? false
  let overflow = 0
  for (const stroke of strokes ?? []) {
    if (!stroke.visible) continue
    if (networkHasArrow || isArrowCap(stroke.cap ?? fallbackCap)) {
      overflow = Math.max(overflow, (ARROW_SIDE_PER_WEIGHT + 0.5) * stroke.weight)
    }
  }
  return overflow
}

/**
 * Finds the open path ends that should carry an arrow head: vertices used by
 * exactly one segment, with a per-vertex cap override falling back to the
 * stroke cap. The returned angle points away from the path, following the
 * terminal bezier tangent when the segment is curved.
 */
export function collectArrowEndpoints(
  network: VectorNetwork,
  fallbackCap: StrokeCap
): ArrowEndpoint[] {
  const degrees = Array.from({ length: network.vertices.length }, () => 0)
  for (const segment of network.segments) {
    degrees[segment.start]++
    degrees[segment.end]++
  }

  const endpoints: ArrowEndpoint[] = []
  for (const segment of network.segments) {
    for (const side of ['start', 'end'] as const) {
      const vertexIndex = segment[side]
      if (degrees[vertexIndex] !== 1) continue
      const vertex = network.vertices[vertexIndex]
      const cap = (vertex.strokeCap as StrokeCap | undefined) ?? fallbackCap
      if (!isArrowCap(cap)) continue

      const tangent = side === 'start' ? segment.tangentStart : segment.tangentEnd
      let controlX: number
      let controlY: number
      if (Math.abs(tangent.x) > 0.001 || Math.abs(tangent.y) > 0.001) {
        controlX = vertex.x + tangent.x
        controlY = vertex.y + tangent.y
      } else {
        const other = network.vertices[side === 'start' ? segment.end : segment.start]
        controlX = other.x
        controlY = other.y
      }
      const dx = vertex.x - controlX
      const dy = vertex.y - controlY
      if (dx === 0 && dy === 0) continue
      endpoints.push({ x: vertex.x, y: vertex.y, angle: Math.atan2(dy, dx), cap })
    }
  }
  return endpoints
}

/**
 * Points of a filled equilateral arrow head: tip first, then the two base
 * corners. The tip sits exactly on the endpoint and the head sweeps back
 * along the path.
 */
export function equilateralArrowPoints(
  x: number,
  y: number,
  angle: number,
  weight: number
): [Vector, Vector, Vector] {
  const halfBase = (ARROW_SIDE_PER_WEIGHT / 2) * weight
  const depth = halfBase * Math.sqrt(3)
  const dirX = Math.cos(angle)
  const dirY = Math.sin(angle)
  const perpX = -dirY
  const perpY = dirX
  const baseX = x - depth * dirX
  const baseY = y - depth * dirY
  return [
    { x, y },
    { x: baseX - halfBase * perpX, y: baseY - halfBase * perpY },
    { x: baseX + halfBase * perpX, y: baseY + halfBase * perpY }
  ]
}

/** The two stroked wings of an open (lines-style) arrow head. */
export function arrowLinesSegments(
  x: number,
  y: number,
  angle: number,
  weight: number
): [ArrowWing, ArrowWing] {
  const wingLength = ARROW_SIDE_PER_WEIGHT * weight
  const tip = { x, y }
  const makeWing = (wingAngle: number): ArrowWing => ({
    from: tip,
    to: { x: x + wingLength * Math.cos(wingAngle), y: y + wingLength * Math.sin(wingAngle) }
  })
  return [makeWing(angle + Math.PI - WING_SWEEP), makeWing(angle + Math.PI + WING_SWEEP)]
}

/** Arrow endpoints for a LINE node, whose local geometry runs (0,0) → (width,height). */
export function lineArrowEndpoints(width: number, height: number, cap: StrokeCap): ArrowEndpoint[] {
  if (!isArrowCap(cap)) return []
  if (width === 0 && height === 0) return []
  const angle = Math.atan2(height, width)
  return [
    { x: 0, y: 0, angle: Math.atan2(-height, -width), cap },
    { x: width, y: height, angle, cap }
  ]
}
