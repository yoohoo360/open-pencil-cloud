import type { DocumentColorSpace } from '@open-pencil/scene-graph'

type ColorManagedContext = Partial<Pick<WebGLRenderingContext, 'drawingBufferColorSpace'>>

/** Keep Skia's surface encoding aligned with the browser's actual presentation buffer. */
export function configureDrawingBufferColorSpace(
  context: ColorManagedContext | null,
  documentColorSpace: DocumentColorSpace,
  wideGamut: boolean
): DocumentColorSpace {
  if (!context?.drawingBufferColorSpace) return 'srgb'
  const requested = wideGamut && documentColorSpace === 'display-p3' ? 'display-p3' : 'srgb'
  if (context.drawingBufferColorSpace === requested) return requested
  try {
    context.drawingBufferColorSpace = requested
  } catch (error) {
    console.warn('Canvas color-space request is unavailable; keeping the current buffer.', error)
  }
  return context.drawingBufferColorSpace === 'display-p3' ? 'display-p3' : 'srgb'
}
