/** Runtime field provided by `renderer.override.ts` via bundler remap. */
export {}

declare module '#core/canvas/renderer' {
  interface SkiaRenderer {
    /** Prefer larger contiguous tile fills while the canvas loading overlay is visible. */
    tiledSceneLoadingBoost: boolean
  }
}

declare module '@open-pencil/core/canvas' {
  interface SkiaRenderer {
    tiledSceneLoadingBoost: boolean
  }
}
