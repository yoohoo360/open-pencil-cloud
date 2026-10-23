import type { EditorStore } from '#react/app/editor/store'

/** After open / tab focus: no autosave for this long. */
export const AUTOSAVE_OPEN_OR_FOCUS_MS = 60_000

/** After an autosave or manual save: no autosave for this long. */
export const AUTOSAVE_AFTER_SAVE_MS = 3 * 60_000

/** Earliest `Date.now()` when background autosave may run. */
const autosaveNotBefore = new WeakMap<EditorStore, number>()

/** Push the not-before time forward (never shortens an existing gate). */
export function pushAutosaveNotBefore(store: EditorStore, delayMs: number): void {
  const next = Date.now() + delayMs
  const current = autosaveNotBefore.get(store) ?? 0
  if (next > current) autosaveNotBefore.set(store, next)
}

export function isAutosaveAllowed(store: EditorStore): boolean {
  return Date.now() >= (autosaveNotBefore.get(store) ?? 0)
}

/** Just opened a FIG or returned to the tab — wait 1 minute. */
export function noteAutosaveOpenOrFocus(store: EditorStore): void {
  pushAutosaveNotBefore(store, AUTOSAVE_OPEN_OR_FOCUS_MS)
}

/** Autosave or manual save finished — wait 3 minutes. */
export function noteAutosaveAfterSave(store: EditorStore): void {
  pushAutosaveNotBefore(store, AUTOSAVE_AFTER_SAVE_MS)
}
