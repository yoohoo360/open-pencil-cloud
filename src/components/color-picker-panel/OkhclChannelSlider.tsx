import {
  ChannelSliderRoot,
  ChannelSliderThumb,
  ChannelSliderTrack
} from '@open-pencil/react'
import { memo, useMemo, type CSSProperties } from 'react'

import NumberField from '@/components/inputs/NumberField'
import type { ColorSliderUI } from '@/components/color-picker-panel/ui'
import { useColorSliderUI } from '@/components/color-picker-panel/ui'

function gradientStyle(gradient?: string): CSSProperties | undefined {
  if (!gradient) return undefined
  const value = gradient.startsWith('background:')
    ? gradient.slice('background:'.length).trim().replace(/;$/, '')
    : gradient
  return { background: value }
}

export type OkhclChannelSliderProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  displayValue: number
  displayMin: number
  displayMax: number
  displayStep?: number
  suffix?: string
  gradient?: string
  checkerboard?: boolean
  thumbFill?: string
  formatValueText?: (value: number) => string
  ui?: ColorSliderUI
  onValueChange: (value: number) => void
  onDisplayChange: (value: number) => void
  'data-test-id'?: string
}

export const OkhclChannelSlider = memo(function OkhclChannelSlider({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  displayMin,
  displayMax,
  displayStep = 1,
  suffix,
  gradient,
  checkerboard = false,
  thumbFill = '#fff',
  formatValueText,
  ui,
  onValueChange,
  onDisplayChange,
  'data-test-id': dataTestId
}: OkhclChannelSliderProps) {
  const styles = useColorSliderUI(checkerboard, ui)
  const trackStyle = useMemo(() => gradientStyle(gradient), [gradient])

  return (
    <div className={styles.root}>
      <span className={styles.label}>{label}</span>
      <ChannelSliderRoot
        className={styles.slider}
        data-slot="slider"
        data-test-id={dataTestId}
        formatValueText={formatValueText}
        label={label}
        max={max}
        min={min}
        modelValue={value}
        step={step}
        onValueChange={onValueChange}
      >
        <ChannelSliderTrack className={styles.track} style={trackStyle} />
        <ChannelSliderThumb className={styles.thumb} style={{ background: thumbFill }} />
      </ChannelSliderRoot>
      <NumberField
        aria-label={label}
        className={styles.input}
        max={displayMax}
        min={displayMin}
        step={displayStep}
        suffix={suffix}
        ui={{ leading: 'hidden' }}
        value={displayValue}
        onValueChange={onDisplayChange}
      />
    </div>
  )
})

OkhclChannelSlider.displayName = 'OkhclChannelSlider'
export default OkhclChannelSlider
