import * as Dialog from '@radix-ui/react-dialog'
import { memo, useMemo, useSyncExternalStore } from 'react'

import { acpPermissionOptionTestId } from '@open-pencil/react'
import {
  currentPermission,
  rejectCurrentPermission,
  respondToPermission
} from '@/app/ai/acp/permission'
import { useDialogUI } from '@/components/ui/dialog'

interface ToolCallInfo {
  title?: string
  rawInput?: unknown
}

function subscribePermission(onStoreChange: () => void) {
  const interval = window.setInterval(onStoreChange, 100)
  return () => window.clearInterval(interval)
}

function getPermissionSnapshot() {
  return currentPermission.value
}

export const AcpPermissionDialog = memo(function AcpPermissionDialog() {
  const permission = useSyncExternalStore(subscribePermission, getPermissionSnapshot, () => null)
  const open = permission !== null
  const cls = useDialogUI({
    overlay: 'z-50',
    content: 'w-80 rounded-lg p-4 shadow-xl'
  })

  const toolCall = useMemo(
    (): ToolCallInfo => (permission?.request.toolCall as ToolCallInfo) ?? {},
    [permission]
  )
  const toolName = toolCall.title ?? 'Unknown tool'
  const toolInput = useMemo(() => {
    const raw = toolCall.rawInput
    if (!raw) return null
    try {
      return JSON.stringify(raw, null, 2)
    } catch {
      return String(raw)
    }
  }, [toolCall.rawInput])

  const allowOptions = useMemo(
    () => permission?.request.options.filter((o) => o.kind.startsWith('allow')) ?? [],
    [permission]
  )
  const rejectOptions = useMemo(
    () => permission?.request.options.filter((o) => o.kind.startsWith('reject')) ?? [],
    [permission]
  )

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) rejectCurrentPermission()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={cls.overlay} />
        <Dialog.Content
          data-test-id="acp-permission-dialog"
          className={cls.content}
          onEscapeKeyDown={() => rejectCurrentPermission()}
        >
          <Dialog.Title className="text-sm font-semibold text-surface">
            Permission Request
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-xs text-muted">
            <span className="font-medium text-surface">{toolName}</span> is requesting permission.
          </Dialog.Description>
          {toolInput ? (
            <pre className="mt-2 max-h-32 overflow-auto rounded bg-input p-2 text-[10px] text-muted">
              {toolInput}
            </pre>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            {allowOptions.map((opt) => (
              <button
                key={opt.optionId}
                type="button"
                data-test-id={acpPermissionOptionTestId(opt.kind)}
                className="w-full rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
                onClick={() => respondToPermission(opt.optionId)}
              >
                {opt.name}
              </button>
            ))}
            {rejectOptions.map((opt) => (
              <button
                key={opt.optionId}
                type="button"
                data-test-id={acpPermissionOptionTestId(opt.kind)}
                className="w-full rounded border border-border bg-canvas px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-surface"
                onClick={() => respondToPermission(opt.optionId)}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
})

AcpPermissionDialog.displayName = 'AcpPermissionDialog'
export default AcpPermissionDialog
