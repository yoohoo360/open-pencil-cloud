import { useCallback, useEffect, useMemo, useState } from 'react'

import type { FontFamilyOption } from '@open-pencil/core/text'

export type FontAccessState = 'unsupported' | 'prompt' | 'granted' | 'denied'
export type { FontFamilyOption, FontFamilySource } from '@open-pencil/core/text'

export interface FontAccessController {
  state: () => FontAccessState
  load: () => Promise<string[] | FontFamilyOption[]>
}

/**
 * Options for {@link useFontPicker}.
 */
export interface UseFontPickerOptions {
  /** Async source for available font families. */
  listFamilies: () => Promise<string[] | FontFamilyOption[]>
  /** Host-provided local-font permission controller. */
  localFontAccess?: FontAccessController
  /** Controlled selected family. */
  value: string
  /** Optional callback fired after a family is selected. */
  onSelect?: (family: string) => void
}

function normalizeOptions(items: string[] | FontFamilyOption[]): FontFamilyOption[] {
  return items.map((item) => (typeof item === 'string' ? { family: item, source: 'local' } : item))
}

/**
 * Returns searchable font-picker state and selection helpers.
 */
export function useFontPicker(options: UseFontPickerOptions) {
  const [families, setFamilies] = useState<FontFamilyOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accessState, setAccessState] = useState<FontAccessState>(
    () => options.localFontAccess?.state() ?? 'granted'
  )

  const filtered = useMemo(() => {
    if (!searchTerm) return families
    const needle = searchTerm.toLocaleLowerCase()
    return families.filter((option) => option.family.toLocaleLowerCase().includes(needle))
  }, [families, searchTerm])

  const loadFamilies = useCallback(async () => {
    if (families.length > 0 || loading) return
    setLoading(true)
    try {
      setFamilies(normalizeOptions(await options.listFamilies()))
      setAccessState((current) => options.localFontAccess?.state() ?? current)
    } finally {
      setLoading(false)
    }
  }, [families.length, loading, options])

  const requestAccess = useCallback(async () => {
    if (!options.localFontAccess || loading) return
    setLoading(true)
    try {
      setFamilies(normalizeOptions(await options.localFontAccess.load()))
      setAccessState(options.localFontAccess.state())
    } finally {
      setLoading(false)
    }
  }, [loading, options.localFontAccess])

  useEffect(() => {
    if (!open) return
    setSearchTerm('')
    const state = options.localFontAccess?.state() ?? accessState
    setAccessState(state)
    if (state === 'prompt') void requestAccess()
    else void loadFamilies()
  }, [accessState, loadFamilies, open, options.localFontAccess, requestAccess])

  const select = useCallback((family: string) => {
    options.onSelect?.(family)
    setOpen(false)
  }, [options])

  return {
    families,
    searchTerm,
    setSearchTerm,
    open,
    setOpen,
    filtered,
    loading,
    accessState,
    requestAccess,
    select
  }
}
