# FIG import performance notes (React)

Working notes from profiling a ~36 MB / 8-page / ~24k-node `.fig` open on the React app path (`readFigDocument` → `finishFigImport`).

Interactive summary: Cursor canvas `fig-import-perf.canvas.tsx` (workspace canvases folder).

## Remodel plan

| Phase | Status | Goal |
| --- | --- | --- |
| **P0 Measure** | Done | Instrument `[fig-timing]`, capture baseline, separate decode / materialize / UI |
| **P1 First-page laziness** | Done | Session create = shells only; `loadPage` fills content |
| **P2 Post-parse UI** | Done | Warm `switchPage`, silent hosted hydrate, O(n²) child-order fix |
| **P3 A/B populate** | Optional | Trial `populate: 'all'` vs `first-page` in React `fig.ts` |
| **P4 Follow-ups** | Next | Yjs suppress on replace; keep population worker across import; seed `populatedRootIds` |

## Implementation: override files

Perf changes live in `.override.ts` (bundler remaps `foo.ts` → `foo.override.ts`). Base fig document files stay upstream-shaped.

| Optimization | Path |
| --- | --- |
| Scoped `selectPages` / shells-only empty Set | `packages/fig/src/document/read.override.ts` |
| Session shells + silent `loadPage` + O(n²) child merge | `packages/fig/src/document/materialize.override.ts` |
| Public fig export | `packages/fig/src/index.ts` → `materialize.override` |
| Warm `switchPage` | `packages/core/src/editor/pages.override.ts` |
| Silent hosted hydrate on replace | `packages/react/src/app/editor/store.tsx` |

### Target architecture (P1)

```
createFigDocumentSession  (materialize.override)
  └─ createArchiveDocumentReader(bytes, new Set())  // shells only (read.override)
openReaderSession(populate)
  ├─ first-page → loadPage(first)   // silent mutations
  ├─ all        → loadPage(each)
  └─ none       → shells only
finishFigImport
  └─ warm switchPage if page already loaded (no sync Yoga)
```

### Decision criteria (P3)

Same file, two runs — prefer the mode that wins on:

1. `ui.finishFigImport.total` (time to interactive)
2. First paint / overlay dismiss
3. Cold switch to page 2 cost (must not regress badly)

## Baseline (before fixes)

| Stage | Time | Notes |
| --- | ---: | --- |
| Worker open / session | ~3.2 s | Decode + materialize |
| `main.parseFigFile` | ~6.0 s | Includes transfer + deserialize |
| `ui.applyImportedDocument.replaceGraph` | ~16 s | Sync work after swap |
| `ui.finishFigImport.switchPage` | ~2.5 s | Re-prepare + sync layout |
| `ui.finishFigImport.total` | ~22 s | End-to-end open |

Decode alone was not the main cost (`kiwi.decodeMessage` ~450 ms). Most time was after the graph existed.

## Related files

| Area | Path |
| --- | --- |
| React open | `packages/react/src/app/document/fig.ts` |
| Store replace | `packages/react/src/app/editor/store.tsx` |
| Page switch | `packages/core/src/editor/pages.override.ts` |
| Session / materialize | `packages/fig/src/document/materialize.override.ts` |
| Scoped reader | `packages/fig/src/document/read.override.ts` |
