export function canvasToScreen(
  x: number,
  y: number,
  panX: number,
  panY: number,
  zoom: number
): { x: number; y: number } {
  return {
    x: x * zoom + panX,
    y: y * zoom + panY
  }
}
