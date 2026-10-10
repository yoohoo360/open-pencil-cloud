import { canvasToScreen } from '#react/app/document/comments/coords'
import { commentAuthorName } from '#react/app/document/comments/format'
import type { CommentDraft, DocumentCommentThread } from '#react/app/document/comments/types'
import { useEditorStore, useEditorStoreApi } from '#react/app/editor/store'
import { useOverlayViewport } from '#react/canvas/overlay-viewport'
import { BubblePin, bubblePinTipOffset } from '#react/components/canvas/BubblePin'
import { CommentComposer } from '#react/components/Comments/CommentComposer'
import { useComments } from '#react/components/Comments/context'
import { useI18n } from '#react/i18n'
import { type PointerEvent as ReactPointerEvent } from 'react'

const PIN_SIZE = 24
const COMMENT_FILL = 'var(--color-accent, #3b82f6)'

function PinBubble({
  thread,
  index,
  selected,
  onSelect
}: {
  thread: DocumentCommentThread
  index: number
  selected: boolean
  onSelect: () => void
}) {
  const name = commentAuthorName(thread)
  return (
    <button
      type="button"
      data-comment-pin={thread.id}
      data-comment-index={index}
      aria-label={`${index}. ${name}`}
      onPointerDown={(event: ReactPointerEvent) => {
        event.stopPropagation()
        onSelect()
      }}
      className={[
        'block outline-none origin-bottom-left transition-transform',
        selected ? '' : 'hover:scale-105',
        thread.resolved ? 'opacity-70' : ''
      ].join(' ')}
    >
      <BubblePin
        fill={COMMENT_FILL}
        size={PIN_SIZE}
        focused={selected}
        label={index}
      />
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
      style={{ left: screen.x, top: screen.y, transform: bubblePinTipOffset(PIN_SIZE) }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <BubblePin fill={COMMENT_FILL} size={PIN_SIZE} label="+" />
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
  const storeApi = useEditorStoreApi()
  useEditorStore()
  const { panX, panY, zoom } = useOverlayViewport(storeApi)
  const comments = useComments()
  if (!comments.open) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {comments.pagePins.map((thread, index) => {
        const screen = canvasToScreen(thread.x, thread.y, panX, panY, zoom)
        return (
          <div
            key={thread.id}
            className="pointer-events-auto absolute"
            style={{ left: screen.x, top: screen.y, transform: bubblePinTipOffset(PIN_SIZE) }}
          >
            <PinBubble
              thread={thread}
              index={index + 1}
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
