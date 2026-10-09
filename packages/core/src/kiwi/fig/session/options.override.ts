import type { DocumentAssemblyOptions } from '@open-pencil/fig'
import type { CyclicComponentDiagnostic } from '@open-pencil/fig/instance-overrides'

type Handler<K extends keyof DocumentAssemblyOptions> = NonNullable<DocumentAssemblyOptions[K]>

/** A saved record the reader could not apply and skipped instead of refusing the file. */
export type FigReaderDiagnostic =
  | { kind: 'property'; diagnostic: Parameters<Handler<'onUnresolvedProperty'>>[0] }
  | { kind: 'assignment'; diagnostic: Parameters<Handler<'onUnresolvedAssignment'>>[0] }
  | { kind: 'binding'; diagnostic: Parameters<Handler<'onUnresolvedBinding'>>[0] }
  | { kind: 'component'; diagnostic: Parameters<Handler<'onMissingComponent'>>[0] }
  | { kind: 'cyclic'; diagnostic: CyclicComponentDiagnostic }
  | { kind: 'slot-content'; diagnostic: Parameters<Handler<'onMissingSlotContent'>>[0] }

/**
 * Figma retains override and binding records that address nodes it later deleted, and
 * instances of deleted components, and the reader has no replacement to guess at. Opening
 * a file skips those records, keeps such instances childless, and reports both, including a
 * swap whose target layer is gone. A cyclic instance (self-referential `symbolID` or a longer
 * expansion cycle) is kept childless the same way. A slot whose assigned content frame is
 * gone keeps its component's content. An ambiguous address means the path is wrong, not
 * stale, and still fails.
 */
export function readerSessionOptions(sink: FigReaderDiagnostic[]): DocumentAssemblyOptions {
  const options = {
    derivedBounds: true,
    onUnresolvedProperty: ((diagnostic) =>
      sink.push({ kind: 'property', diagnostic })) satisfies Handler<'onUnresolvedProperty'>,
    onUnresolvedAssignment: ((diagnostic) =>
      sink.push({ kind: 'assignment', diagnostic })) satisfies Handler<'onUnresolvedAssignment'>,
    onUnresolvedBinding: ((diagnostic) =>
      sink.push({ kind: 'binding', diagnostic })) satisfies Handler<'onUnresolvedBinding'>,
    onMissingComponent: ((diagnostic) =>
      sink.push({ kind: 'component', diagnostic })) satisfies Handler<'onMissingComponent'>,
    onCyclicExpansion: (diagnostic: CyclicComponentDiagnostic) =>
      sink.push({ kind: 'cyclic', diagnostic }),
    onMissingSlotContent: ((diagnostic) =>
      sink.push({ kind: 'slot-content', diagnostic })) satisfies Handler<'onMissingSlotContent'>
  }
  return options
}
