import { useTooltipUI } from '#react/components/ui/tooltip'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'

import { IS_BROWSER } from '@open-pencil/core/constants'

const TOOLTIP_OPEN_DELAY_MS = 400
const TOOLTIP_SIDE_OFFSET = 4
const TOOLTIP_VIEWPORT_PADDING = 8
const TOOLTIP_CLAIM_EVENT = 'open-pencil:tooltip-claim'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

export type TipProps = {
  label?: string
  side?: TooltipSide
  disabled?: boolean
  children?: ReactNode
}

export function Tip({ label, side = 'top', disabled = false, children }: TipProps) {
  const cls = useTooltipUI({ content: 'animate-in zoom-in-95 fade-in' })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canOpen = Boolean(label) && !disabled

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setOpen(false)
  }, [])

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
    setPosition({
      x: Math.min(
        Math.max(x, TOOLTIP_VIEWPORT_PADDING),
        window.innerWidth - contentRect.width - TOOLTIP_VIEWPORT_PADDING
      ),
      y: Math.min(
        Math.max(y, TOOLTIP_VIEWPORT_PADDING),
        window.innerHeight - contentRect.height - TOOLTIP_VIEWPORT_PADDING
      )
    })
  }, [side])

  const show = useCallback(() => {
    if (!canOpen) return
    document.dispatchEvent(new CustomEvent(TOOLTIP_CLAIM_EVENT, { detail: triggerRef.current }))
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setOpen(true)
      requestAnimationFrame(refreshPosition)
    }, TOOLTIP_OPEN_DELAY_MS)
  }, [canOpen, refreshPosition])

  function isNestedTooltipEvent(
    event: ReactPointerEvent<HTMLSpanElement> | ReactFocusEvent<HTMLSpanElement>
  ) {
    const target = event.target
    return (
      target instanceof Element && target.closest('[data-tooltip-trigger]') !== triggerRef.current
    )
  }

  function containsRelatedTarget(
    event: ReactPointerEvent<HTMLSpanElement> | ReactFocusEvent<HTMLSpanElement>
  ) {
    const relatedTarget = event.relatedTarget
    return relatedTarget instanceof Node && Boolean(triggerRef.current?.contains(relatedTarget))
  }

  function onPointerEnter(event: ReactPointerEvent<HTMLSpanElement>) {
    if (isNestedTooltipEvent(event)) {
      hide()
      return
    }
    show()
  }

  function onPointerLeave(event: ReactPointerEvent<HTMLSpanElement>) {
    if (containsRelatedTarget(event)) return
    hide()
  }

  function onPointerOver(event: ReactPointerEvent<HTMLSpanElement>) {
    if (isNestedTooltipEvent(event)) {
      hide()
      return
    }
    if (containsRelatedTarget(event)) return
    show()
  }

  function onPointerOut(event: ReactPointerEvent<HTMLSpanElement>) {
    if (containsRelatedTarget(event)) return
    hide()
  }

  function onFocus(event: ReactFocusEvent<HTMLSpanElement>) {
    if (isNestedTooltipEvent(event)) {
      hide()
      return
    }
    if (containsRelatedTarget(event)) return
    show()
  }

  function onBlur(event: ReactFocusEvent<HTMLSpanElement>) {
    if (containsRelatedTarget(event)) return
    hide()
  }

  useEffect(() => {
    if (!open) return
    refreshPosition()
    const onClaim = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.detail === triggerRef.current) return
      hide()
    }
    window.addEventListener('resize', refreshPosition)
    window.addEventListener('scroll', refreshPosition, true)
    document.addEventListener('pointerdown', hide, true)
    document.addEventListener('click', hide, true)
    document.addEventListener(TOOLTIP_CLAIM_EVENT, onClaim)
    return () => {
      window.removeEventListener('resize', refreshPosition)
      window.removeEventListener('scroll', refreshPosition, true)
      document.removeEventListener('pointerdown', hide, true)
      document.removeEventListener('click', hide, true)
      document.removeEventListener(TOOLTIP_CLAIM_EVENT, onClaim)
    }
  }, [hide, open, refreshPosition])

  useEffect(() => {
    if (!canOpen) hide()
  }, [canOpen, hide])

  const contentStyle: CSSProperties = { left: `${position.x}px`, top: `${position.y}px` }
  const tooltip =
    open && label && IS_BROWSER ? (
      <div
        ref={contentRef}
        role="tooltip"
        className={`${cls.content} pointer-events-none fixed z-[200]`}
        style={contentStyle}
      >
        {label}
      </div>
    ) : null

  return (
    <>
      <span
        ref={triggerRef}
        data-tooltip-trigger
        className="inline-flex"
        onFocusCapture={onFocus}
        onBlurCapture={onBlur}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onPointerDown={hide}
        onClick={hide}
      >
        {children}
      </span>
      {tooltip ? createPortal(tooltip, document.body) : null}
    </>
  )
}
