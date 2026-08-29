import { useEffect, useMemo, useRef } from 'react'
import type { CanvasKit, Surface } from 'canvaskit-wasm'

import { SkiaRenderer } from '@open-pencil/core/canvas'
import { getCanvasKit } from '@open-pencil/core/canvaskit'
import type { Editor } from '@open-pencil/core/editor'

import { makeGLSurface, sizeCanvas, type CanvasGLContext } from '#react/canvas/surface/gl-surface'
import { createCanvasHitTests, createRulerVisibility } from '#react/canvas/surface/overlays'
import { createCanvasRenderLoop } from '#react/canvas/surface/render-loop'
import type { CanvasElementRef, UseCanvasOptions } from '#react/canvas/surface/types'

export type { UseCanvasOptions } from '#react/canvas/surface/types'

type CanvasState = {
  ck: CanvasKit | null
  renderer: SkiaRenderer | null
  glContext: CanvasGLContext | null
  surface: Surface | null
  sceneBackingRenderTimer: ReturnType<typeof setTimeout> | null
}

function cleanupRenderer(editor: Editor, state: CanvasState) {
  if (state.sceneBackingRenderTimer !== null) {
    clearTimeout(state.sceneBackingRenderTimer)
    state.sceneBackingRenderTimer = null
  }
  if (state.renderer) editor.removeCanvasRenderer(state.renderer)
  state.renderer?.destroy()
  state.renderer = null
  state.glContext?.delete()
  state.glContext = null
  state.surface = null
}

function createSurface(
  editor: Editor,
  canvas: HTMLCanvasElement,
  state: CanvasState,
  options?: UseCanvasOptions
) {
  const ck = state.ck
  if (!ck) return false

  cleanupRenderer(editor, state)
  sizeCanvas(canvas, editor, options?.onViewportResize)

  const result = makeGLSurface(ck, canvas, editor, options, state.glContext)
  state.glContext = result.glContext
  state.surface = result.surface
  if (!state.surface) {
    canvas.dataset.surfaceError = 'webgl'
    return false
  }

  const glCtx = canvas.getContext('webgl2') ?? null
  state.renderer = new SkiaRenderer(ck, state.surface, glCtx)
  editor.setCanvasKit(ck, state.renderer)
  canvas.dataset.ready = '1'
  return true
}

/**
 * Connects an OpenPencil editor to a real canvas element using CanvasKit.
 */
export function useCanvas(canvasRef: CanvasElementRef, editor: Editor, options?: UseCanvasOptions) {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const shouldShowRulers = useMemo(() => createRulerVisibility(options), [options?.showRulers])
  const stateRef = useRef<CanvasState>({
    ck: null,
    renderer: null,
    glContext: null,
    surface: null,
    sceneBackingRenderTimer: null
  })
  const loopRef = useRef<ReturnType<typeof createCanvasRenderLoop> | null>(null)

  function renderNow() {
    const state = stateRef.current
    const canvas = canvasRef.current
    const scopedOptions = optionsRef.current
    if (!state.renderer || !canvas) return

    state.renderer.renderFromEditorState(
      scopedOptions?.getRenderState?.() ?? editor.state,
      editor.graph,
      editor.textEditor,
      canvas.clientWidth,
      canvas.clientHeight,
      shouldShowRulers(),
      scopedOptions?.layer ?? 'full'
    )
    loopRef.current?.markRendered()

    if (state.sceneBackingRenderTimer !== null) {
      clearTimeout(state.sceneBackingRenderTimer)
      state.sceneBackingRenderTimer = null
    }
    if (scopedOptions?.layer === 'scene' && state.renderer.sceneBackingNeedsCrispRender) {
      const delay = Math.max(0, state.renderer.sceneBackingPreviewUntil - performance.now())
      state.sceneBackingRenderTimer = setTimeout(() => loopRef.current?.markDirty(), delay)
    }
  }

  useEffect(() => {
    let destroyed = false
    const state = stateRef.current
    const canvas = canvasRef.current
    if (!canvas) return
    const scopedOptions = optionsRef.current
    const loop = createCanvasRenderLoop(editor, renderNow, {
      layer: scopedOptions?.layer,
      getRenderState: () => optionsRef.current?.getRenderState?.() ?? editor.state
    })
    loopRef.current = loop

    function resizeCanvas() {
      const target = canvasRef.current
      const nextOptions = optionsRef.current
      if (!target) return
      if (!state.renderer || !state.ck) {
        createSurface(editor, target, state, nextOptions)
        return
      }

      sizeCanvas(target, editor, nextOptions?.onViewportResize)
      const result = makeGLSurface(state.ck, target, editor, nextOptions, state.glContext)
      state.glContext = result.glContext
      state.surface = result.surface
      if (!state.surface) {
        if (createSurface(editor, target, state, nextOptions) && state.renderer) {
          void state.renderer.loadFonts(() => loop.markDirty()).then(() => {
            if (!destroyed) renderNow()
            return undefined
          })
        }
        return
      }

      state.renderer.replaceSurface(state.surface)
      renderNow()
    }

    let resizeRaf = 0
    const observer = new ResizeObserver(() => {
      if (resizeRaf) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        resizeCanvas()
      })
    })
    observer.observe(canvas)

    void (async () => {
      state.ck = await getCanvasKit()
      if (destroyed) return
      const target = canvasRef.current
      if (!target || !createSurface(editor, target, state, optionsRef.current) || !state.renderer) return

      await state.renderer.loadFonts(() => loop.markDirty())
      if (destroyed) return
      renderNow()
      optionsRef.current?.onReady?.()
    })()

    return () => {
      destroyed = true
      observer.disconnect()
      cancelAnimationFrame(resizeRaf)
      loop.pause()
      if (loopRef.current === loop) loopRef.current = null
      cleanupRenderer(editor, state)
    }
  }, [canvasRef, editor, shouldShowRulers, options?.layer])

  const { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = createCanvasHitTests(
    editor,
    () => stateRef.current.renderer
  )

  return {
    render: () => loopRef.current?.markDirty(),
    renderNow,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }
}
