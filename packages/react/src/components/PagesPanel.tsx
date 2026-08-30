import { isInternalOnlyPage } from '#react/components/assets-panel/page'
import { useI18n } from '#react/i18n'
import { useEditorStore } from '#react/app/editor/store'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export function PagesPanel() {
  const store = useEditorStore()
  const { panels } = useI18n()
  const pages = useSceneComputed(() => store.graph.getPages().filter((page) => !isInternalOnlyPage(page)))
  const currentPageId = store.state.currentPageId
  const scrollRef = useOverlayScrollbar<HTMLDivElement>()

  return (
    <div data-test-id="pages-panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-3 py-2 text-[11px] font-semibold text-surface">
        {panels.pages}
      </header>
      <div ref={scrollRef} className="scrollbar-overlay min-h-0 flex-1 overflow-y-auto px-1 pb-2">
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
