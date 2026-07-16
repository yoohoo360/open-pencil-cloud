import { resolveOkHCLForPreview } from '../color-management'
import { copyEffects, copyFill, copyStyleRuns, copyStroke } from '../copy'
import { rgbaToOkHCL } from '../okhcl'

import type { DocumentColorSpace, SceneNode } from '../scene-graph'
import type { EditorContext } from './types'

export type DocumentColorProfileMode = 'assign' | 'convert'

function remapNodeColors(
  node: SceneNode,
  target: DocumentColorSpace,
  mode: DocumentColorProfileMode
): Partial<SceneNode> | null {
  if (mode === 'assign') return null

  const fills = node.fills.map((fill) => {
    const next = copyFill(fill)
    if (fill.type === 'SOLID') {
      const resolved = resolveOkHCLForPreview(rgbaToOkHCL(fill.color), {
        documentColorSpace: target
      }).color
      next.color = resolved
      next.opacity = resolved.a
      return next
    }
    if (fill.gradientStops) {
      next.gradientStops = fill.gradientStops.map((stop) => {
        const resolved = resolveOkHCLForPreview(rgbaToOkHCL(stop.color), {
          documentColorSpace: target
        }).color
        return { ...stop, color: resolved }
      })
    }
    return next
  })

  const strokes = node.strokes.map((stroke) => {
    const next = copyStroke(stroke)
    const resolved = resolveOkHCLForPreview(rgbaToOkHCL(stroke.color), {
      documentColorSpace: target
    }).color
    next.color = resolved
    next.opacity = resolved.a
    return next
  })

  const effects = copyEffects(node.effects).map((effect) => {
    const resolved = resolveOkHCLForPreview(rgbaToOkHCL(effect.color), {
      documentColorSpace: target
    }).color
    return { ...effect, color: resolved }
  })

  const styleRuns = copyStyleRuns(node.styleRuns).map((run) => ({
    ...run,
    style: {
      ...run.style,
      fills: run.style.fills?.map((fill) => {
        const next = copyFill(fill)
        if (fill.type === 'SOLID') {
          const resolved = resolveOkHCLForPreview(rgbaToOkHCL(fill.color), {
            documentColorSpace: target
          }).color
          next.color = resolved
          next.opacity = resolved.a
        }
        return next
      })
    }
  }))

  return { fills, strokes, effects, styleRuns }
}

export function createColorSpaceActions(ctx: EditorContext) {
  function setDocumentColorSpace(
    colorSpace: DocumentColorSpace,
    mode: DocumentColorProfileMode = 'assign'
  ) {
    if (ctx.graph.documentColorSpace === colorSpace) return

    if (mode === 'convert') {
      for (const node of ctx.graph.getAllNodes()) {
        const changes = remapNodeColors(node, colorSpace, mode)
        if (changes) ctx.graph.updateNode(node.id, changes)
      }
    }

    ctx.graph.documentColorSpace = colorSpace
    ctx.requestRender()
  }

  return {
    setDocumentColorSpace
  }
}
