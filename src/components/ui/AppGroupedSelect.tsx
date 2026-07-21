import * as Select from '@radix-ui/react-select'
import IconLucideChevronDown from '~icons/lucide/chevron-down'
import { Fragment, memo, useMemo, type ReactNode } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import type { AppGroupedSelectTheme } from '@/theme/app-grouped-select'
import theme from '@/theme/app-grouped-select'

export type SelectOption<TValue extends string | number> = {
  value: TValue
  label: string
}

export type SelectGroupDef<TValue extends string | number> = {
  label?: string
  items: SelectOption<TValue>[]
}

export type AppGroupedSelectProps<TValue extends string | number> = {
  value: TValue
  onValueChange: (value: TValue) => void
  groups: SelectGroupDef<TValue>[]
  displayValue: string
  ui?: ComponentUI<AppGroupedSelectTheme>
  className?: string
  children?: ReactNode
}

export function AppGroupedSelect<TValue extends string | number>({
  value,
  onValueChange,
  groups,
  displayValue,
  ui,
  className,
  children
}: AppGroupedSelectProps<TValue>) {
  const styles = useMemo(() => tv(theme)(), [])

  return (
    <Select.Root
      value={String(value)}
      onValueChange={(next) => {
        for (const group of groups) {
          const match = group.items.find((item) => String(item.value) === next)
          if (match) {
            onValueChange(match.value)
            return
          }
        }
      }}
    >
      <Select.Trigger className={styles.trigger({ class: [ui?.trigger, className] })}>
        {children ?? displayValue}
        <IconLucideChevronDown className="size-2.5 shrink-0 text-muted" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className={styles.content({ class: ui?.content })}
        >
          <Select.Viewport className={styles.viewport({ class: ui?.viewport })}>
            {groups.map((group, index) => (
              <Fragment key={index}>
                <Select.Group>
                  {group.label ? (
                    <Select.Label className={styles.label({ class: ui?.label })}>
                      {group.label}
                    </Select.Label>
                  ) : null}
                  {group.items.map((item) => (
                    <Select.Item
                      key={String(item.value)}
                      value={String(item.value)}
                      className={styles.item({ class: ui?.item })}
                    >
                      <Select.ItemText>{item.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Group>
                {index < groups.length - 1 ? (
                  <Select.Separator className={styles.separator({ class: ui?.separator })} />
                ) : null}
              </Fragment>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export default memo(AppGroupedSelect)
