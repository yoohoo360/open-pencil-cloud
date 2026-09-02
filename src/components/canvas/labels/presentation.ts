import { canvasLabelForeground } from '@open-pencil/core/canvas'
import type { Editor } from '@open-pencil/core/editor'
import type { Color, SceneNode } from '@open-pencil/scene-graph'

export interface CanvasLabelPresentation {
  background: Color
  foreground: 'dark' | 'light'
}

const DEFAULT_LABEL_BACKGROUND: Color = { r: 0.37, g: 0.37, b: 0.37, a: 1 }

export function canvasLabelPresentation(
  editor: Editor,
  node: SceneNode | null
): CanvasLabelPresentation {
  const fill = node?.fills[0]
  const background =
    node && fill?.visible
      ? (editor.renderer?.resolveFillColor(fill, 0, node, editor.graph) ?? fill.color)
      : DEFAULT_LABEL_BACKGROUND
  const foreground = canvasLabelForeground(background, editor.state.pageColor)
  return { background, foreground: foreground.r === 0 ? 'dark' : 'light' }
}
