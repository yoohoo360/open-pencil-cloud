import { useI18n } from '#react/i18n'
import { useEditorStore } from '#react/app/editor/store'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export function PagesPanel() {
  const store = useEditorStore()
  const { panels } = useI18n()
  const pages = useSceneComputed(() => store.graph.getPages())
  const currentPageId = store.state.currentPageId

  return (
    <div data-test-id="pages-panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-3 py-2 text-[11px] font-semibold text-surface">
        {panels.pages}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            data-node-id={page.id}
            data-active={page.id === currentPageId || undefined}
            className="flex w-full items-center rounded px-2 py-1 text-left text-[11px] text-surface hover:bg-hover data-active:bg-panel-selected-muted"
            onClick={() => void store.switchPage(page.id)}
          >
            {page.name}
          </button>
        ))}
      </div>
    </div>
  )
}
