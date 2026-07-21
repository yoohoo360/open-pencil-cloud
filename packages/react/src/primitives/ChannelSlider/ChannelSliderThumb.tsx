import { useChannelSlider } from '#react/primitives/ChannelSlider/context'
import type {
  ChannelSliderPartProps,
  ChannelSliderThumbSlotProps
} from '#react/primitives/ChannelSlider/types'
import { memo, type ReactNode } from 'react'

export type ChannelSliderThumbProps = ChannelSliderPartProps & {
  children?: ReactNode | ((props: ChannelSliderThumbSlotProps) => ReactNode)
}

export const ChannelSliderThumb = memo(function ChannelSliderThumb({
  children,
  ...props
}: ChannelSliderThumbProps) {
  const { label, value, valueText } = useChannelSlider()
  const slotProps = { label, value, valueText }

  return (
    <span {...props} aria-label={label} aria-valuetext={valueText} data-slot="thumb">
      {typeof children === 'function' ? children(slotProps) : children}
    </span>
  )
})

ChannelSliderThumb.displayName = 'ChannelSliderThumb'
