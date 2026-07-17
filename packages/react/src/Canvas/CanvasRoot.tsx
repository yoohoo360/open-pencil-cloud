import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { getCanvasKit, SkiaRenderer } from '@open-pencil/core'
import { useEditor } from '../context/editorContext'
import { CanvasProvider } from './context'

import type { CanvasContext } from './context'
import type { CanvasKit } from 'canvaskit-wasm'

export interface CanvasRootProps {
  showRulers?: boolean
  preserveDrawingBuffer?: boolean
  onReady?: () => void
  children: (ctx: Pick<CanvasContext, 'canvasRef' | 'ready' | 'renderNow'>) => ReactNode
}

export function CanvasRoot({
  showRulers,
  preserveDrawingBuffer,
  onReady,
  children
}: CanvasRootProps) {
  const editor = useEditor()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ready, setReady] = useState(false)

  const rendererRef = useRef<SkiaRenderer | null>(null)
  const ckRef = useRef<CanvasKit | null>(null)
  const glContextRef = useRef<ReturnType<CanvasKit['MakeGrContext']> | null>(null)
  const destroyedRef = useRef(false)
  const lastRenderVersionRef = useRef(-1)
  const lastSelectedIdsRef = useRef<Set<string> | null>(null)
  const resizeRafRef = useRef(0)
  const rafRef = useRef(0)

  const paramsRef = useRef(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  )

  const shouldShowRulers = useCallback(() => {
    if (showRulers === false) return false
    const noRulersParam = paramsRef.current.has('no-rulers')
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    return !noRulersParam && !isMobile
  }, [showRulers])

  const renderNow = useCallback(() => {
    const renderer = rendererRef.current
    const canvas = canvasRef.current
    if (!renderer || destroyedRef.current) return
    renderer.renderFromEditorState(
      editor.state,
      editor.graph,
      editor.textEditor,
      canvas?.clientWidth ?? 0,
      canvas?.clientHeight ?? 0,
      shouldShowRulers()
    )
    lastRenderVersionRef.current = editor.state.renderVersion
    lastSelectedIdsRef.current = editor.state.selectedIds
  }, [editor, shouldShowRulers])

  const hitTestSectionTitle = useCallback(
    (cx: number, cy: number) =>
      rendererRef.current?.hitTestSectionTitle(editor.graph, cx, cy) ?? null,
    [editor]
  )

  const hitTestComponentLabel = useCallback(
    (cx: number, cy: number) =>
      rendererRef.current?.hitTestComponentLabel(editor.graph, cx, cy) ?? null,
    [editor]
  )

  const hitTestFrameTitle = useCallback(
    (cx: number, cy: number) =>
      rendererRef.current?.hitTestFrameTitle(editor.graph, cx, cy, editor.state.selectedIds) ??
      null,
    [editor]
  )

  useEffect(() => {
    destroyedRef.current = false

    function sizeCanvas(canvas: HTMLCanvasElement) {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
    }

    function makeGLSurface(canvas: HTMLCanvasElement) {
      const ck = ckRef.current
      if (!ck) return null
      if (!glContextRef.current) {
        const glAttrs = preserveDrawingBuffer ? { preserveDrawingBuffer: 1 } : undefined
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
      const renderer = new SkiaRenderer(ck, surface, glCtx)
      rendererRef.current = renderer
      editor.setCanvasKit(ck, renderer)
      canvas.dataset.ready = '1'
      setReady(true)
      onReady?.()
    }

    function resizeCanvas(canvas: HTMLCanvasElement) {
      const ck = ckRef.current
      if (!ck || !rendererRef.current) {
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

    async function init() {
      const canvas = canvasRef.current
      if (!canvas || destroyedRef.current) return

      ckRef.current = await getCanvasKit()
      if (destroyedRef.current) return

      await new Promise<void>((r) => requestAnimationFrame(() => r()))
      createSurface(canvas)
      await rendererRef.current?.loadFonts()
      if (!destroyedRef.current) renderNow()
    }

    void init()

    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current
      if (!canvas || !ckRef.current || resizeRafRef.current) return
      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = 0
        resizeCanvas(canvas)
      })
    })
    if (canvasRef.current) ro.observe(canvasRef.current)

    let dirty = true

    function tick() {
      if (!destroyedRef.current) {
        rafRef.current = requestAnimationFrame(tick)
      }
      if (editor.state.loading) return
      const versionChanged = editor.state.renderVersion !== lastRenderVersionRef.current
      const selectionChanged = editor.state.selectedIds !== lastSelectedIdsRef.current
      if (dirty || versionChanged || selectionChanged) {
        dirty = false
        renderNow()
      }
    }

    const unsubRender = editor.onEditorEvent('render:requested', () => {
      dirty = true
    })
    const unsubRepaint = editor.onEditorEvent('repaint:requested', () => {
      dirty = true
    })

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      destroyedRef.current = true
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(resizeRafRef.current)
      ro.disconnect()
      unsubRender()
      unsubRepaint()
      rendererRef.current?.destroy()
      rendererRef.current = null
      glContextRef.current?.delete()
      glContextRef.current = null
    }
  }, [editor, preserveDrawingBuffer, renderNow, onReady])

  const ctx: CanvasContext = {
    canvasRef,
    ready,
    renderNow,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle
  }

  return (
    <CanvasProvider value={ctx}>
      {children({ canvasRef, ready, renderNow })}
    </CanvasProvider>
  )
}

export default CanvasRoot
