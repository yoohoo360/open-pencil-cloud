import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { colorToCSS, colorToHexRaw } from '@open-pencil/core/color'
import { IS_BROWSER } from '@open-pencil/core/constants'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { ColorRow } from '#react/components/properties/ColorRow'
import { usePopoverUI } from '#react/components/ui/popover'
import { useI18n } from '#react/i18n'

const SIDE_OFFSET = 4

export function VariableColorCell({
  color,
  onUpdate
}: {
  color: Color
  onUpdate: (color: Color) => void
}) {
  const { panels } = useI18n()
  const cls = usePopoverUI({ content: 'w-56 p-2' })
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ left: number; top: number }>({ left: 0, top: 0 })

  useLayoutEffect(() => {
    if (!open || !IS_BROWSER) return
    const trigger = triggerRef.current
    const content = contentRef.current
    if (!trigger || !content) return
    const rect = trigger.getBoundingClientRect()
    const box = content.getBoundingClientRect()
    setStyle({
      left: Math.max(8, rect.left - box.width - SIDE_OFFSET),
      top: Math.max(8, rect.top)
    })
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' && event.code !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) return
      setOpen(false)
    }

    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  return (
    <div className="flex items-center gap-1.5">
      <button
        ref={triggerRef}
        type="button"
        aria-label={panels.editColor}
        className="size-5 shrink-0 cursor-pointer rounded border border-border p-0"
        style={{ background: colorToCSS(color) }}
        onClick={() => setOpen((current) => !current)}
      />
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">
        {colorToHexRaw(color)}
      </span>
      {open && IS_BROWSER
        ? createPortal(
            <div
              ref={contentRef}
              data-picker-content
              className={cls.content}
              style={{ position: 'fixed', left: style.left, top: style.top }}
            >
              <ColorRow
                color={color}
                opacity={color.a}
                label={panels.editColor}
                onColor={onUpdate}
                onOpacity={(opacity) => onUpdate({ ...color, a: opacity })}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
