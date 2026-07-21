import * as Popover from '@radix-ui/react-popover'
import { memo, useCallback, useMemo, useRef, type ReactNode } from 'react'

import type { FontFamilyOption } from '@open-pencil/core/text'

import {
  useFontPicker,
  type FontAccessController
} from '#react/primitives/FontPicker/useFontPicker'
import type { FontPickerUI } from '#react/primitives/FontPicker/types'

type TriggerSlotProps = { value: string; open: boolean }
type SearchSlotProps = { searchTerm: string; setSearchTerm: (value: string) => void }
type ItemSlotProps = { family: string; source: FontFamilyOption['source']; selected: boolean }

export type FontPickerRootProps = {
  value: string
  listFamilies: () => Promise<string[] | FontFamilyOption[]>
  localFontAccess?: FontAccessController
  ui?: FontPickerUI
  emptySearchText?: string
  emptyFontsText?: string
  emptyFontsHint?: string
  trigger?: ReactNode | ((props: TriggerSlotProps) => ReactNode)
  search?: ReactNode | ((props: SearchSlotProps) => ReactNode)
  item?: ReactNode | ((props: ItemSlotProps) => ReactNode)
  indicator?: ReactNode | ((props: { selected: boolean }) => ReactNode)
  onValueChange?: (family: string) => void
  onSelect?: (family: string) => void
}

export const FontPickerRoot = memo(function FontPickerRoot({
  value,
  listFamilies,
  localFontAccess,
  ui,
  emptySearchText,
  emptyFontsText,
  emptyFontsHint,
  trigger,
  search,
  item,
  indicator,
  onValueChange,
  onSelect
}: FontPickerRootProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const select = useCallback(
    (family: string) => {
      onValueChange?.(family)
      onSelect?.(family)
    },
    [onSelect, onValueChange]
  )
  const picker = useFontPicker({ value, listFamilies, localFontAccess, onSelect: select })
  const triggerContent = useMemo(
    () =>
      typeof trigger === 'function' ? (
        trigger({ value, open: picker.open })
      ) : (
        <button type="button" className={ui?.trigger}>
          <span className="truncate">{value}</span>
        </button>
      ),
    [picker.open, trigger, ui?.trigger, value]
  )
  const searchContent =
    typeof search === 'function' ? (
      search({ searchTerm: picker.searchTerm, setSearchTerm: picker.setSearchTerm })
    ) : (
      <input
        ref={inputRef}
        className={ui?.search}
        value={picker.searchTerm}
        placeholder="Search fonts…"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(event) => picker.setSearchTerm(event.target.value)}
      />
    )

  return (
    <Popover.Root open={picker.open} onOpenChange={picker.setOpen}>
      <Popover.Trigger asChild>{triggerContent}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={ui?.content}
          sideOffset={2}
          align="start"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus()
          }}
        >
          {searchContent}
          <div className={ui?.viewport ?? 'max-h-72 overflow-y-auto'} data-slot="viewport">
            {picker.filtered.map((option) => {
              const selected = option.family === value
              const itemContent =
                typeof item === 'function' ? (
                  item({ family: option.family, source: option.source, selected })
                ) : (
                  <>
                    {indicator ? typeof indicator === 'function' ? indicator({ selected }) : indicator : null}
                    <span className="truncate">{option.family}</span>
                  </>
                )
              return (
                <button
                  key={option.family}
                  type="button"
                  className={ui?.item}
                  style={{ fontFamily: `'${option.family}', sans-serif` }}
                  data-slot="item"
                  data-state={selected ? 'checked' : 'unchecked'}
                  onClick={() => picker.select(option.family)}
                >
                  {itemContent}
                </button>
              )
            })}
            {picker.filtered.length === 0 && picker.searchTerm ? (
              <div className={ui?.empty}>{emptySearchText ?? 'No fonts found'}</div>
            ) : null}
            {picker.filtered.length === 0 && !picker.searchTerm ? (
              <div className={ui?.empty}>
                <p>
                  {picker.accessState === 'prompt'
                    ? 'Allow local font access to browse installed fonts.'
                    : picker.accessState === 'denied'
                      ? 'Local font access is blocked for this site.'
                      : picker.accessState === 'unsupported'
                        ? 'Local fonts are not available in this browser.'
                        : emptyFontsText ?? 'No local fonts available.'}
                </p>
                {emptyFontsHint ? <p className="mt-1">{emptyFontsHint}</p> : null}
                {picker.accessState === 'prompt' ? (
                  <button
                    type="button"
                    className={ui?.emptyAction}
                    disabled={picker.loading}
                    onClick={() => void picker.requestAccess()}
                  >
                    {picker.loading ? 'Loading…' : 'Allow local fonts'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
})

FontPickerRoot.displayName = 'FontPickerRoot'
