import { useEffect, useRef, useState } from 'react'

export function RenameInput({
  defaultValue,
  className,
  onCommit,
  onKeyDown
}: {
  defaultValue: string
  className: string
  onCommit: (event: React.FocusEvent<HTMLInputElement>) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return (
    <input
      ref={inputRef}
      className={className}
      defaultValue={defaultValue}
      onBlur={onCommit}
      onKeyDown={onKeyDown}
    />
  )
}

export function EditableCell({
  value,
  previewClassName,
  inputClassName,
  onCommit
}: {
  value: string
  previewClassName: string
  inputClassName: string
  onCommit: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div
      className="min-w-0 flex-1"
      onClick={() => {
        if (!editing) setEditing(true)
      }}
    >
      {editing ? (
        <RenameInput
          className={inputClassName}
          defaultValue={value}
          onCommit={(event) => {
            const next = event.currentTarget.value.trim()
            setEditing(false)
            if (next && next !== value) onCommit(next)
          }}
          onKeyDown={(event) => {
            if (event.code === 'Enter') {
              event.currentTarget.blur()
              return
            }
            if (event.code === 'Escape') {
              event.stopPropagation()
              setEditing(false)
            }
          }}
        />
      ) : (
        <span className={previewClassName}>{value}</span>
      )}
    </div>
  )
}
