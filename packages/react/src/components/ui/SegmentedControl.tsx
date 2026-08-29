import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'

import type { ComponentUI } from '#react/components/ui/types'
import theme from '#react/theme/segmented-control'
import type { SegmentedControlTheme } from '#react/theme/segmented-control'

export type SegmentedControlOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SegmentedControlUI = ComponentUI<SegmentedControlTheme>

export function SegmentedControl({
  value,
  options,
  label,
  size = 'sm',
  ui,
  onChange,
  renderOption
}: {
  value: string
  options: SegmentedControlOption[]
  label?: string
  size?: keyof SegmentedControlTheme['variants']['size']
  ui?: SegmentedControlUI
  onChange: (value: string) => void
  renderOption?: (option: SegmentedControlOption, selected: boolean) => ReactNode
}) {
  const styles = tv(theme)({ size })
  return (
    <div role="tablist" aria-label={label} className={styles.root({ class: ui?.root })}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-label={option.label}
            aria-selected={selected}
            data-state={selected ? 'on' : 'off'}
            disabled={option.disabled}
            className={styles.item({ class: ui?.item })}
            onClick={() => onChange(option.value)}
          >
            {renderOption ? renderOption(option, selected) : <span className="truncate">{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
