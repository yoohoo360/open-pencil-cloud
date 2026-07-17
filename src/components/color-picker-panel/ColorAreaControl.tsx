import { useRef, useCallback } from 'react'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

export function ColorAreaControl() {
  const ctx = useColorPickerPanelContext()
  const areaRef = useRef<HTMLDivElement>(null)

  const hsb = ctx.hsbColor

  // Derive hue from RGB model
  const hue = hsb.h ?? 0
  const saturation = (hsb.s ?? 0) / 100
  const brightness = (hsb.b ?? 0) / 100

  function updateFromPointer(e: PointerEvent | React.PointerEvent) {
    const el = areaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const newSaturation = x * 100
    const newBrightness = (1 - y) * 100
    ctx.updateHSBChannelValue('s', newSaturation)
    ctx.updateHSBChannelValue('b', newBrightness)
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPointer(e)
  }, [ctx])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    updateFromPointer(e)
  }, [ctx])

  const thumbX = saturation * 100
  const thumbY = (1 - brightness) * 100

  return (
    <div
      ref={areaRef}
      className="relative h-[140px] w-full cursor-crosshair overflow-hidden rounded"
      style={{
        background: `linear-gradient(to top, black, transparent), linear-gradient(to right, white, hsl(${hue}, 100%, 50%))`
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <div
        className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
        style={{ left: `${thumbX}%`, top: `${thumbY}%` }}
      />
    </div>
  )
}
