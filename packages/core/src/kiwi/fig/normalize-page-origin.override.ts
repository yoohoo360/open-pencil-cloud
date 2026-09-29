import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

interface PageChildPoint {
  id: string
  x: number
  y: number
}

function finiteSize(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Among Canvas children, pick the topmost element (smallest `y`; ties break by
 * leftmost `x`) and use that child's top-left as the page origin.
 */
export function findTopmostChildOrigin(
  points: PageChildPoint[]
): { minX: number; minY: number } | null {
  if (points.length === 0) return null
  let start = points[0]
  for (let i = 1; i < points.length; i++) {
    const candidate = points[i]
    if (candidate.y < start.y || (candidate.y === start.y && candidate.x < start.x)) {
      start = candidate
    }
  }
  return { minX: start.x, minY: start.y }
}

/** @deprecated Use {@link findTopmostChildOrigin}. */
export const findNonOutlierTopLeftOrigin = findTopmostChildOrigin
/** @deprecated Use {@link findTopmostChildOrigin}. */
export const findDensestClusterOrigin = findTopmostChildOrigin

function collectChildPoints(
  graph: SceneGraph,
  pageId: string
): { points: PageChildPoint[]; children: ReturnType<SceneGraph['getChildren']> } {
  const children = graph.getChildren(pageId)
  const points: PageChildPoint[] = []
  for (const child of children) {
    const { x, y } = child
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    points.push({ id: child.id, x, y })
  }
  return { points, children }
}

/**
 * Keep export from reusing the pre-correction kiwi matrix: mark x/y edited via
 * updateNode, and rewrite rawTransform translation so raw-matrix export paths
 * also emit the corrected top-left.
 */
function commitCorrectedPosition(graph: SceneGraph, node: SceneNode, x: number, y: number): void {
  // Break shared `source` / `fig` refs from shallow export clones.
  const prevFig = node.source.fig
  node.source = {
    ...node.source,
    editedFields: [...node.source.editedFields],
    fig: {
      ...prevFig,
      rawTransform: prevFig.rawTransform ? { ...prevFig.rawTransform } : null,
      rawSize: prevFig.rawSize ? { ...prevFig.rawSize } : null
    }
  }
  graph.updateNode(node.id, { x, y })

  const raw = node.source.fig.rawTransform
  if (!raw) return
  const width = finiteSize(node.width)
  const height = finiteSize(node.height)
  const centerX = width / 2
  const centerY = height / 2
  node.source.fig.rawTransform = {
    ...raw,
    m02: x + centerX - raw.m00 * centerX - raw.m01 * centerY,
    m12: y + centerY - raw.m10 * centerX - raw.m11 * centerY
  }
}

/**
 * Directly update graph `x` / `y` on a CANVAS and its direct children only.
 * Origin = top-left of the topmost Canvas child. Does not touch changeMap.
 */
export function normalizePageOrigin(graph: SceneGraph, pageId: string): boolean {
  const page = graph.getNode(pageId)
  if (!page || page.type !== 'CANVAS') return false

  const { points, children } = collectChildPoints(graph, pageId)
  if (points.length === 0) {
    graph.runSilentMutations(() => {
      commitCorrectedPosition(graph, page, 0, 0)
    })
    return true
  }

  const origin = findTopmostChildOrigin(points)
  if (!origin) return false
  const dx = -origin.minX
  const dy = -origin.minY

  // Always commit (even when already at origin) so save rewrites rawTransform /
  // editedFields and never keeps the pre-correction kiwi matrix.
  graph.runSilentMutations(() => {
    commitCorrectedPosition(graph, page, 0, 0)
    for (const child of children) {
      if (!Number.isFinite(child.x) || !Number.isFinite(child.y)) continue
      commitCorrectedPosition(graph, child, child.x + dx, child.y + dy)
    }
  })
  return true
}

/**
 * Correct every CANVAS already present on the graph (direct child `x`/`y` only).
 */
export function normalizeImportedPageOrigins(graph: SceneGraph): number {
  let shifted = 0
  for (const node of graph.getAllNodes()) {
    if (node.type !== 'CANVAS') continue
    if (normalizePageOrigin(graph, node.id)) shifted++
  }
  return shifted
}
