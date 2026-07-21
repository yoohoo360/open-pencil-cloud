import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

type InlineEditableProps = {
  defaultValue: string
  className?: string
  previewClassName?: string
  inputClassName?: string
  onSubmit?: (value: string) => void
}

export const InlineEditable = memo(function InlineEditable({
  defaultValue,
  className,
  previewClassName,
  inputClassName,
  onSubmit
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    onSubmit?.(value)
  }, [onSubmit, value])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') commit()
      if (event.key === 'Escape') {
        setValue(defaultValue)
        setEditing(false)
      }
    },
    [commit, defaultValue]
  )

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={inputClassName}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    )
  }

  return (
    <span className={`${className ?? ''} ${previewClassName ?? ''}`.trim()} onDoubleClick={() => setEditing(true)}>
      {value}
    </span>
  )
})
