import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  Root as SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport
} from '@radix-ui/react-select'
import { tv } from 'tailwind-variants'
import IconLucideCheck from '~icons/lucide/check'
import IconLucideChevronDown from '~icons/lucide/chevron-down'

import type { ComponentUI } from '@/components/ui/types'
import type { AppSelectTheme } from '@/theme/app-select'
import theme from '@/theme/app-select'

export interface AppSelectProps<T extends string | number = string> {
  value: T
  options: { value: T; label: string }[]
  label?: string
  placeholder?: string
  ui?: ComponentUI<AppSelectTheme>
  onChange?: (value: T) => void
  className?: string
  'aria-label'?: string
  'data-story-control'?: string
}

export function AppSelect<T extends string | number = string>({
  value,
  options,
  label,
  placeholder,
  ui,
  onChange,
  className,
  'aria-label': ariaLabel,
  'data-story-control': dataStoryControl
}: AppSelectProps<T>) {
  const styles = tv(theme)()

  function handleChange(val: string) {
    if (onChange) {
      const typed = (typeof value === 'number' ? Number(val) : val) as T
      onChange(typed)
    }
  }

  return (
    <SelectRoot value={String(value)} onValueChange={handleChange}>
      <SelectTrigger
        className={styles.trigger({ class: [ui?.trigger, className] })}
        aria-label={ariaLabel ?? label}
        data-story-control={dataStoryControl}
      >
        <SelectValue placeholder={placeholder} className={styles.value({ class: ui?.value })} />
        <IconLucideChevronDown className="ml-1 size-3 shrink-0 text-muted" />
      </SelectTrigger>
      <SelectPortal>
        <SelectContent
          position="popper"
          sideOffset={2}
          className={styles.content({ class: ui?.content })}
        >
          <SelectViewport className={styles.viewport({ class: ui?.viewport })}>
            {options.map((opt) => (
              <SelectItem
                key={String(opt.value)}
                value={String(opt.value)}
                className={styles.item({ class: ui?.item })}
              >
                <SelectItemIndicator className={styles.indicator({ class: ui?.indicator })}>
                  <IconLucideCheck className="size-3 text-accent" />
                </SelectItemIndicator>
                <SelectItemText>{opt.label}</SelectItemText>
              </SelectItem>
            ))}
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  )
}
