import { MIXED, type MixedValue } from '@open-pencil/react'
import { memo, useEffect, useState } from 'react'

import AppInput from '@/components/ui/AppInput'

export type ComponentPropertyTextFieldProps = {
  value: MixedValue<string>
  label: string
  onCommit?: (value: string) => void
}

export const ComponentPropertyTextField = memo(function ComponentPropertyTextField({
  value,
  label,
  onCommit,
  ...rest
}: ComponentPropertyTextFieldProps) {
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setDraft(value === MIXED ? '' : value)
  }, [value])

  return (
    <AppInput
      {...rest}
      value={draft}
      tone="panel"
      size="sm"
      state={value === MIXED ? 'mixed' : 'idle'}
      placeholder={value === MIXED ? '—' : undefined}
      aria-label={label}
      onValueChange={setDraft}
      onChangeCommit={() => onCommit?.(draft)}
    />
  )
})

ComponentPropertyTextField.displayName = 'ComponentPropertyTextField'
export default ComponentPropertyTextField
