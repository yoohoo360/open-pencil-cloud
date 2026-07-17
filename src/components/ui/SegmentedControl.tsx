import type { ReactNode } from 'react'
import { tv } from 'tailwind-variants'

import { SegmentedControlItem, SegmentedControlRoot } from '@open-pencil/react'

import type { ComponentUI } from '@/components/ui/types'
import type { SegmentedControlTheme } from '@/theme/segmented-control'
import theme from '@/theme/segmented-control'

export interface SegmentedControlOption {
  value: string
  label: string
  disabled?: boolean
}

export type SegmentedControlUI = ComponentUI<SegmentedControlTheme>

export interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  label?: string
  size?: keyof SegmentedControlTheme['variants']['size']
  className?: string
  ui?: SegmentedControlUI
  onChange?: (value: string) => void
  renderOption?: (props: { option: SegmentedControlOption; selected: boolean }) => ReactNode
  'data-story-control'?: string
}

export function SegmentedControl({
  options,
  value,
  label,
  size = 'sm',
  className,
  ui,
  onChange,
  renderOption,
  'data-story-control': dataStoryControl
}: SegmentedControlProps) {
  const styles = tv(theme)({ size })

  function handleChange(val: string | string[] | undefined) {
    if (typeof val === 'string') onChange?.(val)
  }

  return (
    <SegmentedControlRoot
      value={value}
      aria-label={label}
      className={styles.root({ class: [className, ui?.root] })}
      data-story-control={dataStoryControl}
      onValueChange={handleChange}
    >
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          disabled={option.disabled}
          className={styles.item({ class: ui?.item })}
        >
          {({ selected }: { selected: boolean }) =>
            renderOption ? (
              renderOption({ option, selected })
            ) : (
              <span className="truncate">{option.label}</span>
            )
          }
        </SegmentedControlItem>
      ))}
    </SegmentedControlRoot>
  )
}
