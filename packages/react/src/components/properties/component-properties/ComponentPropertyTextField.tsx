import { useEffect, useState } from 'react'

import { AppInput } from '#react/components/ui/AppInput'

export function ComponentPropertyTextField({
  label,
  value,
  propertyId,
  mixed = false,
  mixedPlaceholder,
  onCommit
}: {
  label: string
  value: string
  propertyId: string
  mixed?: boolean
  mixedPlaceholder?: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  function commit() {
    if (mixed && draft === '') return
    if (draft === value) return
    onCommit(draft)
  }

  return (
    <AppInput
      value={draft}
      aria-label={label}
      data-property={propertyId}
      placeholder={mixed ? mixedPlaceholder : undefined}
      state={mixed ? 'mixed' : 'idle'}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
