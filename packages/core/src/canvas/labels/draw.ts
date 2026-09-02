import type { Canvas } from 'canvaskit-wasm'

import type { SceneNode, SceneGraph } from '@open-pencil/scene-graph'

import { canvasLabelForeground } from '#core/canvas/labels/color'
import type { SkiaRenderer } from '#core/canvas/renderer'
import {
  SECTION_TITLE_HEIGHT,
  SECTION_TITLE_PADDING_X,
  SECTION_TITLE_RADIUS,
  SECTION_TITLE_GAP,
  SECTION_TITLE_FONT_SIZE,
  COMPONENT_LABEL_FONT_SIZE,
  COMPONENT_LABEL_GAP,
  COMPONENT_LABEL_ICON_SIZE,
  COMPONENT_LABEL_ICON_GAP
} from '#core/constants'

export function drawSectionTitles(r: SkiaRenderer, canvas: Canvas, graph: SceneGraph): void {
  const provider = r.fontProvider
  if (!r.sectionTitleFont || !provider) return

  const sections = r.labelCache.getSections(graph, r.worldViewport)
  if (sections.length === 0) return

  for (const { node, absX, absY, nested } of sections) {
    drawSectionTitle(r, canvas, provider, node, graph, absX, absY, nested)
  }
}

function drawSectionTitle(
  r: SkiaRenderer,
  canvas: Canvas,
  provider: NonNullable<SkiaRenderer['fontProvider']>,
  node: SceneNode,
  graph: SceneGraph,
  absX: number,
  absY: number,
  nested: boolean
): void {
  const screenX = absX * r.zoom + r.panX
  const screenY = absY * r.zoom + r.panY
  const screenW = node.width * r.zoom
  const maxPillW = Math.max(screenW, 0)
  if (maxPillW <= 0) return

  const pillColor =
    node.fills.length > 0 && node.fills[0].visible
      ? r.resolveFillColor(node.fills[0], 0, node, graph)
      : { r: 0.37, g: 0.37, b: 0.37, a: 1 }
  const foreground = canvasLabelForeground(pillColor, r.pageColor)
  const textColor = r.ck.Color4f(foreground.r, foreground.g, foreground.b, foreground.a)

  const maxTextW = Math.max(1, maxPillW - SECTION_TITLE_PADDING_X * 2)
  const textMetrics = r.labelParagraphCache.measure(
    r.ck,
    provider,
    node.name,
    SECTION_TITLE_FONT_SIZE,
    maxTextW,
    textColor,
    r.fontGeneration
  )
  const pillW = Math.min(textMetrics.width + SECTION_TITLE_PADDING_X * 2, maxPillW)
  const pillH = SECTION_TITLE_HEIGHT
  const localPillX = 0
  const localPillY = nested ? SECTION_TITLE_GAP : -pillH - SECTION_TITLE_GAP

  canvas.save()
  canvas.translate(screenX, screenY)
  if (node.rotation !== 0) {
    canvas.rotate(node.rotation, 0, 0)
  }

  r.auxFill.setColor(r.ck.Color4f(pillColor.r, pillColor.g, pillColor.b, pillColor.a))
  const pillRect = r.ck.LTRBRect(localPillX, localPillY, localPillX + pillW, localPillY + pillH)
  canvas.drawRRect(r.ck.RRectXY(pillRect, SECTION_TITLE_RADIUS, SECTION_TITLE_RADIUS), r.auxFill)

  r.auxFill.setColor(textColor)
  r.labelParagraphCache.draw(
    r.ck,
    canvas,
    provider,
    node.name,
    SECTION_TITLE_FONT_SIZE,
    maxTextW,
    textColor,
    r.fontGeneration,
    localPillX + SECTION_TITLE_PADDING_X,
    localPillY + (pillH - textMetrics.height) / 2
  )
  canvas.restore()
}

export function drawComponentLabels(r: SkiaRenderer, canvas: Canvas, graph: SceneGraph): void {
  if (!r.componentLabelFont || !r.fontProvider) return

  const components = r.labelCache.getComponents(graph, r.worldViewport)
  if (components.length === 0) return

  const provider = r.fontProvider
  const compColor = r.compColor()
  const iconS = COMPONENT_LABEL_ICON_SIZE

  for (const { node, absX, absY, inside } of components) {
    const screenX = absX * r.zoom + r.panX
    const screenY = absY * r.zoom + r.panY

    const labelX = screenX
    let labelY: number
    if (inside) {
      labelY = screenY + COMPONENT_LABEL_GAP + COMPONENT_LABEL_FONT_SIZE
    } else {
      labelY = screenY - COMPONENT_LABEL_GAP
    }

    const maxTextWidth = node.width * r.zoom - iconS - COMPONENT_LABEL_ICON_GAP
    if (maxTextWidth <= 0) continue

    const iconX = labelX
    const iconY = labelY - COMPONENT_LABEL_FONT_SIZE * 0.75
    const iconCx = iconX + iconS / 2
    const iconCy = iconY + iconS / 2
    const iconR = iconS / 2

    r.auxFill.setColor(compColor)

    if (node.type === 'COMPONENT_SET') {
      const s = iconR * 0.45
      const gap = iconR * 0.2
      const path = new r.ck.PathBuilder()
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1]
      ]) {
        const cx = iconCx + dx * (s + gap)
        const cy = iconCy + dy * (s + gap)
        path.moveTo(cx, cy - s)
        path.lineTo(cx + s, cy)
        path.lineTo(cx, cy + s)
        path.lineTo(cx - s, cy)
        path.close()
      }
      const immutablePath = path.detachAndDelete()
      canvas.drawPath(immutablePath, r.auxFill)
      immutablePath.delete()
    } else {
      const path = new r.ck.PathBuilder()
      path.moveTo(iconCx, iconCy - iconR)
      path.lineTo(iconCx + iconR, iconCy)
      path.lineTo(iconCx, iconCy + iconR)
      path.lineTo(iconCx - iconR, iconCy)
      path.close()
      const immutablePath = path.detachAndDelete()
      canvas.drawPath(immutablePath, r.auxFill)
      immutablePath.delete()
    }

    r.labelParagraphCache.draw(
      r.ck,
      canvas,
      provider,
      node.name,
      COMPONENT_LABEL_FONT_SIZE,
      maxTextWidth,
      compColor,
      r.fontGeneration,
      labelX + iconS + COMPONENT_LABEL_ICON_GAP,
      labelY - COMPONENT_LABEL_FONT_SIZE
    )
  }
}
