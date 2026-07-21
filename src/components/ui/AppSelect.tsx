import * as Select from '@radix-ui/react-select'
import IconLucideCheck from '~icons/lucide/check'
import IconLucideChevronDown from '~icons/lucide/chevron-down'
import IconLucideChevronUp from '~icons/lucide/chevron-up'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { AppSelectTheme } from '@/theme/app-select'
import theme from '@/theme/app-select'

export type AppSelectOption<TValue extends string | number> = {
  value: TValue
  label: string
}

export type AppSelectProps<TValue extends string | number> = {
  value: TValue
  onValueChange: (value: TValue) => void
  label?: string
  options: AppSelectOption<TValue>[]
  placeholder?: string
  ui?: ComponentUI<AppSelectTheme>
  className?: string
}

export function AppSelect<TValue extends string | number>({
  value,
  onValueChange,
  options,
  label,
  placeholder,
  ui,
  className
}: AppSelectProps<TValue>) {
  const styles = useMemo(() => tv(theme)(), [])

  return (
    <Select.Root
      value={String(value)}
      onValueChange={(next) => {
        const match = options.find((opt) => String(opt.value) === next)
        if (match) onValueChange(match.value)
      }}
    >
      <Select.Trigger
        className={styles.trigger({ class: [ui?.trigger, className] })}
        aria-label={label}
      >
        <Select.Value placeholder={placeholder} className={styles.value({ class: ui?.value })} />
        <IconLucideChevronDown className="ml-1 size-3 shrink-0 text-muted" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={2}
          className={styles.content({ class: ui?.content })}
        >
          <Select.ScrollUpButton className="flex items-center justify-center py-0.5 text-muted">
            <IconLucideChevronUp className="size-3.5" />
          </Select.ScrollUpButton>
          <Select.Viewport className={styles.viewport({ class: ui?.viewport })}>
            {options.map((opt) => (
              <Select.Item
                key={String(opt.value)}
                value={String(opt.value)}
                className={styles.item({ class: ui?.item })}
              >
                <Select.ItemIndicator className={styles.indicator({ class: ui?.indicator })}>
                  <IconLucideCheck className="size-3 text-accent" />
                </Select.ItemIndicator>
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="flex items-center justify-center py-0.5 text-muted">
            <IconLucideChevronDown className="size-3.5" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export default memo(AppSelect)
