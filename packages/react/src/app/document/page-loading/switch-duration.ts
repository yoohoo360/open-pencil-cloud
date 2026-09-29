/** Wall-clock loading bounds for manual cold page switches. */
export const PAGE_SWITCH_LOADING_MIN_MS = 1_000
export const PAGE_SWITCH_LOADING_MAX_MS = 8_000

/** Node-count anchors used to estimate overlay duration. */
export const PAGE_SWITCH_NODE_ANCHORS = [
  { nodes: 1_000, ms: 1_000 },
  { nodes: 10_000, ms: 2_500 },
  { nodes: 50_000, ms: 5_500 },
  { nodes: 100_000, ms: 8_000 }
] as const

function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax <= inMin) return outMax
  const t = Math.min(1, Math.max(0, (value - inMin) / (inMax - inMin)))
  return outMin + (outMax - outMin) * t
}

/**
 * Map destroy+create node work onto [1s, 8s] using the 1k / 10k / 50k / 100k
 * anchors from product guidance.
 */
export function estimatePageSwitchLoadingMs(nodeWork: number): number {
  const n = Math.max(0, nodeWork)
  const anchors = PAGE_SWITCH_NODE_ANCHORS
  if (n <= anchors[0].nodes) return PAGE_SWITCH_LOADING_MIN_MS
  for (let i = 1; i < anchors.length; i++) {
    if (n <= anchors[i].nodes) {
      return Math.round(
        lerp(
          n,
          anchors[i - 1].nodes,
          anchors[i].nodes,
          anchors[i - 1].ms,
          anchors[i].ms
        )
      )
    }
  }
  return PAGE_SWITCH_LOADING_MAX_MS
}

export function sleepMs(ms: number): Promise<void> {
  if (!(ms > 0)) return Promise.resolve()
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}
