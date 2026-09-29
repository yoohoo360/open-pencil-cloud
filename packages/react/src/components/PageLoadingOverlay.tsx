import { useEditorStore } from '#react/app/editor/store'

/**
 * Canvas-center overlay shared by FIG open and cold page switch.
 * Sliding line + status detail only (no `1 of 8` count).
 */
export function PageLoadingOverlay() {
  const store = useEditorStore()
  const progress = store.state.pageLoading
  if (!progress.visible) return null

  const detail = progress.detail?.trim() || 'Loading…'

  return (
    <div
      data-test-id="canvas-page-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={detail}
      className="absolute inset-0 z-50 flex cursor-default items-center justify-center bg-canvas"
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onWheel={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      <div className="flex w-72 flex-col items-center gap-3 text-center">
        <div className="h-0.5 w-28 overflow-hidden rounded-full bg-surface/8">
          <div className="h-full w-2/5 animate-page-loading-slide rounded-full bg-surface/30 motion-reduce:animate-none" />
        </div>
        <p className="max-w-72 truncate px-2 text-xs text-surface/45">{detail}</p>
      </div>
    </div>
  )
}
