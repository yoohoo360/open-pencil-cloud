/** Embind/WASM objects from CanvasKit expose these without always sharing a named type. */
type SkiaDeletable = {
  isDeleted(): boolean
  delete(): void
}

/**
 * Idempotent native delete. Cache invalidation and structure events can race a
 * prior dispose; calling `delete()` twice throws `table index is out of bounds`.
 */
export function deleteSkiaObject(object: SkiaDeletable | null | undefined): void {
  if (!object || object.isDeleted()) return
  try {
    object.delete()
  } catch {
    // Handle already freed or WASM heap recycled after a previous delete.
  }
}
