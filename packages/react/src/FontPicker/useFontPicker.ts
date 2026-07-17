import { useEffect, useMemo, useState } from 'react'

/**
 * Options for {@link useFontPicker}.
 */
export interface UseFontPickerOptions {
  /** Selected font family. */
  value: string
  /** Async source for available font families. */
  listFamilies: () => Promise<string[]>
  /** Called when the selected family changes. */
  onValueChange?: (family: string) => void
  /** Optional callback fired after a family is selected. */
  onSelect?: (family: string) => void
}

/**
 * Returns searchable font-picker state and selection helpers.
 */
export function useFontPicker(options: UseFontPickerOptions) {
  const [families, setFamilies] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!searchTerm) return families
    const q = searchTerm.toLowerCase()
    return families.filter((family) => family.toLowerCase().includes(q))
  }, [families, searchTerm])

  useEffect(() => {
    void options.listFamilies().then(setFamilies)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.listFamilies])

  useEffect(() => {
    if (open) setSearchTerm('')
  }, [open])

  function select(family: string) {
    options.onValueChange?.(family)
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
    select,
    value: options.value
  }
}
