import { useI18n } from '#react/i18n'

export function AssetsPanel() {
  const { panels } = useI18n()
  return (
    <div data-test-id="assets-panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-3 py-2 text-[11px] font-semibold text-surface">
        {panels.assets}
      </header>
      <p className="px-3 text-[11px] text-muted">{panels.noLibraries}</p>
    </div>
  )
}
