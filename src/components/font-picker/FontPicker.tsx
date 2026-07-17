import { useMemo } from 'react'
import IconCheck from '~icons/lucide/check'
import IconChevronDown from '~icons/lucide/chevron-down'

import { FontPickerRoot } from '@open-pencil/react'
import type { FontPickerUI } from '@open-pencil/react'
import { useSelectUI } from '@/components/ui/select'
import { usePopoverUI } from '@/components/ui/popover'
import { listFamilies, loadFont, localFontAccessState, requestLocalFontAccess } from '@/app/editor/fonts'
import { WEB_FONT_PROVIDER_IDS } from '@open-pencil/core/text'

interface FontPickerProps {
  value: string
  className?: string
  onSelect?: (family: string) => void
}

const previewFontLoads = new Set<string>()

function loadPreviewFont(family: string, source: string) {
  if (!WEB_FONT_PROVIDER_IDS.includes(source as (typeof WEB_FONT_PROVIDER_IDS)[number])) return
  if (previewFontLoads.has(family)) return
  previewFontLoads.add(family)
  void loadFont(family)
}

export function FontPicker({ value, className, onSelect }: FontPickerProps) {
  const cls = usePopoverUI({ content: 'w-[var(--radix-popover-trigger-width)] min-w-56 overflow-hidden p-0' })
  const selectCls = useSelectUI({
    trigger: 'w-full rounded px-2 py-1 text-xs',
    item: 'w-full gap-2 px-3 py-2.5 text-sm leading-tight'
  })

  const ui = useMemo<FontPickerUI>(() => ({
    trigger: selectCls.trigger,
    content: cls.content,
    item: selectCls.item,
    search: 'w-full border-b border-border bg-transparent px-3 py-2 text-sm text-surface outline-none placeholder:text-muted',
    empty: 'px-2 py-3 text-center text-xs text-muted',
    emptyAction: 'mt-2 rounded bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50'
  }), [cls.content, selectCls.trigger, selectCls.item])

  const localFontAccess = useMemo(() => ({
    state: localFontAccessState,
    load: requestLocalFontAccess
  }), [])

  return (
    <FontPickerRoot
      value={value}
      data-test-id="font-picker-root"
      listFamilies={listFamilies}
      localFontAccess={localFontAccess}
      ui={ui}
      emptyFontsHint="Use the desktop app or Chrome/Edge to access system fonts."
      onSelect={onSelect}
      trigger={({ value: currentValue }) => (
        <button data-test-id="font-picker-trigger" className={`${selectCls.trigger} ${className ?? ''}`}>
          <span className="truncate">{currentValue}</span>
          <IconChevronDown className="size-3 shrink-0 text-muted" />
        </button>
      )}
      item={({ family, selected, source }) => {
        loadPreviewFont(family, source)
        return (
          <div data-test-id="font-picker-item" className="flex min-w-0 flex-1 items-center gap-2">
            {selected
              ? <IconCheck className="size-3 shrink-0 text-accent" />
              : <span className="size-3 shrink-0" />
            }
            <span className="truncate" style={{ fontFamily: `'${family}', sans-serif` }}>
              {family}
            </span>
            <span className="font-sans ml-auto shrink-0 rounded bg-input px-1.5 py-0.5 text-[9px] uppercase text-muted">
              {source}
            </span>
          </div>
        )
      }}
    />
  )
}
