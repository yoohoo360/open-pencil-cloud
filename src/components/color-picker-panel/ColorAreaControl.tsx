import {
  memo,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from 'react'

import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export const ColorAreaControl = memo(function ColorAreaControl() {
  const ctx = useColorPickerPanelContext()
  const areaRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const { h: hue, s: saturation, b: brightness } = ctx.hsbColor

  const areaStyle = useMemo<CSSProperties>(
    () => ({
      background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`
    }),
    [hue]
  )

  const thumbStyle = useMemo<CSSProperties>(
    () => ({
      left: `${saturation}%`,
      top: `${100 - brightness}%`
    }),
    [brightness, saturation]
  )

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const element = areaRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const nextSaturation = Math.max(
        0,
        Math.min(100, ((clientX - rect.left) / rect.width) * 100)
      )
      const nextBrightness = Math.max(
        0,
        Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100)
      )
      ctx.onRekaColorUpdate({
        space: 'hsb',
        h: ctx.hsbColor.h,
        s: nextSaturation,
        b: nextBrightness,
        alpha: ctx.color.a
      })
    },
    [ctx]
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      draggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      updateFromPointer(event.clientX, event.clientY)
    },
    [updateFromPointer]
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
      updateFromPointer(event.clientX, event.clientY)
    },
    [updateFromPointer]
  )

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  return (
    <div
      ref={areaRef}
      className="relative h-[140px] w-full cursor-crosshair overflow-hidden rounded"
      style={areaStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span
        className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
        style={thumbStyle}
      />
    </div>
  )
})

ColorAreaControl.displayName = 'ColorAreaControl'

export default ColorAreaControl
