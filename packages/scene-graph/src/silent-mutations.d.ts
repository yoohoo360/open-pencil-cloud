/** Runtime methods provided by `index.override.ts` via bundler remap. */
export {}

declare module '@open-pencil/scene-graph' {
  interface SceneGraph {
    /** Suppress node graph events while bulk-importing/materializing nodes. */
    runSilentMutations(fn: () => void): void
    readonly isSilentMutation: boolean
  }
}
