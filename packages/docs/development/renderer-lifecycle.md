# Renderer lifecycle and ownership

The CanvasKit renderer keeps hot drawing loops direct, but its retained and tiled paths follow explicit lifecycle contracts. Preserve these contracts when changing renderer structure or cache policy.

## Navigation and settlement

The default renderer presents a committed retained backing while navigation is active. It must not rebuild that backing during pan, zoom, momentum, or settling, because reconstruction can collide with direction reversals and block input delivery. Once navigation becomes idle, it builds exact content incrementally and atomically replaces the committed backing.

The tiled renderer is opt-in. It also presents retained fallback pixels while navigation is active and defers tile rasterization and presentation until idle. Visible exact coverage is the settlement boundary; overscan remains background work.

Generation rules:

- Navigation generations cancel obsolete queued tile work.
- Content generations invalidate affected pictures and tiles.
- Page, scene, position-preview, and font versions all participate in retained-cache validity.
- A stale build or raster result must be deleted rather than installed.

## CanvasKit ownership

CanvasKit objects are native/WASM resources and are not reclaimed reliably by JavaScript garbage collection. Ownership transfer must remain explicit.

| Resource | Created by | Owner after success | Released by |
| --- | --- | --- | --- |
| Scene picture | Scene recorder | Renderer scene-picture state | Replacement, invalidation, renderer destruction |
| Retained backing image | Completed backing build | Retained backing state | Replacement, invalidation, renderer destruction |
| Retained build surface | Backing builder | Retained build state | Commit, cancellation, invalidation, renderer destruction |
| Subtree picture | Subtree recorder | Subtree picture cache | Scope change, node invalidation, renderer destruction |
| Chunk picture | Chunk recorder | `RenderChunkPictureCache` | Chunk invalidation or cache clear |
| Tile image | `renderTile()` | Caller until installation, then `TileImageCache` | Stale-result discard, replacement, eviction, cache clear |
| Tile surface | `TileSurfacePool` | Surface pool | Pool clear |
| Effect raster image | Effect rasterizer | Effect raster cache | Node invalidation, eviction, cache clear |
| CanvasKit path arrays | Geometry builder | Owning geometry cache | Node invalidation or renderer destruction |

Do not introduce generic disposal wrappers into per-node or per-tile hot loops. Prefer narrow domain operations with obvious transfer points, and use `try/finally` around recorder, surface, paint-effect, and transform lifetimes.

## Performance-preserving refactors

Safe structural refactors may split modules, name state records, extract telemetry, and document transitions. They must not change:

- Frame budgets, cache limits, tile size, quantized levels, or overscan policy.
- Visible-before-overscan priority.
- Direct CanvasKit calls and preallocated temporary buffers in hot loops.
- Atomic isolation for masks, opacity, blend modes, and blur scopes.
- Exact settlement acknowledgement.

Validate structural changes with the `gold-preview.fig` reversal and mutation-plus-reversal benchmarks, focused renderer tests, and committed canvas snapshots. Compare production builds rather than relying on synchronous microbenchmarks.
