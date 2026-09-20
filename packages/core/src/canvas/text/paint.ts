import type { Paint, ParagraphBuilder, TextStyle } from 'canvaskit-wasm'

export interface ParagraphBuildOptions {
  halfLeading?: boolean
  foregroundPaint?: Paint
}

export interface ParagraphPaintStyle {
  foreground: Paint
  background: Paint
}

export function pushParagraphStyle(
  builder: ParagraphBuilder,
  style: TextStyle,
  paints?: ParagraphPaintStyle
): void {
  if (paints) builder.pushPaintStyle(style, paints.foreground, paints.background)
  else builder.pushStyle(style)
}
