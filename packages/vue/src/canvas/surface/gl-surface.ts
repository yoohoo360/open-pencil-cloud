import type { CanvasKit, Surface } from 'canvaskit-wasm'

import { IS_BROWSER } from '@open-pencil/core/constants'
import type { Editor } from '@open-pencil/core/editor'

import type { UseCanvasOptions } from '#vue/canvas/surface/types'

import { configureDrawingBufferColorSpace } from './color-space'

type GLContext = ReturnType<CanvasKit['MakeGrContext']>

export type CanvasGLContext = GLContext

export function sizeCanvas(
  canvas: HTMLCanvasElement,
  editor: Editor,
  onViewportResize?: (width: number, height: number) => void
) {
  const dpr = IS_BROWSER ? window.devicePixelRatio || 1 : 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  if (onViewportResize) {
    onViewportResize(width, height)
  } else if ('setViewportSize' in editor && typeof editor.setViewportSize === 'function') {
    editor.setViewportSize(width, height)
  }
}

export function makeGLSurface(
  ck: CanvasKit,
  canvas: HTMLCanvasElement,
  editor: Editor,
  options: UseCanvasOptions | undefined,
  glContext: GLContext | null
): { surface: Surface | null; glContext: GLContext | null } {
  let context = glContext
  const glAttrs = options?.preserveDrawingBuffer ? { preserveDrawingBuffer: 1 } : undefined
  const handle = context ? null : ck.GetWebGLContext(canvas, glAttrs)
  if (!context && !handle) return { surface: null, glContext: context }

  const buffer = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  const wideGamut = IS_BROWSER && window.matchMedia('(color-gamut: p3)').matches
  const actualSpace = configureDrawingBufferColorSpace(
    buffer,
    editor.graph.documentColorSpace,
    wideGamut
  )
  if (!context && handle) context = ck.MakeGrContext(handle)
  if (!context) return { surface: null, glContext: context }

  const colorSpace = actualSpace === 'display-p3' ? ck.ColorSpace.DISPLAY_P3 : ck.ColorSpace.SRGB
  const surface = ck.MakeOnScreenGLSurface(context, canvas.width, canvas.height, colorSpace)
  if (surface) return { surface, glContext: context }

  if (
    actualSpace === 'display-p3' &&
    configureDrawingBufferColorSpace(buffer, 'srgb', false) === 'srgb'
  ) {
    return {
      surface: ck.MakeOnScreenGLSurface(context, canvas.width, canvas.height, ck.ColorSpace.SRGB),
      glContext: context
    }
  }
  return { surface: null, glContext: context }
}
