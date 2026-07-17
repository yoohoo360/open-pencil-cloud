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
   */
  showRulers?: boolean
  /**
   * Keeps the drawing buffer after presenting frames.
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
 * This hook owns renderer creation, surface recreation on resize,
 * render scheduling, and renderer-backed hit testing helpers used by higher-
 * level canvas interaction code.
 */
export function useCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  editor: Editor,
  options?: UseCanvasOptions
) {
  const stateRef = useRef<{
    renderer: SkiaRenderer | null
    ck: CanvasKit | null
    glContext: ReturnType<CanvasKit['MakeGrContext']> | null
    destroyed: boolean
    dirty: boolean
    lastRenderVersion: number
    lastSelectedIds: Set<string> | null
    resizeRaf: number
    rafId: number
  }>({
    renderer: null,
    ck: null,
    glContext: null,
    destroyed: false,
    dirty: true,
    lastRenderVersion: -1,
    lastSelectedIds: null,
    resizeRaf: 0,
    rafId: 0
  })

  const { isMobile } = useViewportKind()
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile

  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  const noRulersParam = params.has('no-rulers')

  function shouldShowRulers() {
    if (options?.showRulers === false) return false
    return !noRulersParam && !isMobileRef.current
  }

  function sizeCanvas(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
  }

  function makeGLSurface(canvas: HTMLCanvasElement) {
    const s = stateRef.current
    if (!s.ck) return null
    if (!s.glContext) {
      const glAttrs = options?.preserveDrawingBuffer ? { preserveDrawingBuffer: 1 } : undefined
      const handle = s.ck.GetWebGLContext(canvas, glAttrs)
      if (!handle) return null
      s.glContext = s.ck.MakeGrContext(handle)
    }
    if (!s.glContext) return null

    const preferredSpace = editor.graph.documentColorSpace
    const colorSpaces =
      preferredSpace === 'display-p3'
        ? [s.ck.ColorSpace.DISPLAY_P3, s.ck.ColorSpace.SRGB]
        : [s.ck.ColorSpace.SRGB]

    for (const colorSpace of colorSpaces) {
      const surface = s.ck.MakeOnScreenGLSurface(
        s.glContext,
        canvas.width,
        canvas.height,
        colorSpace
      )
      if (surface) return surface
    }

    return null
  }

  function createSurface(canvas: HTMLCanvasElement) {
    const s = stateRef.current
    if (!s.ck) return

    s.renderer?.destroy()
    s.renderer = null
    s.glContext?.delete()
    s.glContext = null

    sizeCanvas(canvas)

    const surface = makeGLSurface(canvas)
    if (!surface) {
      console.error('Failed to create WebGL surface')
      return
    }

    const glCtx = canvas.getContext('webgl2') ?? null
    s.renderer = new SkiaRenderer(s.ck, surface, glCtx)
    editor.setCanvasKit(s.ck, s.renderer)
    canvas.dataset.ready = '1'
    options?.onReady?.()
  }

  function renderNow() {
    const s = stateRef.current
    const canvas = canvasRef.current
    if (!s.renderer || s.destroyed) return
    s.renderer.renderFromEditorState(
      editor.state,
      editor.graph,
      editor.textEditor,
      canvas?.clientWidth ?? 0,
      canvas?.clientHeight ?? 0,
      shouldShowRulers()
    )
    s.lastRenderVersion = editor.state.renderVersion
    s.lastSelectedIds = editor.state.selectedIds
  }

  function resizeCanvas(canvas: HTMLCanvasElement) {
    const s = stateRef.current
    if (!s.ck || !s.renderer) {
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
    s.renderer.replaceSurface(surface)
    renderNow()
  }

  useEffect(() => {
    const s = stateRef.current
    s.destroyed = false

    async function init() {
      const canvas = canvasRef.current
      if (!canvas || s.destroyed) return

      s.ck = await getCanvasKit()
      if (s.destroyed) return

      await new Promise((r) => requestAnimationFrame(r))
      createSurface(canvas)
      await s.renderer?.loadFonts()
      if (!s.destroyed) renderNow()
    }

    void init()

    function rafLoop() {
      if (s.destroyed) return
      if (!editor.state.loading) {
        const versionChanged = editor.state.renderVersion !== s.lastRenderVersion
        const selectionChanged = editor.state.selectedIds !== s.lastSelectedIds
        if (s.dirty || versionChanged || selectionChanged) {
          s.dirty = false
          renderNow()
        }
      }
      s.rafId = requestAnimationFrame(rafLoop)
    }
    s.rafId = requestAnimationFrame(rafLoop)

    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current
      if (!canvas || !s.ck || s.resizeRaf) return
      s.resizeRaf = requestAnimationFrame(() => {
        s.resizeRaf = 0
        const el = canvasRef.current
        if (el) resizeCanvas(el)
      })
    })
    const el = canvasRef.current
    if (el) ro.observe(el)

    return () => {
      s.destroyed = true
      cancelAnimationFrame(s.rafId)
      cancelAnimationFrame(s.resizeRaf)
      ro.disconnect()
      s.renderer?.destroy()
      s.glContext?.delete()
      s.renderer = null
      s.glContext = null
    }
  }, [editor])

  function hitTestSectionTitle(canvasX: number, canvasY: number) {
    return stateRef.current.renderer?.hitTestSectionTitle(editor.graph, canvasX, canvasY) ?? null
  }

  function hitTestComponentLabel(canvasX: number, canvasY: number) {
    return (
      stateRef.current.renderer?.hitTestComponentLabel(editor.graph, canvasX, canvasY) ?? null
    )
  }

  function hitTestFrameTitle(canvasX: number, canvasY: number) {
    return (
      stateRef.current.renderer?.hitTestFrameTitle(
        editor.graph,
        canvasX,
        canvasY,
        editor.state.selectedIds
      ) ?? null
    )
  }

  return {
    render: () => {
      stateRef.current.dirty = true
    },
    renderNow,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }
}
