import { Check, ChevronDown, Search } from 'lucide-react'

import { listFamilies } from '@/engine/fonts'
import { usePopoverUI } from '@/react_app/ui/popover'
import { useSelectUI } from '@/react_app/ui/select'
import { FontPickerRoot } from '@open-pencil/react'

export function FontPicker({
  value,
  className,
  onSelect
}: {
  value: string
  className?: string
  onSelect: (family: string) => void
}) {
  const cls = usePopoverUI({
    content:
      'absolute z-[100] mt-1 w-full min-w-56 overflow-hidden rounded-lg border border-border bg-panel p-0 shadow-xl'
  })
  const selectCls = useSelectUI({
    trigger: 'w-full rounded px-2 py-1 text-xs',
    item: 'w-full gap-2 px-2 py-2 text-sm'
  })

  return (
    <div className={className} data-test-id="font-picker-root">
      <FontPickerRoot
        value={value}
        listFamilies={listFamilies}
        onSelect={onSelect}
        onValueChange={onSelect}
      >
        {(ctx) => (
          <div className="relative inline-block w-full">
            <button
              type="button"
              data-test-id="font-picker-trigger"
              className={selectCls.trigger}
              onClick={() => ctx.setOpen(!ctx.open)}
            >
              <span className="truncate">{ctx.value}</span>
              <ChevronDown className="size-3 shrink-0 text-muted" />
            </button>
            {ctx.open ? (
              <div className={cls.content} role="listbox">
                <div className="flex items-center gap-1 border-b border-border px-2 py-1">
                  <Search className="size-3 shrink-0 text-muted" />
                  <input
                    ref={ctx.setInputRef}
                    className="min-w-0 flex-1 border-none bg-transparent text-xs text-surface outline-none placeholder:text-muted"
                    placeholder="Search fonts…"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={ctx.searchTerm}
                    onChange={(e) => ctx.setSearchTerm(e.currentTarget.value)}
                  />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {ctx.filtered.map((family) => {
                    const selected = family === ctx.value
                    return (
                      <button
                        key={family}
                        type="button"
                        data-test-id="font-picker-item"
                        className={`flex ${selectCls.item}`}
                        style={{ fontFamily: `'${family}', sans-serif` }}
                        onClick={() => ctx.select(family)}
                      >
                        {selected ? (
                          <Check className="size-3 shrink-0 text-accent" />
                        ) : (
                          <span className="size-3 shrink-0" />
                        )}
                        <span className="truncate">{family}</span>
                      </button>
                    )
                  })}
                  {ctx.filtered.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted">
                      {ctx.searchTerm
                        ? 'No fonts found'
                        : 'Use the desktop app or Chrome/Edge to access system fonts.'}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </FontPickerRoot>
    </div>
  )
}
