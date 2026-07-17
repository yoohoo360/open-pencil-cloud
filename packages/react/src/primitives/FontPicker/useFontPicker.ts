import { useEffect, useRef, useState } from 'react'
import type { FontFamilyOption } from '@open-pencil/core/text'

export type FontAccessState = 'unsupported' | 'prompt' | 'granted' | 'denied'
export type { FontFamilyOption, FontFamilySource } from '@open-pencil/core/text'

export interface FontAccessController {
  state: () => FontAccessState
  load: () => Promise<string[] | FontFamilyOption[]>
}

export interface UseFontPickerOptions {
  modelValue: string
  listFamilies: () => Promise<string[] | FontFamilyOption[]>
  localFontAccess?: FontAccessController
  onSelect?: (family: string) => void
  onValueChange?: (value: string) => void
}

function normalizeOptions(items: string[] | FontFamilyOption[]): FontFamilyOption[] {
  return items.map((item) => (typeof item === 'string' ? { family: item, source: 'local' } : item))
}

function contains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function useFontPicker(options: UseFontPickerOptions) {
  const [families, setFamilies] = useState<FontFamilyOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accessState, setAccessState] = useState<FontAccessState>(
    options.localFontAccess?.state() ?? 'granted'
  )
  const loadingRef = useRef(false)
  const familiesRef = useRef<FontFamilyOption[]>([])

  const filtered =
    !searchTerm
      ? families
      : families.filter((option) => contains(option.family, searchTerm))

  async function loadFamilies() {
    if (familiesRef.current.length > 0 || loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const loaded = normalizeOptions(await options.listFamilies())
      familiesRef.current = loaded
      setFamilies(loaded)
      const state = options.localFontAccess?.state()
      if (state) setAccessState(state)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  async function requestAccess() {
    if (!options.localFontAccess || loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const loaded = normalizeOptions(await options.localFontAccess.load())
      familiesRef.current = loaded
      setFamilies(loaded)
      setAccessState(options.localFontAccess.state())
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setSearchTerm('')
    const state = options.localFontAccess?.state() ?? accessState
    setAccessState(state)
    if (state === 'prompt') {
      void requestAccess()
    } else {
      void loadFamilies()
    }
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
    loading,
    accessState,
    requestAccess,
    select
  }
}
