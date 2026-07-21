import type { ChannelSliderOrientation } from '#react/primitives/ChannelSlider/types'
import { createContext, useContext } from 'react'

export interface ChannelSliderContextValue {
  value: number
  label: string
  valueText: string
  min: number
  max: number
  step: number
  disabled: boolean
  orientation: ChannelSliderOrientation
}

export const ChannelSliderContext = createContext<ChannelSliderContextValue | null>(null)
ChannelSliderContext.displayName = 'ChannelSlider'

export function useChannelSlider(): ChannelSliderContextValue {
  const context = useContext(ChannelSliderContext)
  if (!context)
    throw new Error('[open-pencil] ChannelSlider part must be used inside ChannelSliderRoot')
  return context
}
