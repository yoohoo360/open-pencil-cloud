import { panelFieldBase } from '#react/theme/panel/field'

export type AppSelectOption<T extends string | number> = {
  value: T
  label: string
  disabled?: boolean
}

export function AppSelect<T extends string | number>({
  value,
  options,
  label,
  className,
  onChange,
  'data-property': dataProperty,
  'data-test-id': dataTestId
}: {
  value: T
  options: AppSelectOption<T>[]
  label?: string
  className?: string
  onChange: (value: T) => void
  'data-property'?: string
  'data-test-id'?: string
}) {
  return (
    <select
      aria-label={label}
      data-property={dataProperty}
      data-test-id={dataTestId}
      className={`${panelFieldBase} w-full min-w-0 cursor-pointer px-1.5 text-[11px] ${className ?? ''}`}
      value={String(value)}
      onChange={(event) => {
        const next = options.find((option) => String(option.value) === event.target.value)
        if (next && String(next.value) !== String(value)) onChange(next.value)
      }}
    >
      {options.map((option) => (
        <option key={String(option.value)} value={String(option.value)} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export type AppSelectGroup<T extends string> = {
  label: string
  items: AppSelectOption<T>[]
}

export function AppGroupedSelect<T extends string>({
  value,
  groups,
  label,
  className,
  onChange,
  'data-property': dataProperty
}: {
  value: T
  groups: AppSelectGroup<T>[]
  label?: string
  className?: string
  onChange: (value: T) => void
  'data-property'?: string
}) {
  return (
    <select
      aria-label={label}
      data-property={dataProperty}
      className={`${panelFieldBase} w-full min-w-0 cursor-pointer px-1.5 text-[11px] ${className ?? ''}`}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.items.map((item) => (
            <option key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
