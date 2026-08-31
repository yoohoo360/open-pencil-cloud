import { isDividerPage, listVisiblePages, moveVisiblePage } from '#react/components/PagesPanel/model'
import { usePageDrag } from '#react/components/PagesPanel/usePageDrag'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { useMenuUI } from '#react/components/ui/menu'
import { Tip } from '#react/components/ui/Tip'
import { useI18n } from '#react/i18n'
import { useEditorStore } from '#react/app/editor/store'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import theme from '#react/theme/page-list'
import { File, Pencil, Trash2 } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent
} from 'react'
import { tv } from 'tailwind-variants'

function dropPositionFor(
  pageId: string,
  instructionTargetId: string | null,
  instruction: ReturnType<typeof usePageDrag>['instruction']
): 'before' | 'after' | undefined {
  if (instructionTargetId !== pageId || !instruction) return undefined
  if (instruction.operation === 'reorder-before') return 'before'
  if (instruction.operation === 'reorder-after') return 'after'
  return undefined
}

function PageRow({
  pageId,
  currentPageId,
  canDelete,
  draggingId,
  instruction,
  instructionTargetId,
  editingId,
  setupItem,
  onSwitch,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete
}: {
  pageId: string
  currentPageId: string
  canDelete: boolean
  draggingId: string | null
  instruction: ReturnType<typeof usePageDrag>['instruction']
  instructionTargetId: string | null
  editingId: string | null
  setupItem: ReturnType<typeof usePageDrag>['setupItem']
  onSwitch: (pageId: string) => void
  onStartRename: (pageId: string) => void
  onCommitRename: (pageId: string, name: string) => void
  onCancelRename: () => void
  onDelete: (pageId: string) => void
}) {
  const store = useEditorStore()
  const { pages: pageMessages } = useI18n()
  const menuCls = useMenuUI({
    content: 'min-w-36 shadow-[0_8px_30px_rgb(0_0_0/0.4)]',
    item: 'justify-start gap-2'
  })
  const page = useSceneComputed(() => store.graph.getNode(pageId) ?? null)
  const rowRef = useRef<HTMLDivElement>(null)
  const [menuPoint, setMenuPoint] = useState<{ x: number; y: number } | null>(null)
  const dropPosition = dropPositionFor(pageId, instructionTargetId, instruction)
  const styles = tv(theme)({
    active: pageId === currentPageId,
    dragging: draggingId === pageId,
    dropPosition
  })

  useEffect(() => setupItem(rowRef.current, { id: pageId }), [pageId, setupItem])

  if (!page) return null

  function commitRename(value: string) {
    onCommitRename(pageId, value)
  }

  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename(event.currentTarget.value)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancelRename()
    }
  }

  function onContextMenu(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    setMenuPoint({ x: event.clientX, y: event.clientY })
  }

  const renaming = editingId === pageId
  const divider = isDividerPage(page)

  return (
    <div
      ref={rowRef}
      data-test-id="pages-row"
      data-page-id={page.id}
      data-node-id={page.id}
      data-active={page.id === currentPageId || undefined}
      data-dragging={draggingId === page.id || undefined}
      data-drop-position={dropPosition}
      className={styles.row()}
      onContextMenu={onContextMenu}
    >
      {dropPosition === 'before' ? (
        <div data-test-id="pages-drop-indicator" className={styles.dropIndicator()} />
      ) : null}
      {renaming ? (
        <div className={styles.renameRow()}>
          <File className={styles.icon()} />
          <input
            autoFocus
            data-test-id="pages-item-input"
            defaultValue={page.name}
            className={styles.renameInput()}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => commitRename(event.currentTarget.value)}
            onKeyDown={onRenameKeyDown}
          />
        </div>
      ) : divider ? (
        <div
          data-test-id="pages-divider"
          className={styles.divider()}
          onDoubleClick={() => onStartRename(page.id)}
        >
          <div className={styles.dividerLine()} />
        </div>
      ) : (
        <button
          type="button"
          data-test-id="pages-item"
          className={styles.item()}
          onClick={() => onSwitch(page.id)}
          onDoubleClick={() => onStartRename(page.id)}
        >
          <File className={styles.icon()} />
          <span className={styles.label()}>{page.name}</span>
        </button>
      )}
      {dropPosition === 'after' ? (
        <div data-test-id="pages-drop-indicator" className={styles.dropIndicator()} />
      ) : null}
      <FloatingMenu
        open={menuPoint !== null}
        onClose={() => setMenuPoint(null)}
        point={menuPoint ?? undefined}
        className={menuCls.content}
      >
        <button
          type="button"
          role="menuitem"
          data-test-id="pages-context-rename"
          className={menuCls.item}
          onClick={() => {
            setMenuPoint(null)
            onStartRename(page.id)
          }}
        >
          <Pencil className={menuCls.icon} />
          <span>{pageMessages.rename}</span>
        </button>
        <button
          type="button"
          role="menuitem"
          data-test-id="pages-context-delete"
          className={menuCls.item}
          disabled={!canDelete}
          data-disabled={!canDelete || undefined}
          onClick={() => {
            if (!canDelete) return
            setMenuPoint(null)
            onDelete(page.id)
          }}
        >
          <Trash2 className={menuCls.icon} />
          <span>{pageMessages.delete}</span>
        </button>
      </FloatingMenu>
    </div>
  )
}

export function PagesPanel() {
  const store = useEditorStore()
  const { panels } = useI18n()
  const pages = useSceneComputed(() => listVisiblePages(store.graph))
  const currentPageId = store.state.currentPageId
  const scrollRef = useOverlayScrollbar<HTMLDivElement>()
  const [editingId, setEditingId] = useState<string | null>(null)
  const styles = tv(theme)()

  const { draggingId, instruction, instructionTargetId, setupItem } = usePageDrag(
    () => pages,
    (pageId, index) => {
      moveVisiblePage(store.graph, pageId, index)
    }
  )

  function startRename(pageId: string) {
    setEditingId(pageId)
  }

  function commitRename(pageId: string, value: string) {
    const name = value.trim()
    const page = store.graph.getNode(pageId)
    if (name && page && name !== page.name) store.renamePage(pageId, name)
    setEditingId(null)
  }

  return (
    <div data-test-id="pages-panel" className={styles.panel()}>
      <div className={styles.header()}>
        <span data-test-id="pages-header" className={styles.title()}>
          {panels.pages}
        </span>
        <Tip label={panels.addPage}>
          <button
            type="button"
            data-test-id="pages-add"
            className={styles.add()}
            onClick={() => store.addPage()}
          >
            +
          </button>
        </Tip>
      </div>
      <div className={styles.body()}>
        <div ref={scrollRef} data-test-id="pages-scroll" className={styles.viewport()}>
          {pages.map((page) => (
            <PageRow
              key={page.id}
              pageId={page.id}
              currentPageId={currentPageId}
              canDelete={pages.length > 1}
              draggingId={draggingId}
              instruction={instruction}
              instructionTargetId={instructionTargetId}
              editingId={editingId}
              setupItem={setupItem}
              onSwitch={(pageId) => void store.switchPage(pageId)}
              onStartRename={startRename}
              onCommitRename={commitRename}
              onCancelRename={() => setEditingId(null)}
              onDelete={(pageId) => store.deletePage(pageId)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
