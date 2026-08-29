import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject
} from 'react'
import { createPortal } from 'react-dom'

import { IS_BROWSER } from '@open-pencil/core/constants'

const VIEWPORT_PAD = 8

export function FloatingMenu({
  open,
  onClose,
  triggerRef,
  point,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  className,
  children
}: {
  open: boolean
  onClose: () => void
  triggerRef?: RefObject<HTMLElement | null>
  point?: { x: number; y: number }
  side?: 'top' | 'bottom'
  align?: 'start' | 'end'
  sideOffset?: number
  className?: string
  children?: ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ left: number; top: number }>({ left: 0, top: 0 })

  useLayoutEffect(() => {
    if (!open || !IS_BROWSER) return
    const menu = menuRef.current
    if (!menu) return
    const menuRect = menu.getBoundingClientRect()
    let left = 0
    let top = 0
    if (point) {
      left = point.x
      top = point.y
    } else {
      const trigger = triggerRef?.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      left = align === 'end' ? rect.right - menuRect.width : rect.left
      top = side === 'top' ? rect.top - menuRect.height - sideOffset : rect.bottom + sideOffset
    }
    setStyle({
      left: Math.min(Math.max(left, VIEWPORT_PAD), window.innerWidth - menuRect.width - VIEWPORT_PAD),
      top: Math.min(Math.max(top, VIEWPORT_PAD), window.innerHeight - menuRect.height - VIEWPORT_PAD)
    })
  }, [align, open, point, side, sideOffset, triggerRef])

  useEffect(() => {
    if (!open) return

    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' && event.code !== 'Escape') return
      event.stopPropagation()
      onClose()
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef?.current?.contains(target) || menuRef.current?.contains(target)) return
      onClose()
    }

    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [onClose, open, triggerRef])

  if (!open || !IS_BROWSER) return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      data-menu-content
      className={className}
      style={{ position: 'fixed', left: style.left, top: style.top }}
    >
      {children}
    </div>,
    document.body
  )
}
