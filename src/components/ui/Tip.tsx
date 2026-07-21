import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'

import { useTooltipUI } from '@/components/ui/tooltip'

const TOOLTIP_OPEN_DELAY_MS = 400
const TOOLTIP_SIDE_OFFSET = 4
const TOOLTIP_VIEWPORT_PADDING = 8

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

export type TipProps = {
  label?: string
  side?: TooltipSide
  disabled?: boolean
  children?: ReactNode
}

export const Tip = memo(function Tip({
  label,
  side = 'top',
  disabled = false,
  children
}: TipProps) {
  const cls = useTooltipUI({ content: 'animate-in zoom-in-95 fade-in' })
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const canOpen = Boolean(label) && !disabled

  const contentStyle = useMemo<CSSProperties>(
    () => ({
      left: `${position.x}px`,
      top: `${position.y}px`
    }),
    [position.x, position.y]
  )

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const hide = useCallback(() => {
    clearTimer()
    setOpen(false)
  }, [clearTimer])

  const refreshPosition = useCallback(() => {
    const root = triggerRef.current
    const child = root?.firstElementChild
    const anchor = child instanceof HTMLElement ? child : root
    const content = contentRef.current
    if (!anchor || !content) return

    const anchorRect = anchor.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    const centerX = anchorRect.left + anchorRect.width / 2
    const centerY = anchorRect.top + anchorRect.height / 2

    let x = centerX - contentRect.width / 2
    let y = anchorRect.top - contentRect.height - TOOLTIP_SIDE_OFFSET

    if (side === 'bottom') y = anchorRect.bottom + TOOLTIP_SIDE_OFFSET
    if (side === 'left') {
      x = anchorRect.left - contentRect.width - TOOLTIP_SIDE_OFFSET
      y = centerY - contentRect.height / 2
    }
    if (side === 'right') {
      x = anchorRect.right + TOOLTIP_SIDE_OFFSET
      y = centerY - contentRect.height / 2
    }

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

    setPosition({
      x: clamp(
        x,
        TOOLTIP_VIEWPORT_PADDING,
        window.innerWidth - contentRect.width - TOOLTIP_VIEWPORT_PADDING
      ),
      y: clamp(
        y,
        TOOLTIP_VIEWPORT_PADDING,
        window.innerHeight - contentRect.height - TOOLTIP_VIEWPORT_PADDING
      )
    })
  }, [side])

  const show = useCallback(() => {
    if (!canOpen) return
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      setOpen(true)
    }, TOOLTIP_OPEN_DELAY_MS)
  }, [canOpen, clearTimer])

  useEffect(() => {
    if (open) refreshPosition()
  }, [open, refreshPosition, label])

  useEffect(() => {
    if (!canOpen) hide()
  }, [canOpen, hide])

  useEffect(() => {
    const onResize = () => refreshPosition()
    const onScroll = () => refreshPosition()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('pointerdown', hide, true)
    document.addEventListener('click', hide, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('pointerdown', hide, true)
      document.removeEventListener('click', hide, true)
      clearTimer()
    }
  }, [clearTimer, hide, refreshPosition])

  const containsRelatedTarget = (event: PointerEvent | FocusEvent) => {
    const relatedTarget = event.relatedTarget
    return relatedTarget instanceof Node && Boolean(triggerRef.current?.contains(relatedTarget))
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="contents"
        onFocusCapture={(event) => {
          if (!containsRelatedTarget(event)) show()
        }}
        onBlurCapture={(event) => {
          if (!containsRelatedTarget(event)) hide()
        }}
        onPointerOver={(event) => {
          if (!containsRelatedTarget(event)) show()
        }}
        onPointerOut={(event) => {
          if (!containsRelatedTarget(event)) hide()
        }}
        onPointerDown={hide}
        onClick={hide}
      >
        {children}
      </span>
      {open && label
        ? createPortal(
            <div
              ref={contentRef}
              role="tooltip"
              className={`${cls.content} pointer-events-none fixed`}
              style={contentStyle}
            >
              {label}
            </div>,
            document.body
          )
        : null}
    </>
  )
})

Tip.displayName = 'Tip'
export default Tip
