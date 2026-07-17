import { useCallback, useRef, useState, type ReactNode } from 'react'

import { ScrubInputProvider } from './context'

import type { ScrubInputContext } from './context'

export interface ScrubInputRootProps {
  modelValue: number | symbol
  min?: number
  max?: number
  step?: number
  sensitivity?: number
  placeholder?: string
  onChange?: (value: number) => void
  onCommit?: (value: number, previous: number) => void
  children: (ctx: ScrubInputContext) => ReactNode
}

export function ScrubInputRoot({
  modelValue,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 1,
  placeholder = 'Mixed',
  onChange,
  onCommit,
  children
}: ScrubInputRootProps) {
  const [editing, setEditing] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isMixed = typeof modelValue === 'symbol'
  const numericValue = isMixed ? 0 : (modelValue as number)
  const displayValue = isMixed ? '' : String(Math.round(numericValue))

  const pendingOnChange = useRef<number | null>(null)
  const rafId = useRef<number>(0)

  const flushOnChange = useCallback(() => {
    rafId.current = 0
    if (pendingOnChange.current !== null) {
      onChange?.(pendingOnChange.current)
      pendingOnChange.current = null
    }
  }, [onChange])

  const scheduleOnChange = useCallback(
    (value: number) => {
      pendingOnChange.current = value
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(flushOnChange)
      }
    },
    [flushOnChange]
  )

  const startScrub = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const startX = e.clientX
      let lastX = startX
      let accumulated = numericValue
      const valueBeforeScrub = numericValue
      let hasMoved = false
      let currentValue = numericValue

      function onMove(ev: PointerEvent) {
        const dx = ev.clientX - lastX
        lastX = ev.clientX
        if (!hasMoved && Math.abs(ev.clientX - startX) > 2) {
          hasMoved = true
          setScrubbing(true)
          document.body.style.cursor = 'ew-resize'
        }
        if (hasMoved) {
          accumulated += dx * step * sensitivity
          const clamped = Math.round(Math.min(max, Math.max(min, accumulated)))
          if (clamped !== currentValue) {
            currentValue = clamped
            scheduleOnChange(clamped)
          }
        }
      }

      function onUp() {
        setScrubbing(false)
        document.body.style.cursor = ''
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        if (hasMoved) {
          if (rafId.current) {
            cancelAnimationFrame(rafId.current)
            rafId.current = 0
          }
          if (currentValue !== valueBeforeScrub) {
            onChange?.(currentValue)
            onCommit?.(currentValue, valueBeforeScrub)
          }
        } else {
          startEdit()
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [numericValue, step, sensitivity, min, max, scheduleOnChange, onChange, onCommit]
  )

  const startEdit = useCallback(() => {
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }, [])

  const commitEdit = useCallback(
    (e: React.FormEvent | React.FocusEvent | React.KeyboardEvent) => {
      const val = +(e.target as HTMLInputElement).value
      const previous = numericValue
      if (!Number.isNaN(val)) {
        const clamped = Math.min(max, Math.max(min, val))
        onChange?.(clamped)
        if (clamped !== previous) onCommit?.(clamped, previous)
      }
      setEditing(false)
    },
    [numericValue, min, max, onChange, onCommit]
  )

  const onKeydown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.code === 'Enter') commitEdit(e)
      else if (e.code === 'Escape') setEditing(false)
    },
    [commitEdit]
  )

  const ctx: ScrubInputContext = {
    modelValue,
    displayValue,
    isMixed,
    editing,
    scrubbing,
    inputRef,
    startScrub,
    startEdit,
    commitEdit,
    onKeydown
  }

  return <ScrubInputProvider value={ctx}>{children(ctx)}</ScrubInputProvider>
}

export default ScrubInputRoot
