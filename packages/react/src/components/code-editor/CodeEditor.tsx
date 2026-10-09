import { useEffect, useMemo, useRef } from 'react'

import { highlightCode } from '#react/components/code-editor/highlight'
import type { CodeEditorLanguage } from '#react/components/code-editor/types'

import './highlight.css'

export function CodeEditor({
  value,
  language = 'design-jsx',
  readOnly = false,
  label = 'Code',
  onChange
}: {
  value: string
  language?: CodeEditorLanguage
  readOnly?: boolean
  label?: string
  onChange: (value: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const highlighted = useMemo(() => highlightCode(value, language), [value, language])

  useEffect(() => {
    const textarea = textareaRef.current
    const pre = preRef.current
    if (!textarea || !pre) return
    const syncScroll = () => {
      pre.scrollTop = textarea.scrollTop
      pre.scrollLeft = textarea.scrollLeft
    }
    textarea.addEventListener('scroll', syncScroll)
    return () => textarea.removeEventListener('scroll', syncScroll)
  }, [])

  useEffect(() => {
    const caret = pendingCaret.current
    const textarea = textareaRef.current
    if (caret === null || !textarea) return
    textarea.selectionStart = caret
    textarea.selectionEnd = caret
    pendingCaret.current = null
  }, [value])

  return (
    <div
      data-slot="code-editor"
      className="op-hljs-editor relative min-h-0 flex-1 overflow-hidden text-xs"
    >
      <pre
        ref={preRef}
        aria-hidden
        className="op-hljs-layer pointer-events-none absolute inset-0 m-0 overflow-auto"
      >
        <code
          className="hljs block min-h-full font-mono whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={label}
        data-testid="code-editor-input"
        className="op-hljs-layer absolute inset-0 z-[1] m-0 resize-none overflow-auto border-0 bg-transparent font-mono text-transparent caret-[var(--color-accent)] outline-none"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Tab' || readOnly) return
          event.preventDefault()
          const target = event.currentTarget
          const start = target.selectionStart
          const end = target.selectionEnd
          pendingCaret.current = start + 2
          onChange(`${value.slice(0, start)}  ${value.slice(end)}`)
        }}
      />
    </div>
  )
}
