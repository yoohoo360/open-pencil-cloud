import { useRef, useState, type ReactNode } from 'react'

import { addEventListener } from '../internal/useEventListener'
import { ScrubInputProvider } from './context'

export interface ScrubInputRootSlotProps {
  modelValue: number | symbol
  displayValue: string
  isMixed: boolean
  editing: boolean
  scrubbing: boolean
  startScrub: (e: PointerEvent) => void
  startEdit: () => void
  commitEdit: (e: Event) => void
  keydown: (e: KeyboardEvent) => void
  placeholder: string
}

export interface ScrubInputRootProps {
  value: number | symbol
  min?: number
  max?: number
  step?: number
  sensitivity?: number
  placeholder?: string
  onValueChange?: (value: number) => void
  onCommit?: (value: number, previous: number) => void
  children?: ReactNode | ((state: ScrubInputRootSlotProps) => ReactNode)
}

export function ScrubInputRoot({
  value: modelValue,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 1,
  placeholder = 'Mixed',
  onValueChange,
  onCommit,
  children
}: ScrubInputRootProps) {
  const [editing, setEditing] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isMixed = typeof modelValue === 'symbol'
  const numericValue = isMixed ? 0 : (modelValue as number)
  const displayValue = isMixed ? '' : String(Math.round(numericValue))

  function startScrub(e: PointerEvent) {
    e.preventDefault()
    const startX = e.clientX
    let lastX = startX
    let accumulated = numericValue
    const valueBeforeScrub = numericValue
    let hasMoved = false
    let currentValue = typeof modelValue === 'number' ? modelValue : numericValue

    const stopMove = addEventListener(document, 'pointermove', (ev) => {
      const pev = ev as PointerEvent
      const dx = pev.clientX - lastX
      lastX = pev.clientX
      if (!hasMoved && Math.abs(pev.clientX - startX) > 2) {
        hasMoved = true
        setScrubbing(true)
        document.body.style.cursor = 'ew-resize'
      }
      if (hasMoved) {
        accumulated += dx * step * sensitivity
        const clamped = Math.round(Math.min(max, Math.max(min, accumulated)))
        if (clamped !== currentValue) {
          currentValue = clamped
          onValueChange?.(clamped)
        }
      }
    })

    const stopUp = addEventListener(document, 'pointerup', () => {
      setScrubbing(false)
      document.body.style.cursor = ''
      stopMove()
      stopUp()
      if (hasMoved) {
        if (currentValue !== valueBeforeScrub) {
          onCommit?.(currentValue, valueBeforeScrub)
        }
      } else {
        startEdit()
      }
    })
  }

  function startEdit() {
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  function commitEdit(e: Event) {
    const val = +(e.target as HTMLInputElement).value
    const previous = numericValue
    if (!Number.isNaN(val)) {
      const clamped = Math.min(max, Math.max(min, val))
      onValueChange?.(clamped)
      if (clamped !== previous) onCommit?.(clamped, previous)
    }
    setEditing(false)
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.code === 'Enter') commitEdit(e)
    else if (e.code === 'Escape') setEditing(false)
  }

  const slot: ScrubInputRootSlotProps = {
    modelValue,
    displayValue,
    isMixed,
    editing,
    scrubbing,
    startScrub,
    startEdit,
    commitEdit,
    keydown: onKeydown,
    placeholder
  }

  const content = typeof children === 'function' ? children(slot) : children

  return (
    <ScrubInputProvider
      value={{
        modelValue,
        displayValue,
        isMixed,
        editing,
        scrubbing,
        inputRef,
        startScrub,
        startEdit,
        commitEdit,
        onKeydown,
        placeholder
      }}
    >
      {content}
    </ScrubInputProvider>
  )
}
