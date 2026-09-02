import type { SkiaRenderer } from '#core/canvas/renderer'
import type { RenderLayer } from '#core/canvas/renderer/pipeline'
import { clamp, smoothAverage } from '#core/canvas/renderer/retained-backing/timing'
import { emitNavigationTrace } from '#core/profiler'

const now = typeof performance !== 'undefined' ? () => performance.now() : () => 0
const FRAME_BUDGET_60HZ_MS = 1000 / 60
const MIN_SCENE_BACKING_IDLE_FRAMES = 2
const MAX_SCENE_BACKING_IDLE_FRAMES = 18
const MAX_SCENE_BACKING_QUIET_INPUT_INTERVALS = 4

function previewIdleMs(r: SkiaRenderer): number {
  const minDelay = FRAME_BUDGET_60HZ_MS * MIN_SCENE_BACKING_IDLE_FRAMES
  const maxDelay = FRAME_BUDGET_60HZ_MS * MAX_SCENE_BACKING_IDLE_FRAMES
  const renderMs = clamp(r.sceneBackingAverageRecordMs, minDelay, maxDelay)
  const inputIntervalMs = clamp(r.sceneBackingAverageViewportIntervalMs, 1, maxDelay)
  if (inputIntervalMs > FRAME_BUDGET_60HZ_MS * MAX_SCENE_BACKING_QUIET_INPUT_INTERVALS) {
    return renderMs
  }

  const expectedEventsDuringRender = renderMs / inputIntervalMs
  const quietInputIntervals = clamp(
    expectedEventsDuringRender,
    1,
    MAX_SCENE_BACKING_QUIET_INPUT_INTERVALS
  )
  return clamp(Math.max(renderMs, inputIntervalMs * quietInputIntervals), minDelay, maxDelay)
}

/**
 * Extends preview lifetime only when the scene viewport changes. Active navigation must present an
 * already committed backing; rebuilding during motion reintroduces input/reversal stalls.
 */
export function updateSceneBackingPreviewState(r: SkiaRenderer, layer: RenderLayer): void {
  if (layer !== 'scene') return
  const previous = r.lastSceneViewport
  const viewportChanged =
    !previous || previous.panX !== r.panX || previous.panY !== r.panY || previous.zoom !== r.zoom
  if (!viewportChanged) return

  const timestamp = now()
  if (r.sceneBackingLastViewportEventAt > 0) {
    const interval = timestamp - r.sceneBackingLastViewportEventAt
    r.sceneBackingAverageViewportIntervalMs = smoothAverage(
      r.sceneBackingAverageViewportIntervalMs,
      clamp(interval, 1, 500)
    )
  }
  r.sceneBackingLastViewportEventAt = timestamp
  r.sceneBackingPreviewUntil = timestamp + previewIdleMs(r)
  r.sceneBackingNeedsCrispRender = !!r.sceneBacking
  emitNavigationTrace('backing:preview', {
    previewUntil: r.sceneBackingPreviewUntil,
    hasBacking: !!r.sceneBacking,
    panX: r.panX,
    panY: r.panY,
    zoom: r.zoom
  })
  r.lastSceneViewport = { panX: r.panX, panY: r.panY, zoom: r.zoom }
}
