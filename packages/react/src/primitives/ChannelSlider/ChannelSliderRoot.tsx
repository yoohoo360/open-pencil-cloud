import { ChannelSliderContext } from '#react/primitives/ChannelSlider/context'
import type {
  ChannelSliderRootProps,
  ChannelSliderRootSlotProps
} from '#react/primitives/ChannelSlider/types'
import { memo, useMemo, type ReactNode } from 'react'

export type ChannelSliderRootComponentProps = Omit<
  ChannelSliderRootProps,
  'children' | 'onChange'
> & {
  children?: ReactNode | ((props: ChannelSliderRootSlotProps) => ReactNode)
  onValueChange?: (value: number) => void
  onValueCommit?: (value: number) => void
}

/**
 * Scalar color-channel slider used for OkHCL until a dedicated React color slider exists.
 */
export const ChannelSliderRoot = memo(function ChannelSliderRoot({
  modelValue,
  label,
  min = 0,
  max = 100,
  step = 1,
  orientation = 'horizontal',
  disabled = false,
  inverted = false,
  formatValueText = String,
  children,
  onValueChange,
  onValueCommit,
  ...props
}: ChannelSliderRootComponentProps) {
  const valueText = formatValueText(modelValue)
  const slotProps = useMemo<ChannelSliderRootSlotProps>(
    () => ({ value: modelValue, min, max, step, disabled, orientation }),
    [disabled, max, min, modelValue, orientation, step]
  )
  const context = useMemo(
    () => ({
      value: modelValue,
      label,
      valueText,
      min,
      max,
      step,
      disabled,
      orientation
    }),
    [disabled, label, max, min, modelValue, orientation, step, valueText]
  )

  return (
    <ChannelSliderContext.Provider value={context}>
      <span {...props} data-slot="root" data-orientation={orientation}>
        <input
          aria-label={label}
          aria-valuetext={valueText}
          className="sr-only"
          disabled={disabled}
          max={max}
          min={min}
          onChange={(event) => onValueChange?.(event.currentTarget.valueAsNumber)}
          onPointerUp={(event) => onValueCommit?.(event.currentTarget.valueAsNumber)}
          step={step}
          type="range"
          value={inverted ? max - (modelValue - min) : modelValue}
        />
        {typeof children === 'function' ? children(slotProps) : children}
      </span>
    </ChannelSliderContext.Provider>
  )
})

ChannelSliderRoot.displayName = 'ChannelSliderRoot'
