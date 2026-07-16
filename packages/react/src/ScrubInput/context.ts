import { createContext } from '../context/createContext'

import type { RefObject } from 'react'

export interface ScrubInputContext {
  modelValue: number | symbol
  displayValue: string
  isMixed: boolean
  editing: boolean
  scrubbing: boolean
  inputRef: RefObject<HTMLInputElement | null>
  startScrub: (e: PointerEvent) => void
  startEdit: () => void
  commitEdit: (e: Event) => void
  onKeydown: (e: KeyboardEvent) => void
  placeholder: string
}

export const [useScrubInput, ScrubInputProvider] = createContext<ScrubInputContext>('ScrubInput')
