import { useI18n } from '#react/i18n'

export function ChatPanel() {
  const { panels } = useI18n()
  return (
    <div
      data-test-id="chat-panel"
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 text-[11px] text-muted"
    >
      {panels.ai}
    </div>
  )
}
