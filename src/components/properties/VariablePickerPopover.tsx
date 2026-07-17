import { useEffect, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'

import IconDiamondPlus from '~icons/lucide/diamond-plus'
import IconDiamond from '~icons/lucide/diamond'
import IconPlus from '~icons/lucide/plus'

import type { Variable } from '@open-pencil/scene-graph'

interface VariablePickerPopoverProps {
  searchTerm: string
  variables: Variable[]
  triggerLabel: string
  searchPlaceholder: string
  emptyLabel: string
  createLabel?: string
  createNamePlaceholder?: string
  createSubmitLabel?: string
  createDefaultName?: string
  swatchBackground?: (variableId: string) => string
  'data-test-id'?: string
  onSearchTermChange?: (term: string) => void
  onSelect?: (variable: Variable) => void
  onCreate?: (name: string) => void
}

export function VariablePickerPopover({
  searchTerm,
  variables,
  triggerLabel,
  searchPlaceholder,
  emptyLabel,
  createLabel,
  createNamePlaceholder = 'Variable name',
  createSubmitLabel = 'Create',
  createDefaultName = '',
  swatchBackground,
  'data-test-id': testId,
  onSearchTermChange,
  onSelect,
  onCreate
}: VariablePickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const createInputRef = useRef<HTMLInputElement>(null)
  const canCreate = createName.trim().length > 0

  useEffect(() => {
    if (!open) setCreating(false)
  }, [open])

  function startCreate() {
    setCreating(true)
    setCreateName(createDefaultName)
    requestAnimationFrame(() => {
      createInputRef.current?.focus()
      createInputRef.current?.select()
    })
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = createName.trim()
    if (!name) return
    onCreate?.(name)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="relative shrink-0">
        <Popover.Trigger
          data-test-id={testId}
          aria-label={triggerLabel}
          className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-muted hover:text-surface"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <IconDiamondPlus className="size-3.5" />
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="center"
          sideOffset={8}
          collisionPadding={8}
          className="z-50 w-56 rounded-lg border border-border bg-panel shadow-lg"
        >
          <input
            value={searchTerm}
            placeholder={searchPlaceholder}
            className="w-full border-b border-border bg-transparent px-2 py-1.5 text-[11px] text-surface outline-none placeholder:text-muted"
            onChange={(e) => onSearchTermChange?.(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto p-1">
            {variables.length === 0 ? (
              <div className="px-2 py-3 text-center text-[11px] text-muted">{emptyLabel}</div>
            ) : (
              variables.map((variable) => (
                <button
                  key={variable.id}
                  className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-[11px] text-surface hover:bg-hover"
                  onClick={() => { onSelect?.(variable); setOpen(false) }}
                >
                  {swatchBackground ? (
                    <div
                      className="size-3 shrink-0 rounded-sm border border-border"
                      style={{ background: swatchBackground(variable.id) }}
                    />
                  ) : (
                    <IconDiamond className="size-3 shrink-0 text-violet-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-left">{variable.name}</span>
                </button>
              ))
            )}
          </div>
          {createLabel && (
            <div className="border-t border-border">
              {creating ? (
                <form
                  className="flex items-center gap-1.5 p-1.5"
                  onSubmit={submitCreate}
                  onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setCreating(false) } }}
                >
                  <input
                    ref={createInputRef}
                    value={createName}
                    placeholder={createNamePlaceholder}
                    className="min-w-0 flex-1 rounded border border-border bg-transparent px-1.5 py-1 text-[11px] text-surface outline-none placeholder:text-muted focus:border-accent"
                    onChange={(e) => setCreateName(e.target.value)}
                  />
                  <button
                    data-test-id={testId ? `${testId}-create` : undefined}
                    disabled={!canCreate}
                    className="rounded border border-border bg-panel px-1.5 py-1 text-[11px] text-surface hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                    type="submit"
                  >
                    {createSubmitLabel}
                  </button>
                </form>
              ) : (
                <button
                  data-test-id={testId ? `${testId}-create` : undefined}
                  className="flex w-full cursor-pointer items-center gap-1.5 bg-transparent px-2 py-1.5 text-left text-[11px] text-muted hover:bg-hover hover:text-surface"
                  onClick={startCreate}
                >
                  <IconPlus className="size-3" />
                  <span className="min-w-0 flex-1 truncate">{createLabel}</span>
                </button>
              )}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
