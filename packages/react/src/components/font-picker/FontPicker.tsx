import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useFontPicker } from '#react/components/font-picker/use'
import { usePopoverUI } from '#react/components/ui/popover'
import { useI18n } from '#react/i18n'
import { panelFieldBase } from '#react/theme/panel/field'

export function FontPicker({
  value,
  label,
  onSelect
}: {
  value: string
  label: string
  onSelect: (family: string) => void
}) {
  const { panels } = useI18n()
  const picker = useFontPicker(value)
  const { open, closePicker } = picker
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const cls = usePopoverUI({
    content: 'absolute left-0 top-full z-50 mt-1 w-full min-w-56 overflow-hidden p-0'
  })

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      closePicker()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePicker()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [closePicker, open])

  const emptyMessage =
    picker.accessState === 'prompt'
      ? panels.localFontsPrompt
      : picker.accessState === 'denied'
        ? panels.localFontsDenied
        : picker.accessState === 'unsupported'
          ? panels.localFontsUnsupported
          : panels.noLocalFontsAvailable

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1" data-test-id="font-picker-root">
      <button
        type="button"
        data-test-id="font-picker-trigger"
        aria-label={label}
        aria-expanded={picker.open}
        className={`${panelFieldBase} flex w-full min-w-0 cursor-pointer items-center gap-1 px-2 text-left text-[11px]`}
        onClick={() => {
          if (picker.open) picker.closePicker()
          else void picker.openPicker()
        }}
      >
        <span className="min-w-0 flex-1 truncate" style={{ fontFamily: `'${value}', sans-serif` }}>
          {value}
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted" />
      </button>
      {picker.open ? (
        <div className={cls.content}>
          <input
            ref={searchRef}
            value={picker.search}
            placeholder={panels.searchFonts}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full border-b border-border bg-transparent px-3 py-2 text-sm text-surface outline-none placeholder:text-muted"
            onChange={(event) => picker.setSearch(event.target.value)}
          />
          <div className="max-h-72 overflow-y-auto">
            {picker.loading && picker.filtered.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted">{panels.loading}</div>
            ) : null}
            {picker.filtered.map((option) => {
              const selected = option.family === value
              return (
                <button
                  key={option.family}
                  type="button"
                  data-test-id="font-picker-item"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm leading-tight text-surface hover:bg-hover"
                  onClick={() => {
                    onSelect(option.family)
                    picker.closePicker()
                  }}
                >
                  {selected ? (
                    <Check className="size-3 shrink-0 text-accent" />
                  ) : (
                    <span className="size-3 shrink-0" />
                  )}
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{ fontFamily: `'${option.family}', sans-serif` }}
                  >
                    {option.family}
                  </span>
                  <span className="ml-auto shrink-0 rounded bg-input px-1.5 py-0.5 font-sans text-[9px] uppercase text-muted">
                    {option.source}
                  </span>
                </button>
              )
            })}
            {!picker.loading && picker.filtered.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted">
                {picker.search.trim() ? (
                  panels.noFontsFound
                ) : (
                  <div>
                    <p>{emptyMessage}</p>
                    {picker.accessState !== 'granted' ? (
                      <p className="mt-1">{panels.localFontsAccessHint}</p>
                    ) : null}
                    {picker.accessState === 'prompt' ? (
                      <button
                        type="button"
                        className="mt-2 rounded bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                        disabled={picker.loading}
                        onClick={() => void picker.requestAccess()}
                      >
                        {picker.loading ? panels.loading : panels.allowLocalFonts}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
