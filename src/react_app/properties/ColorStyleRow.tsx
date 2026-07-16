import * as Popover from '@radix-ui/react-popover'
import { Eye, EyeOff, Link, Unlink } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ScrubInput } from '@/react_app/pickers/ScrubInput'
import { iconButton } from '@/react_app/ui/iconButton'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { colorToCSS } from '@open-pencil/core'
import { useI18n } from '@open-pencil/react'

import type { Variable } from '@open-pencil/core'
import type { ReactNode } from 'react'

type BindingApi = {
  store: {
    resolveColorVariable: (id: string) => unknown
  }
  colorVariables: Variable[]
  filteredVariables: Variable[]
  searchTerm: string
  setSearchTerm: (term: string) => void
  getBoundVariable: (nodeId: string, index: number) => Variable | undefined
  bindVariable: (nodeId: string, index: number, variableId: string) => void
  unbindVariable: (nodeId: string, index: number) => void
}

export function ColorStyleRow({
  item,
  index,
  activeNodeId,
  bindingApi,
  visibilityTestId,
  unbindTestId,
  'data-test-id': dataTestId,
  'data-test-index': dataTestIndex,
  onPatch,
  onToggleVisibility,
  onRemove,
  children
}: {
  item: { opacity: number; visible: boolean }
  index: number
  activeNodeId?: string | null
  bindingApi: BindingApi
  visibilityTestId: string
  unbindTestId?: string
  'data-test-id'?: string
  'data-test-index'?: number
  onPatch: (changes: Record<string, unknown>) => void
  onToggleVisibility: () => void
  onRemove: () => void
  children: ReactNode
}) {
  const { panels, dialogs } = useI18n()
  const [open, setOpen] = useState(false)
  const bound = useMemo(
    () => (activeNodeId ? bindingApi.getBoundVariable(activeNodeId, index) : undefined),
    [activeNodeId, bindingApi, index]
  )

  return (
    <TipProvider>
      <div
        className="group flex items-center gap-1.5 py-0.5"
        data-test-id={dataTestId}
        data-test-index={dataTestIndex}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>

        <ScrubInput
          className="w-12 shrink-0"
          suffix="%"
          value={Math.round(item.opacity * 100)}
          min={0}
          max={100}
          onValueChange={(v) => onPatch({ opacity: Math.max(0, Math.min(1, v / 100)) })}
        />

        {activeNodeId && bindingApi.colorVariables.length > 0 && !bound ? (
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Tip label={panels.applyVariable}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-muted hover:text-surface"
                >
                  <Link className="size-3.5" />
                </button>
              </Popover.Trigger>
            </Tip>
            <Popover.Portal>
              <Popover.Content
                side="left"
                sideOffset={8}
                className="z-50 w-56 rounded-lg border border-border bg-panel shadow-lg"
              >
                <input
                  value={bindingApi.searchTerm}
                  placeholder={dialogs.search}
                  className="w-full border-b border-border bg-transparent px-2 py-1.5 text-[11px] text-surface outline-none placeholder:text-muted"
                  onChange={(e) => bindingApi.setSearchTerm(e.currentTarget.value)}
                />
                <div className="max-h-48 overflow-y-auto p-1">
                  {bindingApi.filteredVariables.length === 0 ? (
                    <div className="px-2 py-3 text-center text-[11px] text-muted">
                      {panels.noVariablesFound}
                    </div>
                  ) : (
                    bindingApi.filteredVariables.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-[11px] text-surface hover:bg-hover"
                        onClick={() => {
                          bindingApi.bindVariable(activeNodeId, index, v.id)
                          setOpen(false)
                        }}
                      >
                        <div
                          className="size-3 shrink-0 rounded-sm border border-border"
                          style={{
                            background: bindingApi.store.resolveColorVariable(v.id)
                              ? colorToCSS(bindingApi.store.resolveColorVariable(v.id) as never)
                              : '#000'
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate">{v.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ) : activeNodeId && bound ? (
          <Tip label={panels.detachVariable}>
            <button
              type="button"
              data-test-id={unbindTestId}
              className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-violet-400 hover:text-surface"
              onClick={() => bindingApi.unbindVariable(activeNodeId, index)}
            >
              <Unlink className="size-3" />
            </button>
          </Tip>
        ) : null}

        <button
          type="button"
          data-test-id={visibilityTestId}
          className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-muted hover:text-surface"
          onClick={onToggleVisibility}
        >
          {item.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </button>

        <button type="button" className={iconButton({ className: 'shrink-0' })} onClick={onRemove}>
          −
        </button>
      </div>
    </TipProvider>
  )
}
