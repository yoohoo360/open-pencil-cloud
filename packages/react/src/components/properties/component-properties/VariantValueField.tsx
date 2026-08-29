import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { AppInput } from '#react/components/ui/AppInput'
import { menuItem, useMenuUI } from '#react/components/ui/menu'

export function VariantValueField({
  label,
  value,
  options,
  invalid = false,
  propertyId,
  onCommit
}: {
  label: string
  value: string
  options: string[]
  invalid?: boolean
  propertyId: string
  onCommit: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const menuCls = useMenuUI({ content: 'absolute inset-x-0 z-20 mt-0.5 max-h-48 overflow-auto' })
  const itemCls = menuItem({ justify: 'start' })

  useEffect(() => {
    setDraft(value)
  }, [value])

  function commit(next: string) {
    const trimmed = next.trim()
    setOpen(false)
    if (!trimmed) {
      setDraft(value)
      return
    }
    if (trimmed === value) return
    onCommit(trimmed)
  }

  return (
    <div className="relative">
      <AppInput
        value={draft}
        aria-label={label}
        aria-expanded={open}
        role="combobox"
        data-property={propertyId}
        state={invalid ? 'invalid' : 'idle'}
        className="pr-6"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setDraft(event.target.value)
          setOpen(true)
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(value)
            setOpen(false)
            event.currentTarget.blur()
          }
        }}
      />
      <ChevronDown className="pointer-events-none absolute top-1.5 right-1.5 size-3 text-muted" />
      {open && options.length > 0 ? (
        <div role="listbox" className={menuCls.content}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              className={itemCls}
              onMouseDown={(event) => {
                event.preventDefault()
                setDraft(option)
                commit(option)
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
