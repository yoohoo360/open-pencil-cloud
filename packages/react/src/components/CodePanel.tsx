import { useI18n } from '#react/i18n'

export function CodePanel({ active }: { active?: boolean }) {
  const { panels } = useI18n()
  return (
    <div
      data-test-id="code-panel"
      data-active={active ? 'true' : undefined}
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 text-[11px] text-muted"
    >
      {panels.code}
    </div>
  )
}
