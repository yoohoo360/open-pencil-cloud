import type { ChannelSliderPartProps } from '#react/primitives/ChannelSlider/types'
import { memo, type ReactNode } from 'react'

export type ChannelSliderTrackProps = ChannelSliderPartProps & { children?: ReactNode }

export const ChannelSliderTrack = memo(function ChannelSliderTrack({
  children,
  ...props
}: ChannelSliderTrackProps) {
  return (
    <span {...props} data-slot="track">
      {children}
    </span>
  )
})

ChannelSliderTrack.displayName = 'ChannelSliderTrack'
