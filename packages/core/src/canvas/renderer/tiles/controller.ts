import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import {
  nodeRequiresAtomicChunk,
  RenderChunkIndex,
  RenderChunkPictureCache
} from '#core/canvas/renderer/chunks'

import { TileImageCache } from './cache'
import { TILE_DEVICE_SIZE, tileLevel, tileWorldBounds, type TileWorldBounds } from './geometry'
import { planTiles } from './planner'
import { deleteRenderedTile, renderTile, tileChunks } from './render'
import {
  emptyTileSchedulerMetrics,
  TileScheduler,
  type TileJob,
  type TileSchedulerMetrics
} from './scheduler'
import { TileSurfacePool } from './surface-pool'
import { emitTileCoverageComplete, emitTileFrameTrace } from './telemetry'

const TILE_FRAME_BUDGET_MS = 5
const MAXIMUM_TILE_JOBS_PER_FRAME = 32
const TILE_OVERSCAN = 1

export interface TiledSceneFrameResult {
  covered: boolean
  pending: boolean
  metrics: TileSchedulerMetrics
}

export class TiledSceneController {
  private index: RenderChunkIndex | null = null
  private pageId: string | null = null
  private contentGeneration = -1
  private navigationGeneration = -1
  private navigationActive = false
  private cancelledJobs = 0
  private pendingInvalidations: Array<{
    nodeId: string
    previousBounds: TileWorldBounds[]
  }> = []
  private lastCoveredGeneration = ''
  private readonly pictureCache = new RenderChunkPictureCache()
  private readonly tileCache = new TileImageCache()
  private readonly surfacePool = new TileSurfacePool()
  private readonly scheduler = new TileScheduler({
    budgetMs: TILE_FRAME_BUDGET_MS,
    maximumJobsPerFrame: MAXIMUM_TILE_JOBS_PER_FRAME
  })
  private readonly measuredCosts = new Map<string, number>()

  invalidateNode(nodeId: string, graph?: SceneGraph): void {
    const chunks = this.index?.getChunksDependingOnNode(nodeId) ?? []
    const owningChunks = this.index?.getChunksForNode(nodeId) ?? []
    const node = graph?.getNode(nodeId)
    if (
      graph &&
      node &&
      owningChunks.some((chunk) => chunk.interruptible === nodeRequiresAtomicChunk(graph, node))
    ) {
      this.invalidateStructure()
      return
    }
    this.pendingInvalidations.push({
      nodeId,
      previousBounds: chunks.map(({ minX, minY, maxX, maxY }) => ({ minX, minY, maxX, maxY }))
    })
  }

  invalidateStructure(): void {
    this.invalidate()
  }

  renderFrame(
    renderer: SkiaRenderer,
    canvas: Canvas,
    graph: SceneGraph,
    contentGeneration: number,
    navigationGeneration: number
  ): TiledSceneFrameResult {
    this.navigationGeneration = navigationGeneration
    this.navigationActive = this.isNavigationActive(renderer)
    this.prepareGeneration(renderer, graph, contentGeneration, navigationGeneration)
    const index = this.index
    if (!index || !renderer.pageId) return this.emptyResult()

    const level = tileLevel(renderer.zoom * renderer.dpr)
    const viewport = {
      minX: -renderer.panX / renderer.zoom,
      minY: -renderer.panY / renderer.zoom,
      maxX: (-renderer.panX + renderer.viewportWidth) / renderer.zoom,
      maxY: (-renderer.panY + renderer.viewportHeight) / renderer.zoom
    }
    const plan = planTiles(
      this.tileCache,
      {
        pageId: renderer.pageId,
        level,
        viewport,
        overscanTiles: TILE_OVERSCAN,
        navigationGeneration,
        contentGeneration,
        estimateCost: (key) =>
          this.measuredCosts.get(this.costKey(key)) ??
          tileChunks(index, key).reduce((total, chunk) => total + chunk.estimatedCost, 0),
        globalFallbackAvailable: true
      },
      this.navigationActive
    )
    if (!this.navigationActive) this.scheduler.enqueue(plan.jobs)
    canvas.save()
    canvas.translate(renderer.panX, renderer.panY)
    canvas.scale(renderer.zoom, renderer.zoom)
    const metrics = this.navigationActive
      ? this.deferActiveJobs(plan.jobs)
      : this.runScheduledFrame(renderer, graph, index)
    metrics.cancelledJobs += this.cancelledJobs
    this.cancelledJobs = 0
    const visibleCoverage = planTiles(
      this.tileCache,
      {
        pageId: renderer.pageId,
        level,
        viewport,
        overscanTiles: 0,
        navigationGeneration,
        contentGeneration,
        estimateCost: () => 0
      },
      this.navigationActive
    )
    const presentedTileCount = this.navigationActive
      ? 0
      : this.drawVisibleTiles(renderer, canvas, visibleCoverage.visible)
    canvas.restore()
    const covered = visibleCoverage.visible.every(({ tile }) => tile !== null)
    emitTileFrameTrace({
      contentGeneration,
      metrics,
      tileCacheBytes: this.tileCache.byteSize(),
      tileCacheEntries: this.tileCache.size(),
      visibleTileCount: visibleCoverage.visible.length,
      presentedTileCount,
      covered
    })
    const settledGenerationKey = `${navigationGeneration}:${contentGeneration}`
    if (covered && !this.navigationActive && this.lastCoveredGeneration !== settledGenerationKey) {
      this.lastCoveredGeneration = settledGenerationKey
      emitTileCoverageComplete(
        level,
        contentGeneration,
        navigationGeneration,
        this.tileCache.size(),
        this.tileCache.byteSize()
      )
    }
    return {
      covered,
      pending: this.scheduler.pending() > 0 || (!covered && !this.navigationActive),
      metrics
    }
  }

  invalidate(): void {
    this.cancelledJobs += this.scheduler.clear()
    this.index?.dispose()
    this.index = null
    this.pageId = null
    this.contentGeneration = -1
    this.lastCoveredGeneration = ''
    this.pendingInvalidations = []
    this.measuredCosts.clear()
    this.pictureCache.clear()
    this.tileCache.clear()
  }

  destroy(): void {
    this.invalidate()
    this.cancelledJobs = 0
    this.navigationGeneration = -1
    this.navigationActive = false
    this.surfacePool.clear()
  }

  private isNavigationActive(renderer: SkiaRenderer): boolean {
    return (
      renderer.navigationPhase === 'pan' ||
      renderer.navigationPhase === 'zoom' ||
      renderer.navigationPhase === 'momentum' ||
      renderer.navigationPhase === 'settling'
    )
  }

  private prepareGeneration(
    renderer: SkiaRenderer,
    graph: SceneGraph,
    contentGeneration: number,
    navigationGeneration: number
  ): void {
    this.cancelledJobs += this.scheduler.setGeneration(navigationGeneration, contentGeneration)
    if (
      this.index &&
      this.pageId === renderer.pageId &&
      this.contentGeneration !== contentGeneration &&
      this.pendingInvalidations.length > 0
    ) {
      this.applyPendingInvalidations(graph, contentGeneration)
    }
    if (
      this.index &&
      (this.pageId !== renderer.pageId || this.contentGeneration !== contentGeneration)
    ) {
      this.invalidate()
    }
    if (!this.navigationActive && this.index === null && renderer.pageId) {
      this.ensureIndex(graph, renderer.pageId, contentGeneration)
    }
  }

  private applyPendingInvalidations(graph: SceneGraph, contentGeneration: number): void {
    const index = this.index
    if (!index || !this.pageId) return
    this.tileCache.advanceGeneration(contentGeneration)
    for (const invalidation of this.pendingInvalidations) {
      const before = invalidation.previousBounds
      const chunks = index.getChunksDependingOnNode(invalidation.nodeId)
      for (const chunk of chunks) this.pictureCache.invalidate(chunk.id)
      for (const chunk of chunks) index.updateNode(graph, chunk.nodeId)
      const after = index.getChunksDependingOnNode(invalidation.nodeId)
      for (const bounds of [...before, ...after]) {
        this.tileCache.invalidateBounds(this.pageId, bounds, contentGeneration)
      }
    }
    this.pendingInvalidations = []
    this.contentGeneration = contentGeneration
  }

  private ensureIndex(graph: SceneGraph, pageId: string | null, contentGeneration: number): void {
    if (this.index && this.pageId === pageId && this.contentGeneration === contentGeneration) return
    this.index?.dispose()
    this.pictureCache.clear()
    this.tileCache.markStale(contentGeneration)
    this.pageId = pageId
    this.contentGeneration = contentGeneration
    this.index = pageId ? RenderChunkIndex.build(graph, pageId).index : null
  }

  private runScheduledFrame(
    renderer: SkiaRenderer,
    graph: SceneGraph,
    index: RenderChunkIndex
  ): TileSchedulerMetrics {
    return this.scheduler.runFrame((job) => this.executeJob(renderer, graph, index, job))
  }

  private deferActiveJobs(jobs: TileJob[]): TileSchedulerMetrics {
    const metrics = emptyTileSchedulerMetrics()
    metrics.remaining = jobs.length
    metrics.skippedWithFallback = jobs.filter((job) => job.fallbackAvailable).length
    return metrics
  }

  private executeJob(
    renderer: SkiaRenderer,
    graph: SceneGraph,
    index: RenderChunkIndex,
    job: TileJob
  ) {
    const tile = renderTile(renderer, graph, index, job.key, this.pictureCache, this.surfacePool)
    if (!tile) return { renderMs: 0, overBudget: true }
    const previousCost = this.measuredCosts.get(this.costKey(job.key)) ?? tile.renderMs
    this.measuredCosts.set(this.costKey(job.key), previousCost * 0.7 + tile.renderMs * 0.3)
    if (
      job.navigationGeneration !== this.navigationGeneration ||
      job.contentGeneration !== this.contentGeneration
    ) {
      deleteRenderedTile(tile)
      return this.jobResult(tile)
    }
    this.tileCache.install(tile, job.contentGeneration)
    return this.jobResult(tile)
  }

  private jobResult(tile: NonNullable<ReturnType<typeof renderTile>>) {
    return {
      renderMs: tile.renderMs,
      overBudget: tile.renderMs > TILE_FRAME_BUDGET_MS,
      allocationMs: tile.allocationMs,
      drawMs: tile.drawMs,
      flushMs: tile.flushMs,
      snapshotMs: tile.snapshotMs,
      chunkCount: tile.chunkCount
    }
  }

  private costKey(key: TileJob['key']): string {
    return `${key.level}:${key.x}:${key.y}`
  }

  private drawVisibleTiles(
    renderer: SkiaRenderer,
    canvas: Canvas,
    visible: ReturnType<typeof planTiles>['visible']
  ): number {
    let presented = 0
    renderer.opacityPaint.setAlphaf(1)
    renderer.opacityPaint.setBlendMode(renderer.ck.BlendMode.Src)
    try {
      for (const { key, tile } of visible) {
        if (!tile) continue
        const bounds = tileWorldBounds(key)
        canvas.drawImageRectOptions(
          tile.image,
          renderer.ck.LTRBRect(0, 0, TILE_DEVICE_SIZE, TILE_DEVICE_SIZE),
          renderer.ck.LTRBRect(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY),
          renderer.ck.FilterMode.Linear,
          renderer.ck.MipmapMode.None,
          renderer.opacityPaint
        )
        presented++
      }
    } finally {
      renderer.opacityPaint.setBlendMode(renderer.ck.BlendMode.SrcOver)
    }
    return presented
  }

  private emptyResult(): TiledSceneFrameResult {
    return {
      covered: false,
      pending: false,
      metrics: emptyTileSchedulerMetrics()
    }
  }
}
