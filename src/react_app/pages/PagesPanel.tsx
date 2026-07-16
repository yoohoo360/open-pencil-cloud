import { File } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { PageListRoot, useI18n, useInlineRename } from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

function PagesPanelInner() {
  const { panels } = useI18n()
  const renamePageRef = useRef<((pageId: string, name: string) => void) | null>(null)
  const rename = useInlineRename((id, name) => renamePageRef.current?.(id, name))
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null)

  const setPageInputRef = useCallback(
    (pageId: string, el: HTMLInputElement | null) => {
      if (el && pendingFocusId === pageId) {
        setPendingFocusId(null)
        rename.focusInput(el)
      }
    },
    [pendingFocusId, rename]
  )

  function startRename(
    pg: { id: string; name: string },
    renamePage: (pageId: string, name: string) => void
  ) {
    renamePageRef.current = renamePage
    rename.start(pg.id, pg.name)
    setPendingFocusId(pg.id)
  }

  return (
    <TipProvider>
      <PageListRoot>
        {({ pages, currentPageId, isDivider, addPage, switchPage, renamePage }) => (
          <div data-test-id="pages-panel" className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between px-3 py-1.5">
              <span
                data-test-id="pages-header"
                className="text-[11px] tracking-wider text-muted uppercase"
              >
                {panels.pages}
              </span>
              <Tip label={panels.addPage}>
                <button
                  type="button"
                  data-test-id="pages-add"
                  className="cursor-pointer rounded border-none bg-transparent px-1 text-base leading-none text-muted hover:bg-hover hover:text-surface"
                  onClick={() => addPage()}
                >
                  +
                </button>
              </Tip>
            </div>
            <div className="scrollbar-thin overflow-x-hidden overflow-y-auto px-1 pb-1">
              {pages.map((pg) => {
                if (rename.editingId === pg.id) {
                  return (
                    <div key={pg.id} className="flex w-full items-center gap-1.5 rounded px-2 py-1">
                      <File className="size-3 shrink-0 opacity-70" />
                      <input
                        ref={(el) => setPageInputRef(pg.id, el)}
                        data-test-id="pages-item-input"
                        className="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0 text-xs text-surface outline-none"
                        defaultValue={pg.name}
                        onBlur={(e) => rename.commit(pg.id, e.currentTarget)}
                        onKeyDown={(e) => rename.onKeydown(e.nativeEvent)}
                      />
                    </div>
                  )
                }

                if (isDivider(pg)) {
                  return (
                    <div
                      key={pg.id}
                      className="my-1 flex items-center px-2"
                      onDoubleClick={() => startRename(pg, renamePage)}
                    >
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )
                }

                return (
                  <button
                    key={pg.id}
                    type="button"
                    data-test-id="pages-item"
                    className={`flex w-full cursor-pointer items-center gap-1.5 rounded border-none px-2 py-1 text-left text-xs ${
                      pg.id === currentPageId
                        ? 'bg-hover text-surface'
                        : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
                    }`}
                    onClick={() => switchPage(pg.id)}
                    onDoubleClick={() => startRename(pg, renamePage)}
                  >
                    <File className="size-3 shrink-0" />
                    <span className="truncate">{pg.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </PageListRoot>
    </TipProvider>
  )
}

export function PagesPanel({ editor }: { editor: Editor }) {
  return (
    <EditorBridge editor={editor}>
      <PagesPanelInner />
    </EditorBridge>
  )
}
