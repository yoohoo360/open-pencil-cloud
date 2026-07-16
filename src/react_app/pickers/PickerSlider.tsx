import { usePickerSliderUI, type PickerSliderUi } from '@/react_app/ui/pickerSlider'

import type { CSSProperties } from 'react'

export function PickerSlider({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  displayMin,
  displayMax,
  displayStep,
  formatDisplay,
  parseDisplay,
  gradientStyle,
  checkerboard = false,
  thumbFill = '#fff',
  testId,
  ui,
  onValueChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  displayValue?: number
  displayMin?: number
  displayMax?: number
  displayStep?: number
  formatDisplay?: (value: number) => string | number
  parseDisplay?: (value: number) => number
  gradientStyle?: string
  checkerboard?: boolean
  thumbFill?: string
  testId?: string
  ui?: PickerSliderUi
  onValueChange: (value: number) => void
}) {
  const cls = usePickerSliderUI({ checkerboard, ui })

  function numberValue(): string | number {
    const v = displayValue ?? value
    return formatDisplay ? formatDisplay(v) : v
  }

  function handleNumberChange(next: number) {
    onValueChange(parseDisplay ? parseDisplay(next) : next)
  }

  function thumbLeft(): string {
    const range = max - min
    const ratio = range === 0 ? 0 : (value - min) / range
    const clampedRatio = Math.max(0, Math.min(1, ratio))
    return `calc(${clampedRatio * 100}% - ${clampedRatio * 14}px)`
  }

  return (
    <div className={cls.root} data-test-id={testId}>
      <span className={cls.label}>{label}</span>
      <div className={cls.track}>
        <div className={cls.gradient} style={cssStringToStyle(gradientStyle)} />
        <input
          type="range"
          className={cls.range}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange(+e.currentTarget.value)}
        />
        <div className={cls.thumb} style={{ left: thumbLeft(), background: thumbFill }} />
      </div>
      <input
        type="number"
        className={cls.input}
        min={displayMin ?? min}
        max={displayMax ?? max}
        step={displayStep ?? step}
        value={numberValue()}
        onChange={(e) => handleNumberChange(+e.currentTarget.value)}
      />
    </div>
  )
}

function cssStringToStyle(gradientStyle?: string): CSSProperties | undefined {
  if (!gradientStyle) return undefined
  if (gradientStyle.startsWith('background:')) {
    return { background: gradientStyle.slice('background:'.length).trim().replace(/;$/, '') }
  }
  return { background: gradientStyle }
}
