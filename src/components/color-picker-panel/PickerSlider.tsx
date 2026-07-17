import { usePickerSliderUI } from '@/components/ui/picker-slider'
import type { PickerSliderUI } from '@/components/ui/picker-slider'

interface PickerSliderDisplay {
  value?: number
  min?: number
  max?: number
  step?: number
  format?: (value: number) => string | number
  parse?: (value: number) => number
}

interface PickerSliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display?: PickerSliderDisplay
  gradientStyle?: string
  checkerboard?: boolean
  thumbFill?: string
  ui?: PickerSliderUI
  'data-test-id'?: string
  onChange?: (value: number) => void
}

export function PickerSlider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  gradientStyle,
  checkerboard = false,
  thumbFill = '#fff',
  ui,
  'data-test-id': testId,
  onChange
}: PickerSliderProps) {
  const cls = usePickerSliderUI({ checkerboard, ui })

  function numberValue(): string | number {
    const val = display?.value ?? value
    return display?.format ? display.format(val) : val
  }

  function handleNumberChange(rawValue: number) {
    onChange?.(display?.parse ? display.parse(rawValue) : rawValue)
  }

  function thumbLeft(): string {
    const range = max - min
    const ratio = range === 0 ? 0 : (value - min) / range
    const clamped = Math.max(0, Math.min(1, ratio))
    return `calc(${clamped * 100}% - ${clamped * 14}px)`
  }

  return (
    <div className={cls.root} data-test-id={testId}>
      <span className={cls.label}>{label}</span>
      <div className={cls.track}>
        <div className={cls.gradient} style={gradientStyle ? { background: gradientStyle.replace(/^background: /, '') } : undefined} />
        <input
          type="range"
          className={cls.range}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(e.target.valueAsNumber)}
        />
        <div className={cls.thumb} style={{ left: thumbLeft(), background: thumbFill }} />
      </div>
      <input
        type="number"
        className={cls.input}
        min={display?.min ?? min}
        max={display?.max ?? max}
        step={display?.step ?? step}
        value={numberValue()}
        onChange={(e) => handleNumberChange(e.target.valueAsNumber)}
      />
    </div>
  )
}
