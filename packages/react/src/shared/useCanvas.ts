import { useEffect, useRef, type RefObject } from 'react'

import { getCanvasKit, SkiaRenderer } from '@open-pencil/core'

import { useViewportKind } from '../viewport/useViewportKind'

import type { Editor } from '@open-pencil/core/editor'
import type { CanvasKit } from 'canvaskit-wasm'

/**
 * Options for {@link useCanvas}.
 */
export interface UseCanvasOptions {
  /**
   * Forces ruler visibility on or off for this canvas.
   *
   * When omitted, falls back to viewport and URL-param logic.
   */
  showRulers?: boolean
  /**
   * Keeps the drawing buffer after presenting frames.
   *
   * Useful for screenshot or pixel-readback workflows, but may increase memory
   * usage depending on the browser and GPU backend.
   */
  preserveDrawingBuffer?: boolean
  /**
   * Called once the rendering surface is ready.
   */
  onReady?: () => void
}

/**
 * Connects an OpenPencil editor to a real canvas element using CanvasKit.
 *
 * Owns renderer creation, surface recreation on resize, render scheduling,
 * and renderer-backed hit testing helpers used by higher-level canvas code.
 */
export function useCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  editor: Editor,
  options?: UseCanvasOptions
) {
  const rendererRef = useRef<SkiaRenderer | null>(null)
  const ckRef = useRef<CanvasKit | null>(null)
  const glContextRef = useRef<ReturnType<CanvasKit['MakeGrContext']> | null>(null)
  const dirtyRef = useRef(true)
  const lastRenderVersionRef = useRef(-1)
  const lastSelectedIdsRef = useRef<Set<string> | null>(null)
  const resizeRafRef = useRef(0)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const { isMobile } = useViewportKind()
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile

  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  const noRulersParam = params.has('no-rulers')

  function shouldShowRulers() {
    if (optionsRef.current?.showRulers === false) return false
    return !noRulersParam && !isMobileRef.current
  }

  function sizeCanvas(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
  }

  function makeGLSurface(canvas: HTMLCanvasElement) {
    const ck = ckRef.current
    if (!ck) return null
    if (!glContextRef.current) {
      const glAttrs = optionsRef.current?.preserveDrawingBuffer
        ? { preserveDrawingBuffer: 1 }
        : undefined
      const handle = ck.GetWebGLContext(canvas, glAttrs)
      if (!handle) return null
      glContextRef.current = ck.MakeGrContext(handle)
    }
    if (!glContextRef.current) return null

    const preferredSpace = editor.graph.documentColorSpace
    const colorSpaces =
      preferredSpace === 'display-p3'
        ? [ck.ColorSpace.DISPLAY_P3, ck.ColorSpace.SRGB]
        : [ck.ColorSpace.SRGB]

    for (const colorSpace of colorSpaces) {
      const surface = ck.MakeOnScreenGLSurface(
        glContextRef.current,
        canvas.width,
        canvas.height,
        colorSpace
      )
      if (surface) return surface
    }

    return null
  }

  function createSurface(canvas: HTMLCanvasElement) {
    const ck = ckRef.current
    if (!ck) return

    rendererRef.current?.destroy()
    rendererRef.current = null
    glContextRef.current?.delete()
    glContextRef.current = null

    sizeCanvas(canvas)

    const surface = makeGLSurface(canvas)
    if (!surface) {
      console.error('Failed to create WebGL surface')
      return
    }

    const glCtx = canvas.getContext('webgl2') ?? null
    rendererRef.current = new SkiaRenderer(ck, surface, glCtx)
    editor.setCanvasKit(ck, rendererRef.current)
    canvas.dataset.ready = '1'
    optionsRef.current?.onReady?.()
  }

  function renderNow() {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.renderFromEditorState(
      editor.state,
      editor.graph,
      editor.textEditor,
      canvasRef.current?.clientWidth ?? 0,
      canvasRef.current?.clientHeight ?? 0,
      shouldShowRulers()
    )
    lastRenderVersionRef.current = editor.state.renderVersion
    lastSelectedIdsRef.current = editor.state.selectedIds
  }

  function resizeCanvas(canvas: HTMLCanvasElement) {
    if (!ckRef.current || !rendererRef.current) {
      createSurface(canvas)
      return
    }

    sizeCanvas(canvas)

    const surface = makeGLSurface(canvas)
    if (!surface) {
      console.warn('Falling back to full surface recreation after resize')
      createSurface(canvas)
      return
    }
    rendererRef.current.replaceSurface(surface)
    renderNow()
  }

  useEffect(() => {
    let destroyed = false

    async function init() {
      const canvas = canvasRef.current
      if (!canvas || destroyed) return

      ckRef.current = await getCanvasKit()
      if (destroyed) return

      await new Promise((r) => requestAnimationFrame(r))
      if (destroyed) return
      createSurface(canvas)
      await rendererRef.current?.loadFonts()
      if (!destroyed) renderNow()
    }

    void init()

    let rafId = 0
    function tick() {
      rafId = requestAnimationFrame(tick)
      if (editor.state.loading) return
      const versionChanged = editor.state.renderVersion !== lastRenderVersionRef.current
      const selectionChanged = editor.state.selectedIds !== lastSelectedIdsRef.current
      if (dirtyRef.current || versionChanged || selectionChanged) {
        dirtyRef.current = false
        renderNow()
      }
    }
    rafId = requestAnimationFrame(tick)

    const canvas = canvasRef.current
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && canvas
        ? new ResizeObserver(() => {
            const el = canvasRef.current
            if (!el || !ckRef.current || resizeRafRef.current) return
            resizeRafRef.current = requestAnimationFrame(() => {
              resizeRafRef.current = 0
              resizeCanvas(el)
            })
          })
        : null
    if (canvas && resizeObserver) resizeObserver.observe(canvas)

    return () => {
      destroyed = true
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(resizeRafRef.current)
      resizeObserver?.disconnect()
      rendererRef.current?.destroy()
      rendererRef.current = null
      glContextRef.current?.delete()
      glContextRef.current = null
    }
    // Intentionally bind once per editor/canvas element identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, canvasRef])

  function hitTestSectionTitle(canvasX: number, canvasY: number) {
    return rendererRef.current?.hitTestSectionTitle(editor.graph, canvasX, canvasY) ?? null
  }

  function hitTestComponentLabel(canvasX: number, canvasY: number) {
    return rendererRef.current?.hitTestComponentLabel(editor.graph, canvasX, canvasY) ?? null
  }

  function hitTestFrameTitle(canvasX: number, canvasY: number) {
    return (
      rendererRef.current?.hitTestFrameTitle(
        editor.graph,
        canvasX,
        canvasY,
        editor.state.selectedIds
      ) ?? null
    )
  }

  return {
    render: () => {
      dirtyRef.current = true
    },
    renderNow,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }
}
