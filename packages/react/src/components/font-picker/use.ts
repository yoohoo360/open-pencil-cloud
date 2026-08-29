import { useCallback, useRef, useState } from 'react'

import type { FontFamilyOption, LocalFontAccessState } from '@open-pencil/core/text'

import {
  listLocalFamilies,
  localFontAccessState,
  requestLocalFontAccess
} from '#react/app/editor/fonts'

export function useFontPicker(value: string) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [families, setFamilies] = useState<FontFamilyOption[]>([])
  const [accessState, setAccessState] = useState<LocalFontAccessState>(localFontAccessState)
  const loadingRef = useRef(false)

  async function withLoading(run: () => Promise<void>) {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      await run()
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  const loadFamilies = useCallback(async () => {
    await withLoading(async () => {
      const next = await listLocalFamilies()
      setFamilies(next)
      setAccessState(localFontAccessState())
    })
  }, [])

  const requestAccess = useCallback(async () => {
    await withLoading(async () => {
      const next = await requestLocalFontAccess()
      setFamilies(next)
      setAccessState(localFontAccessState())
    })
  }, [])

  const openPicker = useCallback(async () => {
    setOpen(true)
    setSearch('')
    const state = localFontAccessState()
    setAccessState(state)
    if (state === 'prompt') {
      await requestAccess()
      return
    }
    await loadFamilies()
  }, [loadFamilies, requestAccess])

  const closePicker = useCallback(() => {
    setOpen(false)
    setSearch('')
  }, [])

  const term = search.trim().toLowerCase()
  const filtered = term
    ? families.filter((option) => option.family.toLowerCase().includes(term))
    : families

  return {
    value,
    open,
    loading,
    search,
    setSearch,
    families,
    filtered,
    accessState,
    openPicker,
    closePicker,
    requestAccess
  }
}
