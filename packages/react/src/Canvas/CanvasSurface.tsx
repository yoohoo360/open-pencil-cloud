import { forwardRef, useCallback, type CanvasHTMLAttributes } from 'react'

import { useCanvasContext } from './context'

export type CanvasSurfaceProps = CanvasHTMLAttributes<HTMLCanvasElement>

export const CanvasSurface = forwardRef<HTMLCanvasElement, CanvasSurfaceProps>(
  function CanvasSurface(props, forwardedRef) {
    const { canvasRef } = useCanvasContext()

    const setRefs = useCallback(
      (el: HTMLCanvasElement | null) => {
        ;(canvasRef as { current: HTMLCanvasElement | null }).current = el
        if (typeof forwardedRef === 'function') forwardedRef(el)
        else if (forwardedRef) forwardedRef.current = el
      },
      [canvasRef, forwardedRef]
    )

    return <canvas ref={setRefs} {...props} />
  }
)
