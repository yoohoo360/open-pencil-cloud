import { forwardRef, useImperativeHandle, type CanvasHTMLAttributes } from 'react'

import { useCanvasContext } from '#react/canvas/context'

/** Canvas element connected to the nearest {@link CanvasRoot}. */
export const CanvasSurface = forwardRef<HTMLCanvasElement, CanvasHTMLAttributes<HTMLCanvasElement>>(
  function CanvasSurface(props, forwardedRef) {
    const { canvasRef } = useCanvasContext()
    useImperativeHandle(forwardedRef, () => canvasRef.current as HTMLCanvasElement, [canvasRef])
    return <canvas {...props} ref={canvasRef} />
  }
)
