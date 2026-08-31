import { commentAuthorName } from '#react/app/document/comments/format'
import { AppButton } from '#react/components/ui/AppButton'
import { useI18n } from '#react/i18n'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

export function CommentComposer({
  autoFocus = false,
  disabled = false,
  placeholder,
  submitLabel,
  onSubmit
}: {
  autoFocus?: boolean
  disabled?: boolean
  placeholder: string
  submitLabel: string
  onSubmit: (body: string) => void | Promise<void>
}) {
  const { dialogs } = useI18n()
  const [body, setBody] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const trimmed = body.trim()

  async function submit() {
    if (!trimmed || disabled) return
    await onSubmit(trimmed)
    setBody('')
  }

  function onFormSubmit(event: FormEvent) {
    event.preventDefault()
    void submit()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form className="flex flex-col gap-1.5" onSubmit={onFormSubmit}>
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        disabled={disabled}
        rows={3}
        value={body}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={onKeyDown}
        className="min-h-16 w-full resize-none rounded-md border border-border bg-panel px-2 py-1.5 text-xs text-surface outline-none placeholder:text-muted focus:border-accent"
      />
      <div className="flex justify-end">
        <AppButton
          color="primary"
          variant="solid"
          disabled={disabled || !trimmed}
          type="submit"
        >
          {submitLabel || dialogs.postComment}
        </AppButton>
      </div>
    </form>
  )
}

export function CommentAuthor({
  name,
  avatar
}: {
  name?: string | null
  avatar?: string | null
}) {
  const display = commentAuthorName({ created_by_name: name })
  const initial = display.slice(0, 1).toUpperCase()
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {avatar ? (
        <img src={avatar} alt="" className="size-5 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-semibold text-white">
          {initial}
        </span>
      )}
      <span className="truncate text-xs font-medium text-surface">{display}</span>
    </span>
  )
}
