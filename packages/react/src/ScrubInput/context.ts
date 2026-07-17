import type { RefObject } from 'react'

export interface ScrubInputContext {
  modelValue: number | symbol
  displayValue: string
  isMixed: boolean
  editing: boolean
  scrubbing: boolean
  inputRef: RefObject<HTMLInputElement | null>
  startScrub: (e: React.PointerEvent) => void
  startEdit: () => void
  commitEdit: (e: React.FormEvent | React.FocusEvent) => void
  onKeydown: (e: React.KeyboardEvent) => void
}

import { createContext } from '../context/createContext'

export const [useScrubInput, ScrubInputProvider] = createContext<ScrubInputContext>('scrub-input')

/** @deprecated Use ScrubInputProvider */
export function provideScrubInput(_ctx: ScrubInputContext): never {
  throw new Error('[open-pencil] provideScrubInput is Vue-only. Use <ScrubInputProvider value={...}>.')
}
