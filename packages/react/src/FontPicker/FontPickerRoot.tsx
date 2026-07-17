import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export interface FontPickerRootProps {
  modelValue: string
  listFamilies: () => Promise<string[]>
  triggerClass?: string
  contentClass?: string
  itemClass?: string
  searchClass?: string
  viewportClass?: string
  emptyClass?: string
  emptySearchText?: string
  emptyFontsText?: string
  emptyFontsHint?: string
  onSelect?: (family: string) => void
  onChange?: (family: string) => void
  children: (ctx: {
    families: string[]
    filtered: string[]
    searchTerm: string
    open: boolean
    value: string
    inputRef: React.RefObject<HTMLInputElement | null>
    setSearchTerm: (term: string) => void
    setOpen: (open: boolean) => void
    select: (family: string) => void
  }) => ReactNode
}

export function FontPickerRoot({
  modelValue,
  listFamilies,
  onSelect,
  onChange,
  children
}: FontPickerRootProps) {
  const [families, setFamilies] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpenState] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    listFamilies().then((result) => {
      if (!cancelled) setFamilies(result)
    })
    return () => {
      cancelled = true
    }
  }, [listFamilies])

  const filtered = useMemo(() => {
    if (!searchTerm) return families
    const lower = searchTerm.toLowerCase()
    return families.filter((f) => f.toLowerCase().includes(lower))
  }, [families, searchTerm])

  function setOpen(next: boolean) {
    if (next) setSearchTerm('')
    setOpenState(next)
  }

  function select(family: string) {
    onChange?.(family)
    onSelect?.(family)
    setOpenState(false)
  }

  return (
    <>
      {children({
        families,
        filtered,
        searchTerm,
        open,
        value: modelValue,
        inputRef,
        setSearchTerm,
        setOpen,
        select
      })}
    </>
  )
}

export default FontPickerRoot
