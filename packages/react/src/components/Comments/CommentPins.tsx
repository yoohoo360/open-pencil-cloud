import { canvasToScreen } from '#react/app/document/comments/coords'
import { commentAuthorName } from '#react/app/document/comments/format'
import type { CommentDraft, DocumentCommentThread } from '#react/app/document/comments/types'
import { useEditorStore } from '#react/app/editor/store'
import { CommentComposer } from '#react/components/Comments/CommentComposer'
import { useComments } from '#react/components/Comments/context'
import { useI18n } from '#react/i18n'
import { Check } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent } from 'react'

function PinBubble({
  thread,
  selected,
  onSelect
}: {
  thread: DocumentCommentThread
  selected: boolean
  onSelect: () => void
}) {
  const name = commentAuthorName(thread)
  const initial = name.slice(0, 1).toUpperCase()
  return (
    <button
      type="button"
      data-comment-pin={thread.id}
      aria-label={name}
      onPointerDown={(event: ReactPointerEvent) => {
        event.stopPropagation()
        onSelect()
      }}
      className={[
        'flex size-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white shadow-md',
        selected ? 'scale-110 bg-accent' : 'bg-accent/90 hover:bg-accent',
        thread.resolved ? 'opacity-70' : ''
      ].join(' ')}
    >
      {thread.resolved ? <Check className="size-3.5" /> : thread.created_by_avatar ? (
        <img src={thread.created_by_avatar} alt="" className="size-full rounded-full object-cover" />
      ) : (
        initial
      )}
    </button>
  )
}

function DraftComposer({
  draft,
  panX,
  panY,
  zoom,
  saving,
  onSubmit
}: {
  draft: CommentDraft
  panX: number
  panY: number
  zoom: number
  saving: boolean
  onSubmit: (body: string) => void | Promise<void>
}) {
  const { dialogs } = useI18n()
  const screen = canvasToScreen(draft.x, draft.y, panX, panY, zoom)
  return (
    <div
      data-comment-pin="draft"
      className="absolute z-20"
      style={{ left: screen.x, top: screen.y, transform: 'translate(-14px, -14px)' }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-accent text-[10px] font-semibold text-white shadow-md">
        +
      </div>
      <div className="absolute top-0 left-8 w-56 rounded-lg border border-border bg-panel p-2 shadow-lg">
        <CommentComposer
          autoFocus
          disabled={saving}
          placeholder={dialogs.commentPlaceholder}
          submitLabel={dialogs.postComment}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  )
}

export function CommentPins() {
  const store = useEditorStore()
  const comments = useComments()
  if (!comments.open) return null

  const { panX, panY, zoom } = store.state

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {comments.pagePins.map((thread) => {
        const screen = canvasToScreen(thread.x, thread.y, panX, panY, zoom)
        return (
          <div
            key={thread.id}
            className="pointer-events-auto absolute"
            style={{ left: screen.x, top: screen.y, transform: 'translate(-14px, -14px)' }}
          >
            <PinBubble
              thread={thread}
              selected={comments.selectedId === thread.id}
              onSelect={() => comments.selectThread(thread)}
            />
          </div>
        )
      })}
      {comments.draft ? (
        <div className="pointer-events-auto">
          <DraftComposer
            key={`${comments.draft.pageId}:${comments.draft.x}:${comments.draft.y}`}
            draft={comments.draft}
            panX={panX}
            panY={panY}
            zoom={zoom}
            saving={comments.saving}
            onSubmit={(body) => comments.createThread(body)}
          />
        </div>
      ) : null}
    </div>
  )
}
