import { type ComponentPropsWithoutRef } from 'react'

import { useCanvasContext } from './context'

export type CanvasSurfaceProps = Omit<ComponentPropsWithoutRef<'canvas'>, 'ref'>

export function CanvasSurface(props: CanvasSurfaceProps) {
  const { canvasRef } = useCanvasContext()
  return <canvas ref={canvasRef} {...props} />
}

export default CanvasSurface
