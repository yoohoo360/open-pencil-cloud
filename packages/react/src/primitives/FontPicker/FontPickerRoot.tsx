import { useEffect, useRef, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'

import {
  useFontPicker,
  type FontAccessController,
  type FontFamilyOption
} from '#react/primitives/FontPicker/useFontPicker'

import type { FontPickerUI } from '#react/primitives/FontPicker/types'

type FontAccessState = ReturnType<typeof useFontPicker>['accessState']

interface FontPickerEmptyStateProps {
  accessState: FontAccessState
  loading: boolean
  emptyFontsText?: string
  emptyFontsHint?: string
  onRequestAccess: () => void
  ui?: FontPickerUI
}

function FontPickerEmptyState({
  accessState,
  loading,
  emptyFontsText,
  emptyFontsHint,
  onRequestAccess,
  ui
}: FontPickerEmptyStateProps) {
  return (
    <div className={ui?.empty}>
      {accessState === 'prompt' && <p>Allow local font access to browse installed fonts.</p>}
      {accessState === 'denied' && <p>Local font access is blocked for this site.</p>}
      {accessState === 'unsupported' && <p>Local fonts are not available in this browser.</p>}
      {accessState === 'granted' && <p>{emptyFontsText ?? 'No local fonts available.'}</p>}
      {emptyFontsHint && <p>{emptyFontsHint}</p>}
      {accessState === 'prompt' && (
        <button type="button" className={ui?.emptyAction} disabled={loading} onClick={onRequestAccess}>
          {loading ? 'Loading…' : 'Allow local fonts'}
        </button>
      )}
    </div>
  )
}

interface FontPickerRootProps {
  value: string
  listFamilies: () => Promise<string[] | FontFamilyOption[]>
  localFontAccess?: FontAccessController
  ui?: FontPickerUI
  emptySearchText?: string
  emptyFontsText?: string
  emptyFontsHint?: string
  onValueChange?: (value: string) => void
  onSelect?: (family: string) => void
  trigger?: ReactNode | ((props: { value: string; open: boolean }) => ReactNode)
  item?: (props: { family: string; source: string; selected: boolean }) => ReactNode
  children?: ReactNode
}

export function FontPickerRoot({
  value,
  listFamilies,
  localFontAccess,
  ui,
  emptySearchText,
  emptyFontsText,
  emptyFontsHint,
  onValueChange,
  onSelect,
  trigger,
  item: renderItem
}: FontPickerRootProps) {
  const contentRef = useRef<HTMLDivElement | null>(null)

  const { searchTerm, setSearchTerm, open, setOpen, filtered, loading, accessState, requestAccess, select } =
    useFontPicker({
      modelValue: value,
      listFamilies,
      localFontAccess,
      onValueChange,
      onSelect
    })

  useEffect(() => {
    if (!open) return
    const el = contentRef.current
    if (!el) return
    el.querySelector<HTMLInputElement>('input')?.focus()
  }, [open])

  const triggerNode =
    typeof trigger === 'function'
      ? trigger({ value, open })
      : (trigger ?? (
          <button className={ui?.trigger}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value}
            </span>
          </button>
        ))

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{triggerNode}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          sideOffset={2}
          align="start"
          className={ui?.content}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <input
            className={ui?.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search fonts…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          <div
            className={ui?.viewport ?? undefined}
            style={{ maxHeight: '18rem', overflowY: 'auto' }}
          >
            {filtered.map((option) => (
              <button
                key={option.family}
                className={ui?.item}
                style={{ fontFamily: `'${option.family}', sans-serif` }}
                role="option"
                aria-selected={option.family === value}
                onClick={() => select(option.family)}
              >
                {renderItem
                  ? renderItem({ family: option.family, source: option.source, selected: option.family === value })
                  : option.family}
              </button>
            ))}

            {filtered.length === 0 && searchTerm && (
              <div className={ui?.empty}>{emptySearchText ?? 'No fonts found'}</div>
            )}

            {filtered.length === 0 && !searchTerm && (
              <FontPickerEmptyState
                accessState={accessState}
                loading={loading}
                emptyFontsText={emptyFontsText}
                emptyFontsHint={emptyFontsHint}
                onRequestAccess={() => void requestAccess()}
                ui={ui}
              />
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
