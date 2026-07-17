import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { useTooltipUI } from '@/components/ui/tooltip'

const TOOLTIP_OPEN_DELAY_MS = 400
const TOOLTIP_SIDE_OFFSET = 4
const TOOLTIP_VIEWPORT_PADDING = 8

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface TipProps {
  label?: string
  side?: TooltipSide
  disabled?: boolean
  children: ReactNode
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function Tip({ label, side = 'top', disabled = false, children }: TipProps) {
  const cls = useTooltipUI({ content: 'animate-in zoom-in-95 fade-in' })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const canOpen = Boolean(label) && !disabled

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = undefined
    }
  }, [])

  const anchorElement = useCallback(() => {
    const root = triggerRef.current
    const child = root?.firstElementChild
    return child instanceof HTMLElement ? child : root
  }, [])

  const refreshPosition = useCallback(() => {
    const anchor = anchorElement()
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

    setPosition({
      x: clamp(x, TOOLTIP_VIEWPORT_PADDING, window.innerWidth - contentRect.width - TOOLTIP_VIEWPORT_PADDING),
      y: clamp(y, TOOLTIP_VIEWPORT_PADDING, window.innerHeight - contentRect.height - TOOLTIP_VIEWPORT_PADDING)
    })
  }, [anchorElement, side])

  const show = useCallback(() => {
    if (!canOpen) return
    clearOpenTimer()
    openTimerRef.current = setTimeout(() => {
      setOpen(true)
      requestAnimationFrame(refreshPosition)
    }, TOOLTIP_OPEN_DELAY_MS)
  }, [canOpen, clearOpenTimer, refreshPosition])

  const hide = useCallback(() => {
    clearOpenTimer()
    setOpen(false)
  }, [clearOpenTimer])

  // Update position when open
  useEffect(() => {
    if (open) refreshPosition()
  }, [open, refreshPosition])

  // Close on resize/scroll/click
  useEffect(() => {
    window.addEventListener('resize', refreshPosition)
    window.addEventListener('scroll', refreshPosition, { capture: true })
    document.addEventListener('pointerdown', hide, { capture: true })
    document.addEventListener('click', hide, { capture: true })
    return () => {
      window.removeEventListener('resize', refreshPosition)
      window.removeEventListener('scroll', refreshPosition, { capture: true })
      document.removeEventListener('pointerdown', hide, { capture: true })
      document.removeEventListener('click', hide, { capture: true })
    }
  }, [hide, refreshPosition])

  useEffect(() => {
    if (!canOpen) hide()
  }, [canOpen, hide])

  // Cleanup on unmount
  useEffect(() => () => hide(), [hide])

  function containsRelatedTarget(event: React.PointerEvent | React.FocusEvent) {
    const relatedTarget = event.relatedTarget
    return relatedTarget instanceof Node && triggerRef.current?.contains(relatedTarget)
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="contents"
        onFocus={(e) => { if (!containsRelatedTarget(e)) show() }}
        onBlur={(e) => { if (!containsRelatedTarget(e)) hide() }}
        onPointerOver={(e) => { if (!containsRelatedTarget(e)) show() }}
        onPointerOut={(e) => { if (!containsRelatedTarget(e)) hide() }}
        onPointerDown={hide}
        onClick={hide}
      >
        {children}
      </span>
      {open && label && createPortal(
        <div
          ref={contentRef}
          role="tooltip"
          className={`${cls.content} pointer-events-none fixed`}
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >
          {label}
        </div>,
        document.body
      )}
    </>
  )
}
