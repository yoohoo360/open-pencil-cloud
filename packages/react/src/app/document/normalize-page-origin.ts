import type { SceneGraph } from '@open-pencil/scene-graph'

/**
 * For every CANVAS (page), shift its direct children so the leftmost / topmost
 * node lands at (0, 0). Siblings move together.
 */
export function normalizeImportedPageOrigins(graph: SceneGraph): void {
  for (const page of graph.getPages(true)) {
    if (page.internalOnly) continue
    if (page.type !== 'CANVAS') continue
    const children = graph.getChildren(page.id)
    if (children.length === 0) continue

    let minX = Infinity
    let minY = Infinity

    for (const child of children) {
      const { x, y } = child
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) continue
    if (minX === 0 && minY === 0) continue

    const dx = -minX
    const dy = -minY
    for (const child of children) {
      graph.updateNode(child.id, {
        x: Number.isFinite(child.x) ? child.x + dx : 0,
        y: Number.isFinite(child.y) ? child.y + dy : 0
      })
    }
  }
}
