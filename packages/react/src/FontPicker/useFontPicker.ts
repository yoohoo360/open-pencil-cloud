import { useEffect, useState } from 'react'

/**
 * Options for {@link useFontPicker}.
 */
export interface UseFontPickerOptions {
  /** Currently selected font family. */
  value: string
  /** Async source for available font families. */
  listFamilies: () => Promise<string[]>
  /** Optional callback fired after a family is selected. */
  onSelect?: (family: string) => void
  /** Callback to update the value externally. */
  onChange: (family: string) => void
}

function caseInsensitiveContains(str: string, sub: string): boolean {
  return str.toLowerCase().includes(sub.toLowerCase())
}

/**
 * Returns searchable font-picker state and selection helpers.
 */
export function useFontPicker(options: UseFontPickerOptions) {
  const [families, setFamilies] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = searchTerm
    ? families.filter((family) => caseInsensitiveContains(family, searchTerm))
    : families

  useEffect(() => {
    void options.listFamilies().then(setFamilies)
  }, [])

  useEffect(() => {
    if (open) setSearchTerm('')
  }, [open])

  function select(family: string) {
    options.onChange(family)
    options.onSelect?.(family)
    setOpen(false)
  }

  return {
    families,
    searchTerm,
    setSearchTerm,
    open,
    setOpen,
    filtered,
    select
  }
}
