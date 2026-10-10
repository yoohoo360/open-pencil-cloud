import {
  formatReviewTimestamp,
  reviewAuthorName
} from '#react/app/document/ai-review/format'
import {
  markerSeverity,
  openComments,
  SEVERITY_DOT_CLASS
} from '#react/app/document/ai-review/severity'
import type { AiReviewMarker, AiReviewSummary } from '#react/app/document/ai-review/types'
import { useAiReview } from '#react/components/AiReview/context'
import { AiReviewPinIcon } from '#react/components/AiReview/AiReviewPinIcon'
import { AiReviewProcess } from '#react/components/AiReview/AiReviewProcess'
import { AiReviewSkillPicker } from '#react/components/AiReview/AiReviewSkillPicker'
import { AppButton } from '#react/components/ui/AppButton'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelHeader } from '#react/components/ui/panel/PanelHeader'
import { useI18n } from '#react/i18n'
import { useOverlayScrollbar } from '#react/internal/overlay-scrollbar/use'
import { ArrowLeft, Check, ClipboardCheck, Plus, Sparkles, Trash2, X } from 'lucide-react'

function ReviewRow({
  review,
  selected,
  locale,
  onSelect
}: {
  review: AiReviewSummary
  selected: boolean
  locale: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      data-test-id="ai-review-row"
      data-review-id={review.id}
      className={[
        'flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left',
        selected ? 'bg-hover text-surface' : 'text-surface hover:bg-hover/70'
      ].join(' ')}
      onClick={onSelect}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium">
          {review.title?.trim() || reviewAuthorName(review)}
        </span>
        <span className="shrink-0 text-[10px] text-muted">
          {formatReviewTimestamp(review.created_at, locale)}
        </span>
      </span>
      <span className="truncate text-[10px] text-muted">
        {reviewAuthorName(review)}
        {' · '}
        {review.marker_count} · {review.comment_count}
      </span>
    </button>
  )
}

function MarkerBlock({
  marker,
  index,
  focused,
  onFocus,
  onRemove
}: {
  marker: AiReviewMarker
  index: number
  focused?: boolean
  onFocus: () => void
  onRemove?: () => void
}) {
  const { dialogs } = useI18n()
  const severity = markerSeverity(marker)
  const comments = openComments(marker)

  return (
    <div
      className={[
        'rounded-lg border px-2 py-1.5 transition-colors',
        focused ? 'border-accent/50 bg-accent/5' : 'border-border/80 bg-panel'
      ].join(' ')}
      data-test-id="ai-review-marker"
      data-marker-id={marker.id}
      data-marker-index={index}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="shrink-0 outline-none"
          aria-label={dialogs.aiReviewMarkerIndex({ index })}
          onClick={onFocus}
        >
          <AiReviewPinIcon severity={severity} index={index} size={20} focused={focused} />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-[11px] font-medium text-surface hover:text-accent"
          onClick={onFocus}
        >
          {marker.node_name || marker.node_id}
        </button>
        {onRemove ? (
          <IconButton label="Remove marker" size="xs" onClick={onRemove}>
            <Trash2 className="size-3" />
          </IconButton>
        ) : null}
      </div>
      <ul className="mt-1.5 flex flex-col gap-1">
        {comments.length === 0 ? (
          <li className="pl-6 text-[10px] leading-snug text-muted">{dialogs.aiReviewNoComments}</li>
        ) : (
          comments.map((comment) => (
            <li
              key={comment.id}
              className="flex gap-1.5 rounded-md bg-hover/40 px-1.5 py-1"
            >
              <span
                className={[
                  'mt-1 size-1.5 shrink-0 rounded-full',
                  SEVERITY_DOT_CLASS[comment.severity]
                ].join(' ')}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] leading-snug text-surface/90">{comment.body}</p>
                {comment.edit?.proposed ? (
                  <p className="mt-0.5 text-[10px] leading-snug text-muted">
                    → {comment.edit.proposed}
                  </p>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function markerListWithIndex(markers: AiReviewMarker[]) {
  return markers.map((marker, index) => ({ marker, index: index + 1 }))
}

export function AiReviewPanel() {
  const { dialogs, locale } = useI18n()
  const scrollRef = useOverlayScrollbar<HTMLDivElement>()
  const reviews = useAiReview()
  const phase = reviews.phase
  const inSession = phase === 'setup' || phase === 'running' || phase === 'ready' || phase === 'submitting'
  const markers =
    reviews.pendingPayload?.markers ?? reviews.draft?.payload.markers ?? []
  const indexedMarkers = markerListWithIndex(markers)

  return (
    <aside
      data-test-id="ai-review-panel"
      className="flex min-w-0 flex-1 flex-col overflow-hidden bg-panel"
    >
      <PanelHeader
        icon={<ClipboardCheck className="size-3.5" />}
        actions={
          <>
            {phase === 'list' ? (
              <AppButton
                color="primary"
                variant="solid"
                size="xs"
                shape="pill"
                className="gap-1 px-2.5"
                onClick={() => reviews.startDraft()}
              >
                <Plus className="size-3" />
                {dialogs.aiReviewNew}
              </AppButton>
            ) : null}
            <IconButton label={dialogs.close} onClick={() => reviews.close()}>
              <X className="size-3.5" />
            </IconButton>
          </>
        }
      >
        {dialogs.aiReviews}
      </PanelHeader>

      {reviews.error ? (
        <p className="px-3 py-2 text-[11px] text-danger" role="alert">
          {reviews.error}
        </p>
      ) : null}

      {inSession && reviews.draft ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1">
            <IconButton
              label={dialogs.backToAiReviews}
              disabled={phase === 'running' || phase === 'submitting'}
              onClick={() => reviews.backToList()}
            >
              <ArrowLeft className="size-3.5" />
            </IconButton>
            <button
              type="button"
              className="text-[11px] text-muted hover:text-surface disabled:opacity-50"
              disabled={phase === 'running' || phase === 'submitting'}
              onClick={() => reviews.backToList()}
            >
              {dialogs.backToAiReviews}
            </button>
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-2">
            {phase === 'setup' ? (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted">{dialogs.aiReviewTitle}</span>
                  <input
                    className="rounded border border-border bg-transparent px-2 py-1 text-xs"
                    value={reviews.draft.title}
                    onChange={(event) => reviews.setDraftTitle(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted">{dialogs.aiReviewBody}</span>
                  <textarea
                    className="min-h-24 resize-y rounded border border-border bg-transparent px-2 py-1 text-xs"
                    value={reviews.draft.requirement}
                    onChange={(event) => reviews.setDraftRequirement(event.target.value)}
                    placeholder={dialogs.aiReviewBodyHint}
                  />
                </label>
                <AiReviewSkillPicker
                  payload={reviews.draft.payload}
                  onChange={(skills) => reviews.setDraftSkills(skills)}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted">
                    {markers.length > 0
                      ? dialogs.aiReviewMarkerCount({ count: markers.length })
                      : dialogs.aiReviewScopePage}
                  </span>
                  <AppButton size="sm" variant="outline" onClick={() => reviews.addSelectedMarkers()}>
                    {dialogs.aiReviewAddSelection}
                  </AppButton>
                </div>
                {markers.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {indexedMarkers.map(({ marker, index }) => (
                      <MarkerBlock
                        key={marker.id}
                        marker={marker}
                        index={index}
                        focused={reviews.focusedMarkerId === marker.id}
                        onFocus={() => reviews.selectMarker(marker.id)}
                        onRemove={() => reviews.removeDraftMarker(marker.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted">{dialogs.aiReviewScopePageHint}</p>
                )}
              </>
            ) : null}

            {phase === 'running' || phase === 'ready' || phase === 'submitting' ? (
              <>
                <AiReviewProcess
                  artifacts={reviews.artifacts}
                  running={phase === 'running'}
                />
                {reviews.pendingPayload?.ai?.summary ? (
                  <p className="rounded-lg bg-hover/40 px-2 py-1.5 text-[11px] leading-snug text-surface">
                    {reviews.pendingPayload.ai.summary}
                  </p>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  {indexedMarkers.map(({ marker, index }) => (
                    <MarkerBlock
                      key={marker.id}
                      marker={marker}
                      index={index}
                      focused={reviews.focusedMarkerId === marker.id}
                      onFocus={() => reviews.selectMarker(marker.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <div className="flex gap-2 border-t border-border p-2">
            {phase === 'setup' ? (
              <AppButton
                color="primary"
                variant="solid"
                className="flex flex-1 items-center justify-center gap-1.5"
                onClick={() => void reviews.runAi()}
              >
                <Sparkles className="size-3.5" />
                <span>{dialogs.aiReviewRunAi}</span>
              </AppButton>
            ) : null}
            {phase === 'running' ? (
              <AppButton
                color="primary"
                variant="solid"
                className="flex flex-1 items-center justify-center gap-1.5"
                disabled
              >
                <Sparkles className="size-3.5" />
                <span>{dialogs.aiReviewRunning}</span>
              </AppButton>
            ) : null}
            {phase === 'ready' || phase === 'submitting' ? (
              <AppButton
                color="primary"
                variant="solid"
                className="flex flex-1 items-center justify-center gap-1.5"
                disabled={phase === 'submitting'}
                onClick={() => void reviews.submitReview()}
              >
                <Check className="size-3.5" />
                <span>
                  {phase === 'submitting' ? dialogs.aiReviewSaving : dialogs.aiReviewSubmit}
                </span>
              </AppButton>
            ) : null}
          </div>
        </div>
      ) : phase === 'detail' && reviews.detail ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1">
            <IconButton label={dialogs.backToAiReviews} onClick={() => reviews.backToList()}>
              <ArrowLeft className="size-3.5" />
            </IconButton>
            <button
              type="button"
              className="text-[11px] text-muted hover:text-surface"
              onClick={() => reviews.backToList()}
            >
              {dialogs.backToAiReviews}
            </button>
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-2">
            <div>
              <p className="text-xs font-medium">
                {reviews.detail.title?.trim() || dialogs.aiReviews}
              </p>
              <p className="text-[10px] text-muted">
                {reviewAuthorName(reviews.detail)} ·{' '}
                {formatReviewTimestamp(reviews.detail.created_at, locale)}
              </p>
              {reviews.detail.history_title ? (
                <button
                  type="button"
                  className="mt-1 text-[10px] text-accent hover:underline"
                  onClick={() => reviews.openLinkedVersion()}
                >
                  {dialogs.aiReviewLinkedVersion({
                    title: reviews.detail.history_title
                  })}
                </button>
              ) : null}
            </div>
            {reviews.detail.payload.ai?.summary ? (
              <p className="rounded-lg bg-hover/40 px-2 py-1.5 text-[11px] leading-snug text-surface">
                {reviews.detail.payload.ai.summary}
              </p>
            ) : null}
            {reviews.detail.payload.requirement?.content ? (
              <div>
                <p className="text-[10px] text-muted">{dialogs.aiReviewBody}</p>
                <p className="whitespace-pre-wrap text-[11px] leading-snug">
                  {reviews.detail.payload.requirement.content}
                </p>
              </div>
            ) : null}
            <AiReviewSkillPicker payload={reviews.detail.payload} readOnly />
            <div className="flex flex-col gap-1.5">
              {markerListWithIndex(reviews.detail.payload.markers).map(({ marker, index }) => (
                <MarkerBlock
                  key={marker.id}
                  marker={marker}
                  index={index}
                  focused={reviews.focusedMarkerId === marker.id}
                  onFocus={() => reviews.selectMarker(marker.id)}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 border-t border-border p-2">
            <AppButton
              variant="outline"
              color="error"
              className="flex-1"
              onClick={() => void reviews.deleteReview(reviews.detail!.id)}
            >
              <Trash2 className="size-3.5" />
              {dialogs.aiReviewDelete}
            </AppButton>
            <AppButton className="flex-1" onClick={() => reviews.backToList()}>
              {dialogs.backToAiReviews}
            </AppButton>
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1">
          {reviews.loading && reviews.reviews.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-muted">{dialogs.loadingAiReviews}</p>
          ) : reviews.reviews.length === 0 ? (
            <div className="flex flex-col items-stretch gap-3 px-2 py-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <ClipboardCheck className="size-5" />
                </span>
                <p className="text-[11px] leading-snug text-muted">{dialogs.noAiReviews}</p>
              </div>
              <AppButton
                color="primary"
                variant="solid"
                size="md"
                className="w-full gap-1.5"
                onClick={() => reviews.startDraft()}
              >
                <Plus className="size-3.5" />
                {dialogs.aiReviewNew}
              </AppButton>
            </div>
          ) : (
            reviews.reviews.map((review) => (
              <ReviewRow
                key={review.id}
                review={review}
                selected={reviews.selectedId === review.id}
                locale={locale}
                onSelect={() => void reviews.selectReview(review)}
              />
            ))
          )}
        </div>
      )}
    </aside>
  )
}
