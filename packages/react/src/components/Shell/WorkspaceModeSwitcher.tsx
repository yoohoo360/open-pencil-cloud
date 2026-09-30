import { Check, ChevronDown, Code2, Eye, PenLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { hasDocumentCapability, useDocumentAccess } from '#react/app/document/access'
import {
  setWorkspaceMode,
  useWorkspaceMode,
  type WorkspaceMode
} from '#react/app/shell/workspace-mode'
import { usePopoverUI } from '#react/components/ui/popover'
import { Tip } from '#react/components/ui/Tip'
import { useI18n } from '#react/i18n'

const MODES: WorkspaceMode[] = ['view', 'edit', 'dev']

const ICONS = {
  view: Eye,
  edit: PenLine,
  dev: Code2
} as const

/**
 * Compact mode menu (current label + chevron). Lives in AppMenu chrome —
 * not a floating canvas control or a second segmented strip in the right panel.
 */
export function WorkspaceModeSwitcher({ className }: { className?: string }) {
  const mode = useWorkspaceMode()
  const access = useDocumentAccess()
  const { panels } = useI18n()
  const canEdit = hasDocumentCapability(access, 'edit')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const popover = usePopoverUI({
    content: 'absolute right-0 top-full z-[60] mt-1 w-44 overflow-hidden p-1'
  })

  const labels: Record<WorkspaceMode, string> = {
    view: panels.workspaceModeView,
    edit: panels.workspaceModeEdit,
    dev: panels.workspaceModeDev
  }
  const tips: Record<WorkspaceMode, string> = {
    view: panels.workspaceModeViewTip,
    edit: panels.workspaceModeEditTip,
    dev: panels.workspaceModeDevTip
  }
  const CurrentIcon = ICONS[mode]

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      data-test-id="workspace-mode-switcher"
      className={`relative shrink-0 ${className ?? ''}`}
    >
      <Tip label={panels.workspaceMode}>
        <button
          type="button"
          data-test-id="workspace-mode-trigger"
          aria-label={panels.workspaceMode}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex h-6 max-w-[7.5rem] cursor-pointer items-center gap-1 rounded px-1.5 text-[11px] text-muted transition-colors hover:bg-hover hover:text-surface"
          onClick={() => setOpen((value) => !value)}
        >
          <CurrentIcon className="size-3.5 shrink-0" />
          <span className="truncate">{labels[mode]}</span>
          <ChevronDown className="size-3 shrink-0 opacity-70" />
        </button>
      </Tip>
      {open ? (
        <div className={popover.content} role="menu" aria-label={panels.workspaceMode}>
          {MODES.map((value) => {
            const Icon = ICONS[value]
            const disabled = value === 'edit' && !canEdit
            const selected = value === mode
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                disabled={disabled}
                title={tips[value]}
                data-test-id={`workspace-mode-${value}`}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-surface hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  if (disabled) return
                  setWorkspaceMode(value)
                  setOpen(false)
                }}
              >
                <Icon className="size-3.5 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate">{labels[value]}</span>
                {selected ? <Check className="size-3.5 shrink-0 text-accent" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
