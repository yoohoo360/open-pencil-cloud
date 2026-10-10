import {
  markerSeverity,
  openComments,
  SEVERITY_DOT_CLASS
} from '#react/app/document/ai-review/severity'
import { markerAnchor } from '#react/app/document/ai-review/markers'
import type { AiReviewMarker } from '#react/app/document/ai-review/types'
import { canvasToScreen } from '#react/app/document/comments/coords'
import { useEditorStore, useEditorStoreApi } from '#react/app/editor/store'
import { useOverlayViewport } from '#react/canvas/overlay-viewport'
import { AiReviewPinIcon, aiReviewPinTipOffset } from '#react/components/AiReview/AiReviewPinIcon'
import { useOptionalAiReview } from '#react/components/AiReview/context'
import { useI18n } from '#react/i18n'
import { useState } from 'react'

const PIN_SIZE = 24

function MarkerPin({
  marker,
  index,
  focused,
  left,
  top,
  onSelect
}: {
  marker: AiReviewMarker
  index: number
  focused: boolean
  left: number
  top: number
  onSelect: () => void
}) {
  const { dialogs } = useI18n()
  const [hovered, setHovered] = useState(false)
  const severity = markerSeverity(marker)
  const comments = openComments(marker)

  return (
    <div
      className="pointer-events-auto absolute z-10"
      style={{ left, top, transform: aiReviewPinTipOffset(PIN_SIZE) }}
      data-review-marker={marker.id}
      data-marker-index={index}
      data-severity={severity}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={`${index}. ${marker.node_name || marker.node_id}`}
        className={[
          'relative block outline-none origin-bottom-left transition-transform',
          focused ? '' : 'hover:scale-105'
        ].join(' ')}
        onPointerDown={(event) => {
          event.stopPropagation()
          onSelect()
        }}
      >
        <AiReviewPinIcon severity={severity} index={index} size={PIN_SIZE} focused={focused} />
      </button>

      {hovered ? (
        <div
          className="absolute bottom-full left-2 z-20 mb-1 w-56 rounded-lg border border-border bg-panel p-2 shadow-lg"
          data-test-id="ai-review-marker-hover"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <AiReviewPinIcon severity={severity} index={index} size={18} />
            <p className="truncate text-[11px] font-medium text-surface">
              {marker.node_name || marker.node_id}
            </p>
          </div>
          {comments.length === 0 ? (
            <p className="text-[10px] leading-snug text-muted">{dialogs.aiReviewNoComments}</p>
          ) : (
            <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {comments.slice(0, 6).map((comment) => (
                <li
                  key={comment.id}
                  className="flex gap-1.5 rounded-md bg-hover/60 px-1.5 py-1 text-[10px] leading-snug"
                >
                  <span
                    className={[
                      'mt-1 size-1.5 shrink-0 rounded-full',
                      SEVERITY_DOT_CLASS[comment.severity]
                    ].join(' ')}
                    aria-hidden
                  />
                  <span className="text-surface">{comment.body}</span>
                </li>
              ))}
              {comments.length > 6 ? (
                <li className="text-[10px] text-muted">+{comments.length - 6}</li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function AiReviewMarkers() {
  const storeApi = useEditorStoreApi()
  useEditorStore()
  const { panX, panY, zoom } = useOverlayViewport(storeApi)
  const reviews = useOptionalAiReview()
  if (!reviews?.open) return null

  const markers = reviews.activeMarkers
  if (markers.length === 0) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      data-test-id="ai-review-markers"
    >
      {markers.map((marker, index) => {
        const anchor = markerAnchor(storeApi, marker)
        if (!anchor) return null
        const screen = canvasToScreen(anchor.x, anchor.y, panX, panY, zoom)
        return (
          <MarkerPin
            key={marker.id}
            marker={marker}
            index={index + 1}
            focused={reviews.focusedMarkerId === marker.id}
            left={screen.x}
            top={screen.y}
            onSelect={() => reviews.selectMarker(marker.id)}
          />
        )
      })}
    </div>
  )
}
