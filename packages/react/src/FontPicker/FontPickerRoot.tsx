import { useRef, type ReactNode } from 'react'

import { useFontPicker } from './useFontPicker'

export interface FontPickerRootSlotProps {
  value: string
  open: boolean
  setOpen: (open: boolean) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  filtered: string[]
  select: (family: string) => void
  setInputRef: (el: HTMLInputElement | null) => void
}

export interface FontPickerRootProps {
  value: string
  listFamilies: () => Promise<string[]>
  onValueChange?: (family: string) => void
  onSelect?: (family: string) => void
  triggerClassName?: string
  contentClassName?: string
  itemClassName?: string
  searchClassName?: string
  viewportClassName?: string
  emptyClassName?: string
  emptySearchText?: string
  emptyFontsText?: string
  emptyFontsHint?: string
  trigger?: ReactNode | ((state: { value: string; open: boolean }) => ReactNode)
  search?:
    | ReactNode
    | ((state: {
        searchTerm: string
        setSearchTerm: (t: string) => void
        setInputRef: (el: HTMLInputElement | null) => void
      }) => ReactNode)
  item?: ReactNode | ((state: { family: string; selected: boolean }) => ReactNode)
  indicator?: ReactNode | ((state: { selected: boolean }) => ReactNode)
  empty?: ReactNode
  children?: ReactNode | ((state: FontPickerRootSlotProps) => ReactNode)
}

/**
 * Headless font picker with a minimal native combobox structure (no Reka UI).
 */
export function FontPickerRoot({
  value,
  listFamilies,
  onValueChange,
  onSelect,
  triggerClassName,
  contentClassName,
  itemClassName,
  searchClassName,
  viewportClassName,
  emptyClassName,
  emptySearchText,
  emptyFontsText,
  emptyFontsHint,
  trigger,
  search,
  item,
  indicator,
  empty,
  children
}: FontPickerRootProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  function setInputRef(el: HTMLInputElement | null) {
    inputRef.current = el
  }

  const { searchTerm, setSearchTerm, open, setOpen, filtered, select } = useFontPicker({
    value,
    listFamilies,
    onValueChange,
    onSelect
  })

  const slot: FontPickerRootSlotProps = {
    value,
    open,
    setOpen,
    searchTerm,
    setSearchTerm,
    filtered,
    select,
    setInputRef
  }

  if (typeof children === 'function') {
    return <>{children(slot)}</>
  }
  if (children) return <>{children}</>

  const triggerNode =
    typeof trigger === 'function'
      ? trigger({ value, open })
      : (trigger ?? (
          <button type="button" className={triggerClassName} onClick={() => setOpen(!open)}>
            <span>{value}</span>
          </button>
        ))

  return (
    <div data-font-picker="" style={{ position: 'relative', display: 'inline-block' }}>
      {triggerNode}
      {open ? (
        <div className={contentClassName} role="listbox">
          {typeof search === 'function'
            ? search({ searchTerm, setSearchTerm, setInputRef })
            : (search ?? (
                <input
                  ref={setInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={searchClassName}
                  placeholder="Search fonts…"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              ))}
          <div className={viewportClassName ?? 'max-h-72 overflow-y-auto'}>
            {filtered.map((family) => {
              const selected = family === value
              if (typeof item === 'function') {
                return <div key={family}>{item({ family, selected })}</div>
              }
              return (
                <button
                  key={family}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={itemClassName}
                  style={{ fontFamily: `'${family}', sans-serif` }}
                  onClick={() => select(family)}
                >
                  {typeof indicator === 'function' ? indicator({ selected }) : indicator}
                  <span>{family}</span>
                </button>
              )
            })}
            {filtered.length === 0 && searchTerm ? (
              <div className={emptyClassName}>{emptySearchText ?? 'No fonts found'}</div>
            ) : null}
            {filtered.length === 0 && !searchTerm ? (
              <div className={emptyClassName}>
                {empty ?? (
                  <div>
                    <p>{emptyFontsText ?? 'No local fonts available.'}</p>
                    {emptyFontsHint ? <p>{emptyFontsHint}</p> : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
