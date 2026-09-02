import { tv } from 'tailwind-variants'
import type { ReactNode } from 'react'
import { SelectContent, SelectGroup, SelectItem, SelectItemText, SelectLabel, SelectPortal, Root as SelectRoot, SelectSeparator, SelectTrigger, SelectViewport } from '@radix-ui/react-select'

import IconLucideChevronDown from '~icons/lucide/chevron-down'

import type { AppGroupedSelectTheme } from '@/theme/app-grouped-select'
import type { ComponentUI } from '@/components/ui/types'
import theme from '@/theme/app-grouped-select'

export interface SelectOption<T extends string | number = string> {
  value: T
  label: string
}

export interface SelectGroupDef<T extends string | number = string> {
  label?: string
  items: SelectOption<T>[]
}

export interface AppGroupedSelectProps<T extends string | number = string> {
  value: T
  groups: SelectGroupDef<T>[]
  displayValue: string
  ui?: ComponentUI<AppGroupedSelectTheme>
  onChange?: (value: T) => void
  className?: string
  valueSlot?: ReactNode
}

export function AppGroupedSelect<T extends string | number = string>({
  value,
  groups,
  displayValue,
  ui,
  onChange,
  className,
  valueSlot
}: AppGroupedSelectProps<T>) {
  const styles = tv(theme)()

  function handleChange(val: string) {
    if (onChange) {
      const typed = (typeof value === 'number' ? Number(val) : val) as T
      onChange(typed)
    }
  }

  return (
    <SelectRoot value={String(value)} onValueChange={handleChange}>
      <SelectTrigger className={styles.trigger({ class: [ui?.trigger, className] })}>
        {valueSlot ?? displayValue}
        <IconLucideChevronDown className="size-2.5 shrink-0 text-muted" />
      </SelectTrigger>
      <SelectPortal>
        <SelectContent
          position="popper"
          sideOffset={4}
          className={styles.content({ class: ui?.content })}
        >
          <SelectViewport className={styles.viewport({ class: ui?.viewport })}>
            {groups.map((group, index) => (
              <>
                <SelectGroup key={index}>
                  {group.label && (
                    <SelectLabel className={styles.label({ class: ui?.label })}>
                      {group.label}
                    </SelectLabel>
                  )}
                  {group.items.map((item) => (
                    <SelectItem
                      key={String(item.value)}
                      value={String(item.value)}
                      className={styles.item({ class: ui?.item })}
                    >
                      <SelectItemText>{item.label}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectGroup>
                {index < groups.length - 1 && (
                  <SelectSeparator className={styles.separator({ class: ui?.separator })} />
                )}
              </>
            ))}
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  )
}
