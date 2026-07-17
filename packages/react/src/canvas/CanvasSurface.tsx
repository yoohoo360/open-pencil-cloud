import { useEffect, useRef, type HTMLAttributes } from 'react'

import { useCanvasContext } from '#react/canvas/context'

type CanvasSurfaceProps = HTMLAttributes<HTMLCanvasElement>

export function CanvasSurface(props: CanvasSurfaceProps) {
  const { canvasRef } = useCanvasContext()
  const surfaceRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    canvasRef.value = surfaceRef.current
    return () => {
      canvasRef.value = null
    }
  }, [canvasRef])

  return <canvas ref={surfaceRef} {...props} />
}
