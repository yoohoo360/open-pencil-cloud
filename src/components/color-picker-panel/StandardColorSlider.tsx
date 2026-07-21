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

export type StandardColorSliderProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  numberStep?: number
  suffix?: string
  checkerboard?: boolean
  thumbFill?: string
  gradient?: string
  ui?: ColorSliderUI
  onValueChange: (value: number) => void
  'data-test-id'?: string
}

export const StandardColorSlider = memo(function StandardColorSlider({
  label,
  value,
  min,
  max,
  step = 1,
  numberStep = 1,
  suffix,
  checkerboard = false,
  thumbFill = '#fff',
  gradient,
  ui,
  onValueChange,
  'data-test-id': dataTestId
}: StandardColorSliderProps) {
  const styles = useColorSliderUI(checkerboard, ui)
  const trackStyle = useMemo(() => gradientStyle(gradient), [gradient])

  return (
    <div className={styles.root}>
      <span className={styles.label}>{label}</span>
      <ChannelSliderRoot
        className={styles.slider}
        data-slot="slider"
        data-test-id={dataTestId}
        formatValueText={String}
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
        max={max}
        min={min}
        step={numberStep}
        suffix={suffix}
        ui={{ leading: 'hidden' }}
        value={value}
        onValueChange={onValueChange}
      />
    </div>
  )
})

StandardColorSlider.displayName = 'StandardColorSlider'
export default StandardColorSlider
