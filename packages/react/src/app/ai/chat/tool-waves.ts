/**
 * CanvasKit / the Skia renderer are not safe for overlapping JS calls on the
 * same WASM heap. Even "read" tools (`describe`, `eval`, layout) touch Skia, so
 * every design tool runs serially. Emitting many `tool_calls` in one model turn
 * is still valuable (one LLM round-trip); only local execution is ordered.
 */
export type DesignToolRunMode = 'serial'

export function designToolRunMode(_name: string): DesignToolRunMode {
  return 'serial'
}

/** One call per wave — keeps planning API stable while forcing serial order. */
export function planDesignToolWaves<T extends { name: string }>(
  calls: readonly T[]
): T[][] {
  return calls.map((call) => [call])
}

/** Run waves in order; never overlap CanvasKit-backed tool work. */
export async function runDesignToolWaves<T>(
  waves: readonly T[][],
  runOne: (item: T) => Promise<void>
): Promise<void> {
  for (const wave of waves) {
    for (const item of wave) {
      await runOne(item)
    }
  }
}
