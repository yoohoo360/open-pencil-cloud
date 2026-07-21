import { memo, useCallback, useMemo, type ReactNode } from 'react'
import { tv } from 'tailwind-variants'
import { SegmentedControlItem, SegmentedControlRoot } from '@open-pencil/react'

import type { ComponentUI } from '@/components/ui/types'
import type { SegmentedControlTheme } from '@/theme/segmented-control'
import theme from '@/theme/segmented-control'

export type SegmentedControlOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SegmentedControlUI = ComponentUI<SegmentedControlTheme>

export type SegmentedControlProps = {
  value: string
  onValueChange: (value: string) => void
  options: SegmentedControlOption[]
  label?: string
  size?: keyof SegmentedControlTheme['variants']['size']
  ui?: SegmentedControlUI
  onChange?: (value: string) => void
  renderOption?: (props: { option: SegmentedControlOption; selected: boolean }) => ReactNode
}

export const SegmentedControl = memo(function SegmentedControl({
  value,
  onValueChange,
  options,
  label,
  size = 'sm',
  ui,
  onChange,
  renderOption
}: SegmentedControlProps) {
  const styles = useMemo(() => tv(theme)({ size }), [size])

  const select = useCallback(
    (next: string | string[] | undefined) => {
      if (typeof next !== 'string') return
      onValueChange(next)
      onChange?.(next)
    },
    [onChange, onValueChange]
  )

  return (
    <SegmentedControlRoot
      modelValue={value}
      aria-label={label}
      className={styles.root({ class: ui?.root })}
      onValueChange={select}
    >
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          disabled={option.disabled}
          className={styles.item({ class: ui?.item })}
        >
          {({ selected }) =>
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
})

SegmentedControl.displayName = 'SegmentedControl'
export default SegmentedControl
