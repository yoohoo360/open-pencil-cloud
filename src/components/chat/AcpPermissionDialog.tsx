import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useStore } from '@nanostores/react'

import { acpPermissionOptionTestId } from '@open-pencil/react'
import { $currentPermission, rejectCurrentPermission, respondToPermission } from '@/app/ai/acp/permission'
import { useDialogUI } from '@/components/ui/dialog'

interface ToolCallInfo {
  title?: string
  rawInput?: unknown
}

export function AcpPermissionDialog() {
  const permission = useStore($currentPermission)
  const open = permission !== null
  const cls = useDialogUI({
    overlay: 'z-50',
    content: 'w-80 rounded-lg p-4 shadow-xl'
  })

  const toolCall = (permission?.request.toolCall as ToolCallInfo) ?? {}
  const toolName = toolCall.title ?? 'Unknown tool'
  const toolInput = toolCall.rawInput
    ? (() => {
        try { return JSON.stringify(toolCall.rawInput, null, 2) }
        catch { return String(toolCall.rawInput) }
      })()
    : null

  const allowOptions = permission?.request.options.filter((o) => o.kind.startsWith('allow')) ?? []
  const rejectOptions = permission?.request.options.filter((o) => o.kind.startsWith('reject')) ?? []

  return (
    <AlertDialog.Root open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={cls.overlay} onClick={rejectCurrentPermission} />
        <AlertDialog.Content
          data-test-id="acp-permission-dialog"
          className={cls.content}
          onEscapeKeyDown={rejectCurrentPermission}
        >
          <AlertDialog.Title className="text-sm font-semibold text-surface">
            Permission Request
          </AlertDialog.Title>

          <AlertDialog.Description className="mt-2 text-xs text-muted">
            <span className="font-medium text-surface">{toolName}</span> is requesting permission.
          </AlertDialog.Description>

          {toolInput && (
            <pre className="mt-2 max-h-32 overflow-auto rounded bg-input p-2 text-[10px] text-muted">
              {toolInput}
            </pre>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {allowOptions.map((opt) => (
              <AlertDialog.Action
                key={opt.optionId}
                data-test-id={acpPermissionOptionTestId(opt.kind)}
                className="w-full rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
                onClick={() => respondToPermission(opt.optionId)}
              >
                {opt.name}
              </AlertDialog.Action>
            ))}
            {rejectOptions.map((opt) => (
              <AlertDialog.Cancel
                key={opt.optionId}
                data-test-id={acpPermissionOptionTestId(opt.kind)}
                className="w-full rounded border border-border bg-canvas px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-surface"
                onClick={() => respondToPermission(opt.optionId)}
              >
                {opt.name}
              </AlertDialog.Cancel>
            ))}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
