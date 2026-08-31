import { readStoredUser } from '#react/app/auth/storage'
import {
  formatCommentTimestamp,
  threadPreview
} from '#react/app/document/comments/format'
import { groupCommentThreads } from '#react/app/document/comments/group'
import type { DocumentComment, DocumentCommentThread } from '#react/app/document/comments/types'
import { CommentAuthor, CommentComposer } from '#react/components/Comments/CommentComposer'
import { useComments } from '#react/components/Comments/context'
import { AppButton } from '#react/components/ui/AppButton'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelHeader } from '#react/components/ui/panel/PanelHeader'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import { useI18n } from '#react/i18n'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import { ArrowLeft, Check, MessageSquare, Trash2, X } from 'lucide-react'

function ThreadRow({
  thread,
  selected,
  locale,
  onSelect
}: {
  thread: DocumentCommentThread
  selected: boolean
  locale: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      data-test-id="comment-thread"
      data-comment-id={thread.id}
      className={[
        'flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left',
        selected ? 'bg-hover text-surface' : 'text-surface hover:bg-hover/70'
      ].join(' ')}
      onClick={onSelect}
    >
      <span className="flex items-center justify-between gap-2">
        <CommentAuthor name={thread.created_by_name} avatar={thread.created_by_avatar} />
        <span className="shrink-0 text-[10px] text-muted">
          {formatCommentTimestamp(thread.updated_at ?? thread.created_at, locale)}
        </span>
      </span>
          <span className="line-clamp-2 pl-7 text-[11px] text-muted">{threadPreview(thread)}</span>
    </button>
  )
}

function CommentMessage({
  comment,
  locale,
  canDelete,
  onDelete
}: {
  comment: DocumentComment
  locale: string
  canDelete: boolean
  onDelete: () => void
}) {
  const { dialogs } = useI18n()
  return (
    <div className="flex flex-col gap-1 px-2 py-1.5" data-comment-message={comment.id}>
      <div className="flex items-center justify-between gap-2">
        <CommentAuthor name={comment.created_by_name} avatar={comment.created_by_avatar} />
        <span className="flex items-center gap-1">
          <span className="text-[10px] text-muted">
            {formatCommentTimestamp(comment.created_at, locale)}
          </span>
          {canDelete ? (
            <IconButton label={dialogs.deleteComment} size="xs" onClick={onDelete}>
              <Trash2 className="size-3" />
            </IconButton>
          ) : null}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-xs text-surface">{comment.body}</p>
    </div>
  )
}

export function CommentsPanel() {
  const { dialogs, locale } = useI18n()
  const scrollRef = useOverlayScrollbar<HTMLDivElement>()
  const comments = useComments()
  const currentUser = readStoredUser()
  const groups = groupCommentThreads(comments.threads)
  const selected = comments.selectedThread

  return (
    <aside
      data-test-id="comments-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
    >
      <PanelHeader
        icon={<MessageSquare className="size-3.5" />}
        actions={
          <IconButton label={dialogs.close} onClick={() => comments.close()}>
            <X className="size-3.5" />
          </IconButton>
        }
      >
        {dialogs.comments}
      </PanelHeader>
      <div className="flex flex-col gap-2 border-b border-border px-2 py-2">
        <SegmentedControl
          label={dialogs.commentFilter}
          value={comments.filter}
          options={[
            { value: 'open', label: dialogs.openComments },
            { value: 'resolved', label: dialogs.resolvedComments }
          ]}
          onChange={(value) => comments.setFilter(value === 'resolved' ? 'resolved' : 'open')}
        />
        <label className="flex items-center gap-1.5 px-0.5 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={comments.currentPageOnly}
            onChange={(event) => comments.setCurrentPageOnly(event.target.checked)}
          />
          {dialogs.commentsThisPage}
        </label>
      </div>
      {comments.error ? (
        <p className="px-3 py-2 text-[11px] text-danger" role="alert">
          {comments.error}
        </p>
      ) : null}
      {selected ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-1 border-b border-border px-1.5 py-1">
            <IconButton label={dialogs.backToComments} onClick={() => comments.cancel()}>
              <ArrowLeft className="size-3.5" />
            </IconButton>
            <AppButton
              variant="ghost"
              onClick={() => void comments.resolveThread(selected.id, !selected.resolved)}
            >
              <Check className="mr-1 size-3.5" />
              {selected.resolved ? dialogs.reopenComment : dialogs.resolveComment}
            </AppButton>
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-overlay py-1">
            {selected.comments.map((comment) => (
              <CommentMessage
                key={comment.id}
                comment={comment}
                locale={locale}
                canDelete={Boolean(currentUser?.id && currentUser.id === comment.created_by)}
                onDelete={() => void comments.deleteComment(selected.id, comment.id)}
              />
            ))}
          </div>
          {selected.resolved ? null : (
            <div className="border-t border-border p-2">
              <CommentComposer
                disabled={comments.saving}
                placeholder={dialogs.replyPlaceholder}
                submitLabel={dialogs.reply}
                onSubmit={(body) => comments.reply(selected.id, body)}
              />
            </div>
          )}
        </div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-overlay px-1.5 py-1">
          <p className="px-2 py-2 text-[11px] leading-4 text-muted">{dialogs.commentCanvasHint}</p>
          {groups.map((group) => (
            <div key={group.key} className="mt-1">
              <p className="px-2 py-1 text-[10px] font-medium tracking-wide text-muted uppercase">
                {group.key === 'today'
                  ? dialogs.commentsToday
                  : group.key === 'yesterday'
                    ? dialogs.commentsYesterday
                    : dialogs.commentsOlder}
              </p>
              {group.threads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  selected={comments.selectedId === thread.id}
                  locale={locale}
                  onSelect={() => comments.selectThread(thread)}
                />
              ))}
            </div>
          ))}
          {comments.loading && !comments.list ? (
            <p className="px-2 py-3 text-[11px] text-muted">{dialogs.loadingComments}</p>
          ) : null}
          {!comments.loading && comments.threads.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-muted">{dialogs.noComments}</p>
          ) : null}
        </div>
      )}
    </aside>
  )
}
