import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

import { selectContent, selectItem, selectTrigger } from '@/react_app/ui/select'

export interface AppSelectOption<T extends string | number> {
  value: T
  label: string
}

export function AppSelect<T extends string | number>({
  value,
  options,
  onValueChange,
  placeholder,
  disabled,
  className,
  testId = 'app-select-trigger',
  triggerClassName,
  contentClassName,
  itemClassName
}: {
  value: T
  options: AppSelectOption<T>[]
  onValueChange: (value: T) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  testId?: string
  triggerClassName?: string
  contentClassName?: string
  itemClassName?: string
}) {
  return (
    <Select.Root
      value={String(value)}
      disabled={disabled}
      onValueChange={(v) => {
        const match = options.find((o) => String(o.value) === v)
        if (match) onValueChange(match.value)
      }}
    >
      <Select.Trigger
        data-test-id={testId}
        className={twMerge(
          selectTrigger({
            className: twMerge('min-w-0 flex-1 rounded px-1.5 py-1 text-xs', triggerClassName)
          }),
          className
        )}
      >
        <Select.Value placeholder={placeholder} />
        <ChevronDown className="ml-1 size-3 shrink-0 text-muted" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={2}
          className={selectContent({
            className: twMerge('max-h-56', contentClassName)
          })}
        >
          <Select.Viewport className="p-0.5">
            {options.map((opt) => (
              <Select.Item
                key={String(opt.value)}
                value={String(opt.value)}
                className={selectItem({
                  className: twMerge('rounded py-1.5 pr-2 pl-6 text-xs', itemClassName)
                })}
              >
                <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center justify-center">
                  <Check className="size-3 text-accent" />
                </Select.ItemIndicator>
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
