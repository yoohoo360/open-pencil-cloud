/* eslint-disable max-lines -- font loading and registration share FontManager lifecycle state */

import type { CanvasKit, TypefaceFontProvider } from 'canvaskit-wasm'

import type { FontVariation, SceneGraph } from '@open-pencil/scene-graph'

import { IS_BROWSER } from '#core/constants'
import {
  chooseLocalFontMatch,
  normalizeFontFamily,
  styleToWeight,
  weightToStyle
} from '#core/text/font/style'
import { isVariableFont, namedInstanceVariations } from '#core/text/font/variation'

export * from '#core/text/font/sources'
export * from '#core/text/font/style'
export * from '#core/text/font/variation'
import { fontFallbackEntry } from '#core/text/fallbacks.override'
import type { FontFallbackScript } from '#core/text/fallbacks.override'
import { UnsupportedFontFormatError } from '#core/text/font/sources'
import type {
  DownloadedFontCache,
  FontFamilyOption,
  FontInfo,
  FontLoadedSource,
  FontUnavailableReason,
  HostFontLoader,
  LocalFontAccessState
} from '#core/text/font/sources'
import {
  codePointInRanges,
  coverageFromPingFangRanges,
  hydratePingFangStyleManifest,
  isPingFangScFamily,
  parsePingFangCoverageConfig,
  parsePingFangStyleManifest,
  PINGFANG_SC_FAMILY,
  pingFangConfigUrl,
  pingFangManifestUrl,
  pingFangSliceIdForCodePoint,
  pingFangSliceRenderFamily,
  pingFangSliceUrl,
  resolvePingFangSliceStyle,
  selectPingFangSliceIds,
  usesPingFangSlices,
  type PingFangCoverageConfig,
  type PingFangSliceMeta,
  type PingFangStyleManifest
} from '#core/text/pingfang-slices'
import { collectGraphFontKeys } from '#core/text/requirements'
import {
  charactersToUnicodeRange,
  normalizedCoverageText,
  WebFontResolver
} from '#core/text/web-fonts.override'
import type { WebFontFetch, WebFontProviderId } from '#core/text/web-fonts.override'

type FindLocalFontOptions = { allowVariable?: boolean }

/** Bundled static faces under `packages/react/public`. PingFang SC is slices-only (`/pingfang-sc`). */
const BUNDLED_FONTS: Record<string, string> = {
  'Inter|Regular': '/Inter-Regular.ttf',
  'Inter|Medium': '/Inter-Medium.ttf',
  'Inter|SemiBold': '/Inter-SemiBold.ttf',
  'Inter|Bold': '/Inter-Bold.ttf',
  'Inter|ExtraBold': '/Inter-ExtraBold.ttf',
  'Noto Naskh Arabic|Regular': '/NotoNaskhArabic-Regular.ttf'
}

export class FontManager {
  private loadedFamilies = new Map<string, ArrayBuffer>()
  private loadedFamilySources = new Map<string, FontLoadedSource>()
  private unavailableFaces = new Map<string, FontUnavailableReason>()
  private supplementalFamilyData = new Map<string, ArrayBuffer[]>()
  private remoteCoverage = new Map<string, Set<string>>()
  private instanceVariations = new WeakMap<ArrayBuffer, Map<string, FontVariation[] | null>>()
  private blockedNodeIds = new Set<string>()
  private fontProvider: TypefaceFontProvider | null = null
  private fontProviders = new Set<TypefaceFontProvider>()
  private providerCanvasKits = new WeakMap<TypefaceFontProvider, CanvasKit>()
  private registrationGeneration = 0
  private providerRegistrations = new WeakMap<TypefaceFontProvider, Map<string, Set<ArrayBuffer>>>()
  /** Bundled URL → shared bytes so style aliases (Bold/Black → Semibold) do not refetch. */
  private bundledBuffersByUrl = new Map<string, ArrayBuffer>()
  /** In-flight `family|style` loads — collapses concurrent callers to one fetch. */
  private inflightLocalLoads = new Map<string, Promise<ArrayBuffer | null>>()
  /** In-flight bundled URL fetches. */
  private inflightBundledByUrl = new Map<string, Promise<ArrayBuffer | null>>()
  /** Loaded PingFang slice ids per `family|style`. */
  private loadedPingFangSlices = new Map<string, Set<string>>()
  /** CanvasKit render-family names for loaded PingFang slices (`family|style`). */
  private pingFangRenderNames = new Map<string, string[]>()
  /** Slice buffers registered under distinct CanvasKit family names. */
  private pingFangSliceEntries = new Map<
    string,
    Array<{ renderName: string; buffer: ArrayBuffer; slice: PingFangSliceMeta }>
  >()
  /** Serialized PingFang slice loads per `family|style`. */
  private pingFangLoadChains = new Map<string, Promise<ArrayBuffer | null>>()
  private pingFangManifests = new Map<string, Promise<PingFangStyleManifest | null>>()
  private pingFangCoverageConfig: Promise<PingFangCoverageConfig | null> | null = null
  /** Resolved shared coverage config (sync lookups for unpackaged → network fallback). */
  private pingFangCoverageConfigValue: PingFangCoverageConfig | null = null
  /** Browser `FontFace` instances already added (`family|weight|slant|range`). */
  private browserFontFaces = new Map<string, FontFace>()
  /** Bumped on document unload so late async loads do not re-register stale bytes. */
  private unloadEpoch = 0
  private localFonts: FontInfo[] | null = null
  private localFontAccessState: LocalFontAccessState = IS_BROWSER ? 'prompt' : 'unsupported'
  private downloadedFontCache: DownloadedFontCache | null = null
  private fallbackUserAgent: string | undefined
  private hostFontLoader: HostFontLoader | null = null
  private webFonts = new WebFontResolver()
  private cjkFallbackFamilies: string[] = []
  private cjkFallbackPromise: Promise<string[]> | null = null
  private arabicFallbackFamilies: string[] = []
  private arabicFallbackPromise: Promise<string[]> | null = null

  /**
   * Drop fonts loaded for the previous document (PingFang slices, network CJK
   * fallbacks, remote faces). Keeps local-font discovery, bundled URL bytes, and
   * PingFang coverage config. Callers must recreate CanvasKit providers afterward
   * (e.g. `renderer.loadFonts()`).
   */
  unloadDocumentFonts(): void {
    this.unloadEpoch++
    this.loadedFamilies.clear()
    this.loadedFamilySources.clear()
    this.unavailableFaces.clear()
    this.supplementalFamilyData.clear()
    this.remoteCoverage.clear()
    this.blockedNodeIds.clear()
    this.inflightLocalLoads.clear()
    this.loadedPingFangSlices.clear()
    this.pingFangRenderNames.clear()
    this.pingFangSliceEntries.clear()
    this.pingFangLoadChains.clear()
    this.pingFangManifests.clear()
    // Keep small Inter / Noto bundled faces; drop PingFang slice URL caches.
    const keepBundled = new Set(Object.values(BUNDLED_FONTS))
    for (const url of [...this.bundledBuffersByUrl.keys()]) {
      if (!keepBundled.has(url)) this.bundledBuffersByUrl.delete(url)
    }
    for (const url of [...this.inflightBundledByUrl.keys()]) {
      if (!keepBundled.has(url)) this.inflightBundledByUrl.delete(url)
    }
    // Coverage config is shared metadata — keep for the next document.
    this.clearBrowserFontFaces()
    this.webFonts.clearDocumentFetches()
    this.providerRegistrations = new WeakMap()
    this.registrationGeneration++
  }

  private clearBrowserFontFaces(): void {
    if (IS_BROWSER && typeof document !== 'undefined') {
      for (const face of this.browserFontFaces.values()) {
        try {
          document.fonts.delete(face)
        } catch {
          // Ignore faces the browser already dropped.
        }
      }
    }
    this.browserFontFaces.clear()
  }

  private isCurrentUnloadEpoch(epoch: number): boolean {
    return epoch === this.unloadEpoch
  }

  attachProvider(canvasKit: CanvasKit, provider: TypefaceFontProvider): void {
    this.fontProviders.add(provider)
    this.providerCanvasKits.set(provider, canvasKit)
    this.fontProvider = provider
    this.providerRegistrations.set(provider, new Map())
    this.registrationGeneration++
    for (const [cacheKey, data] of this.loadedFamilies) {
      const separator = cacheKey.indexOf('|')
      const family = cacheKey.slice(0, separator)
      const pingFangEntries = this.pingFangSliceEntries.get(cacheKey)
      if (pingFangEntries && pingFangEntries.length > 0) {
        for (const entry of pingFangEntries) {
          this.registerFontInProvider(provider, entry.renderName, entry.buffer)
        }
        continue
      }
      this.registerFontInProvider(provider, family, data)
      for (const supplemental of this.supplementalFamilyData.get(cacheKey) ?? []) {
        this.registerFontInProvider(provider, family, supplemental)
      }
    }
  }

  detachProvider(provider?: TypefaceFontProvider | null): void {
    if (!provider) {
      this.fontProviders.clear()
      this.fontProvider = null
      this.providerRegistrations = new WeakMap()
      return
    }
    this.fontProviders.delete(provider)
    this.providerRegistrations.delete(provider)
    if (this.fontProvider === provider) {
      this.fontProvider = Array.from(this.fontProviders).at(-1) ?? null
    }
  }

  provider(): TypefaceFontProvider | null {
    return this.fontProvider
  }

  /** The latest attached provider made by `canvasKit`; another build's provider cannot shape with it. */
  providerFor(canvasKit: CanvasKit): TypefaceFontProvider | null {
    return (
      Array.from(this.fontProviders)
        .reverse()
        .find((provider) => this.providerCanvasKits.get(provider) === canvasKit) ?? null
    )
  }

  generation(): number {
    return this.registrationGeneration
  }

  blockNodesUntilFontsResolve(nodeIds: readonly string[]): void {
    for (const nodeId of nodeIds) this.blockedNodeIds.add(nodeId)
  }

  unblockNodes(nodeIds: readonly string[]): void {
    for (const nodeId of nodeIds) this.blockedNodeIds.delete(nodeId)
  }

  isNodeBlocked(nodeId: string): boolean {
    return this.blockedNodeIds.has(nodeId)
  }

  localAccessState(): LocalFontAccessState {
    return this.localFontAccessState
  }

  setDownloadedFontCache(cache: DownloadedFontCache | null): void {
    this.downloadedFontCache = cache
  }

  setFallbackUserAgent(userAgent: string | undefined): void {
    this.fallbackUserAgent = userAgent
  }

  setHostFontLoader(loader: HostFontLoader | null): void {
    this.hostFontLoader = loader
  }

  setOnlineFontProviders(settings: Partial<Record<WebFontProviderId, boolean>>): void {
    this.webFonts.setEnabled(settings)
  }

  setWebFontFetch(fetcher: WebFontFetch | null): void {
    this.webFonts.setRemoteFetch(fetcher)
  }

  resetWebFontFailures(family?: string, style?: string): void {
    this.webFonts.resetFailures(family, style)
  }

  enabledOnlineFontProviders(): WebFontProviderId[] {
    return this.webFonts.enabledProviders()
  }

  async loadCachedFont(
    family: string,
    style = 'Regular',
    characters = ''
  ): Promise<ArrayBuffer | null> {
    const cached = await this.readDownloadedFont(family, style, characters)
    if (!cached) return null
    const key = `${family}|${style}`
    const loadedCoverage = this.remoteCoverage.get(key) ?? new Set<string>()
    for (const character of normalizedCoverageText(characters)) loadedCoverage.add(character)
    this.remoteCoverage.set(key, loadedCoverage)
    return this.registerAndCache(family, style, cached, 'cache')
  }

  async requestLocalFontAccess(): Promise<FontInfo[]> {
    if (!IS_BROWSER || !window.queryLocalFonts) {
      this.localFontAccessState = 'unsupported'
      this.localFonts = []
      return []
    }
    try {
      const fonts = await window.queryLocalFonts()
      const seen = new Set<string>()
      const result: FontInfo[] = []
      for (const f of fonts) {
        const key = `${f.family}|${f.style}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({
          family: f.family,
          fullName: f.fullName,
          style: f.style,
          postscriptName: f.postscriptName
        })
      }
      this.localFonts = result
      this.localFontAccessState = 'granted'
      return result
    } catch {
      this.localFonts = []
      this.localFontAccessState = 'denied'
      return []
    }
  }

  async listFamilies(): Promise<string[]> {
    const options = await this.listFamilyOptions()
    return options.map((option) => option.family)
  }

  async listFamilyOptions(): Promise<FontFamilyOption[]> {
    const fonts = this.localFonts ?? (await this.requestLocalFontAccess())
    const webFontFamilies = await Promise.all(
      this.enabledOnlineFontProviders().map(async (provider) => ({
        provider,
        families: await this.webFonts.listFamilies(provider)
      }))
    )
    const byFamily = new Map<string, FontFamilyOption>()
    for (const key of Object.keys(BUNDLED_FONTS)) {
      const family = key.slice(0, key.indexOf('|'))
      if (!byFamily.has(family)) byFamily.set(family, { family, source: 'bundled' })
    }
    byFamily.set(PINGFANG_SC_FAMILY, { family: PINGFANG_SC_FAMILY, source: 'bundled' })
    for (const { provider, families } of webFontFamilies) {
      for (const family of families) {
        if (!byFamily.has(family)) byFamily.set(family, { family, source: provider })
      }
    }
    for (const font of fonts) byFamily.set(font.family, { family: font.family, source: 'local' })
    return [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family))
  }

  preloadWebFontFamilies(): void {
    this.webFonts.preloadFamilies()
  }

  async fetchBundledFont(url: string): Promise<ArrayBuffer | null> {
    if (IS_BROWSER) {
      const response = await fetch(url)
      return response.arrayBuffer()
    }
    const { readFile } = await import(/* @vite-ignore */ 'node:fs/promises')
    const { resolve, dirname } = await import(/* @vite-ignore */ 'node:path')
    const { fileURLToPath } = await import(/* @vite-ignore */ 'node:url')
    const packageJSONURL = import.meta.resolve('@open-pencil/core/package.json')
    const packageRoot = dirname(fileURLToPath(packageJSONURL))
    const assetPath = resolve(packageRoot, `assets${url}`)
    const buf = await readFile(assetPath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }

  async loadLocalFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
    const cacheKey = `${family}|${style}`
    const loaded = this.loadedFamilies.get(cacheKey)
    if (loaded) {
      this.ensureCanvasRegistration(family, style, loaded)
      return loaded
    }

    const inflight = this.inflightLocalLoads.get(cacheKey)
    if (inflight) return inflight

    const promise = this.loadLocalFontUncached(family, style).finally(() => {
      this.inflightLocalLoads.delete(cacheKey)
    })
    this.inflightLocalLoads.set(cacheKey, promise)
    return promise
  }

  private async loadLocalFontUncached(family: string, style: string): Promise<ArrayBuffer | null> {
    const epoch = this.unloadEpoch
    const cacheKey = `${family}|${style}`
    const loaded = this.loadedFamilies.get(cacheKey)
    if (loaded) {
      this.ensureCanvasRegistration(family, style, loaded)
      return loaded
    }

    // Slice mode: hot `common` shard only until `loadFont` supplies characters.
    if (usesPingFangSlices()) {
      const pingFang = await this.loadPingFangSlices(family, style, '')
      if (!this.isCurrentUnloadEpoch(epoch)) return null
      if (pingFang) return pingFang
    }

    // Bundled / public first (Inter, Noto Naskh). PingFang SC loads via `/pingfang-sc` slices.
    // Only the requested style is fetched — other weights stay unloaded until used.
    const bundled = await this.loadBundledFont(family, style, epoch)
    if (!this.isCurrentUnloadEpoch(epoch)) return null
    if (bundled) return bundled

    const hostBuffer = await this.loadHostFont(family, style)
    if (!this.isCurrentUnloadEpoch(epoch)) return null
    if (hostBuffer) return this.registerAndCache(family, style, hostBuffer, 'local', epoch)
    const localBuffer = await this.findLocalFont(family, style)
    if (!this.isCurrentUnloadEpoch(epoch)) return null
    if (localBuffer) return this.registerAndCache(family, style, localBuffer, 'local', epoch)
    return null
  }

  private ensureCanvasRegistration(family: string, style: string, loaded: ArrayBuffer): void {
    if (usesPingFangSlices() && isPingFangScFamily(family)) {
      const entries = this.pingFangSliceEntries.get(`${family}|${style}`)
      if (entries && entries.length > 0) {
        for (const entry of entries) {
          this.registerFontInCanvasKit(entry.renderName, entry.buffer)
        }
        return
      }
    }
    this.registerFontInCanvasKit(family, loaded)
  }

  private async loadBundledFont(
    family: string,
    style: string,
    epoch = this.unloadEpoch
  ): Promise<ArrayBuffer | null> {
    const bundledURL = BUNDLED_FONTS[`${family}|${style}`]
    if (!bundledURL) return null
    try {
      const buffer = await this.fetchBundledBuffer(bundledURL)
      if (!this.isCurrentUnloadEpoch(epoch)) return null
      return buffer && !isVariableFont(buffer)
        ? this.registerAndCache(family, style, buffer, 'bundled', epoch)
        : null
    } catch (e) {
      console.warn(`Bundled font load failed for "${family}" ${style}:`, e)
      return null
    }
  }

  /** Load pre-cut PingFang SC slices covering `characters` (always includes `common`). */
  private loadPingFangSlices(
    family: string,
    style: string,
    characters: string
  ): Promise<ArrayBuffer | null> {
    if (!usesPingFangSlices() || !isPingFangScFamily(family)) return Promise.resolve(null)
    const cacheKey = `${family}|${style}`
    const previous = this.pingFangLoadChains.get(cacheKey) ?? Promise.resolve(null)
    const next = previous
      .catch(() => null)
      .then(() => this.loadPingFangSlicesUncached(family, style, characters))
    this.pingFangLoadChains.set(cacheKey, next)
    return next
  }

  private async loadPingFangSlicesUncached(
    family: string,
    style: string,
    characters: string
  ): Promise<ArrayBuffer | null> {
    const epoch = this.unloadEpoch
    const cacheKey = `${family}|${style}`
    const manifest = await this.loadPingFangManifest(style)
    if (!this.isCurrentUnloadEpoch(epoch) || !manifest) return null

    const needed = selectPingFangSliceIds(manifest, characters)
    const loadedIds = this.loadedPingFangSlices.get(cacheKey) ?? new Set<string>()
    const missing = needed.filter((id) => !loadedIds.has(id))
    if (missing.length === 0) {
      return this.loadedFamilies.get(cacheKey) ?? null
    }

    for (const sliceId of missing) {
      const slice = manifest.slices.find((entry) => entry.id === sliceId)
      if (!slice) continue
      try {
        const buffer = await this.fetchBundledBuffer(pingFangSliceUrl(manifest.style, slice.file))
        if (!this.isCurrentUnloadEpoch(epoch)) return null
        if (!buffer || isVariableFont(buffer)) continue
        this.registerPingFangSlice(family, style, slice, buffer, epoch)
        loadedIds.add(sliceId)
      } catch (e) {
        console.warn(`PingFang slice load failed for "${family}" ${style} ${sliceId}:`, e)
      }
    }
    if (!this.isCurrentUnloadEpoch(epoch)) return null
    this.loadedPingFangSlices.set(cacheKey, loadedIds)
    return this.loadedFamilies.get(cacheKey) ?? null
  }

  /**
   * CanvasKit: unique family per slice (listed in paragraph `fontFamilies`).
   * DOM: same logical family with per-slice `unicode-range`.
   */
  private registerPingFangSlice(
    family: string,
    style: string,
    slice: PingFangSliceMeta,
    buffer: ArrayBuffer,
    epoch = this.unloadEpoch
  ): void {
    if (!this.isCurrentUnloadEpoch(epoch)) return
    const cacheKey = `${family}|${style}`
    const renderName = pingFangSliceRenderFamily(style, slice.id)
    const entries = this.pingFangSliceEntries.get(cacheKey) ?? []
    if (entries.some((entry) => entry.renderName === renderName)) return

    entries.push({ renderName, buffer, slice })
    this.pingFangSliceEntries.set(cacheKey, entries)

    const renderNames = this.pingFangRenderNames.get(cacheKey) ?? []
    renderNames.push(renderName)
    this.pingFangRenderNames.set(cacheKey, renderNames)

    if (!this.loadedFamilies.has(cacheKey)) {
      this.loadedFamilies.set(cacheKey, buffer)
      this.loadedFamilySources.set(cacheKey, 'bundled')
    }

    const sliceCoverage = coverageFromPingFangRanges(slice.ranges)
    const merged = this.remoteCoverage.get(cacheKey) ?? new Set<string>()
    for (const character of sliceCoverage) merged.add(character)
    // Per-slice unicode-range for the DOM FontFace, then restore cumulative coverage.
    this.remoteCoverage.set(cacheKey, sliceCoverage)
    this.registerFontInCanvasKit(renderName, buffer)
    this.registerFontInBrowser(family, style, buffer)
    this.remoteCoverage.set(cacheKey, merged)
  }

  private async loadPingFangCoverageConfig(): Promise<PingFangCoverageConfig | null> {
    if (!this.pingFangCoverageConfig) {
      this.pingFangCoverageConfig = this.fetchPingFangCoverageConfig()
    }
    return this.pingFangCoverageConfig
  }

  private async fetchPingFangCoverageConfig(): Promise<PingFangCoverageConfig | null> {
    try {
      const buffer = await this.fetchBundledBuffer(pingFangConfigUrl())
      if (!buffer) return null
      const text = new TextDecoder().decode(buffer)
      const config = parsePingFangCoverageConfig(JSON.parse(text) as unknown)
      this.pingFangCoverageConfigValue = config
      return config
    } catch (e) {
      console.warn('PingFang coverage config load failed:', e)
      return null
    }
  }

  /** True when a packaged PingFang shard claims this code point (`common` only now). */
  private pingFangCodePointIsPackaged(codePoint: number): boolean {
    const config = this.pingFangCoverageConfigValue
    if (!config) return true
    return pingFangSliceIdForCodePoint(config, codePoint) !== null
  }

  private async loadPingFangManifest(style: string): Promise<PingFangStyleManifest | null> {
    const preferred = resolvePingFangSliceStyle(style)
    const candidates = preferred === 'Regular' ? ['Regular'] : [preferred, 'Regular']
    const config = await this.loadPingFangCoverageConfig()
    for (const candidate of candidates) {
      let pending = this.pingFangManifests.get(candidate)
      if (!pending) {
        pending = this.fetchPingFangManifest(candidate)
        this.pingFangManifests.set(candidate, pending)
      }
      const manifest = await pending
      if (!manifest) continue
      // Shared config owns unicode ranges; per-style manifest owns file sizes.
      return config ? hydratePingFangStyleManifest(manifest, config) : manifest
    }
    return null
  }

  private async fetchPingFangManifest(style: string): Promise<PingFangStyleManifest | null> {
    try {
      const buffer = await this.fetchBundledBuffer(pingFangManifestUrl(style))
      if (!buffer) return null
      const text = new TextDecoder().decode(buffer)
      return parsePingFangStyleManifest(JSON.parse(text) as unknown)
    } catch (e) {
      console.warn(`PingFang manifest load failed for ${style}:`, e)
      return null
    }
  }

  /** One fetch per packaged URL; style aliases share the same ArrayBuffer. */
  private async fetchBundledBuffer(url: string): Promise<ArrayBuffer | null> {
    const cached = this.bundledBuffersByUrl.get(url)
    if (cached) return cached

    const inflight = this.inflightBundledByUrl.get(url)
    if (inflight) return inflight

    const promise = this.fetchBundledFont(url)
      .then((buffer) => {
        if (buffer) this.bundledBuffersByUrl.set(url, buffer)
        return buffer
      })
      .finally(() => {
        this.inflightBundledByUrl.delete(url)
      })
    this.inflightBundledByUrl.set(url, promise)
    return promise
  }

  async loadRemoteFont(
    family: string,
    style = 'Regular',
    characters = '',
    signal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    signal?.throwIfAborted()
    const epoch = this.unloadEpoch
    if (usesPingFangSlices() && isPingFangScFamily(family)) {
      return this.loadPingFangSlices(family, style, characters)
    }
    if (typeof fetch === 'undefined') return null
    const coverage = this.remoteCoverage.get(`${family}|${style}`)
    if (
      characters &&
      coverage &&
      Array.from(characters).every((character) => coverage.has(character))
    ) {
      return this.loadedData(family, style)
    }
    try {
      const requestedCharacters = normalizedCoverageText(
        `${coverage ? Array.from(coverage).join('') : ''}${characters}`
      )
      const normalized = normalizeFontFamily(family)
      const families = normalized === family ? [family] : [family, normalized]
      const resolved = await this.webFonts.fetchFont(families, style, requestedCharacters, signal)
      if (!this.isCurrentUnloadEpoch(epoch)) return null
      if (!resolved || resolved.buffers.length === 0) return null
      const primary = resolved.buffers[0]
      await this.writeDownloadedFont(family, style, primary, requestedCharacters)
      if (!this.isCurrentUnloadEpoch(epoch)) return null
      const loadedCoverage = this.remoteCoverage.get(`${family}|${style}`) ?? new Set<string>()
      for (const character of requestedCharacters) loadedCoverage.add(character)
      // Coverage before register so DOM FontFace can set unicode-range.
      this.remoteCoverage.set(`${family}|${style}`, loadedCoverage)
      const registered = this.registerAndCache(family, style, primary, resolved.provider, epoch)
      for (const supplemental of resolved.buffers.slice(1)) {
        this.registerSupplemental(family, style, supplemental, epoch)
      }
      return registered
    } catch (e) {
      if (signal?.aborted) throw e
      console.warn(`Web font fetch failed for "${family}" ${style}:`, e)
      return null
    }
  }

  async loadFont(
    family: string,
    style = 'Regular',
    characters = '',
    signal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    signal?.throwIfAborted()
    const epoch = this.unloadEpoch
    if (usesPingFangSlices() && isPingFangScFamily(family)) {
      const sliced = await this.loadPingFangSlices(family, style, characters)
      if (!this.isCurrentUnloadEpoch(epoch)) return null
      if (sliced) return sliced
    }

    const loaded = this.loadedData(family, style)
    if (loaded) {
      this.ensureCanvasRegistration(family, style, loaded)
      const remoteCoverage = this.remoteCoverage.get(`${family}|${style}`)
      const missingRemoteCoverage = Boolean(
        characters &&
        remoteCoverage &&
        Array.from(characters).some((character) => !remoteCoverage.has(character))
      )
      if (!missingRemoteCoverage) return loaded
      const remote = await this.loadRemoteFont(family, style, characters, signal)
      if (!this.isCurrentUnloadEpoch(epoch)) return null
      return remote ?? loaded
    }

    const local = await this.loadLocalFont(family, style)
    if (!this.isCurrentUnloadEpoch(epoch)) return null
    if (local) return local
    const cached = await this.loadCachedFont(family, style, characters)
    if (!this.isCurrentUnloadEpoch(epoch)) return null
    if (cached) return cached
    return this.loadRemoteFont(family, style, characters, signal)
  }

  async ensureNodeFont(family: string, weight: number): Promise<void> {
    await this.loadFont(family, weightToStyle(weight))
  }

  markLoaded(
    family: string,
    style: string,
    data: ArrayBuffer,
    source: FontLoadedSource = 'registered'
  ): void {
    this.registerAndCache(family, style, data, source)
  }

  loadedFontSource(family: string, style: string): FontLoadedSource | null {
    return this.loadedFamilySources.get(`${family}|${style}`) ?? null
  }

  /** Why the host could not load an installed face, when it reported a reason. */
  unavailableReason(family: string, style: string): FontUnavailableReason | null {
    return this.unavailableFaces.get(`${family}|${style}`) ?? null
  }

  isLoaded(family: string): boolean {
    return [...this.loadedFamilies.keys()].some((k) => k.startsWith(`${family}|`))
  }

  isStyleLoaded(family: string, style: string): boolean {
    return this.loadedFamilies.has(`${family}|${style}`)
  }

  remoteStyleNeedsCoverage(family: string, style: string, characters: readonly string[]): boolean {
    if (usesPingFangSlices() && isPingFangScFamily(family)) {
      return this.styleNeedsMoreCoverage(family, style, characters.join(''))
    }
    const coverage = this.remoteCoverage.get(`${family}|${style}`)
    return !!coverage && characters.some((character) => !coverage.has(character))
  }

  /**
   * True when a face is loaded but still missing packaged shard coverage for `characters`.
   * Code points outside `common` are not demanded from PingFang — they use network CJK
   * `text=` fallbacks after `.notdef` observation.
   */
  styleNeedsMoreCoverage(family: string, style: string, characters: string): boolean {
    if (!characters || !this.isStyleLoaded(family, style)) return false
    if (usesPingFangSlices() && isPingFangScFamily(family)) {
      const coverage = this.remoteCoverage.get(`${family}|${style}`)
      if (!coverage || coverage.size === 0) return true
      return Array.from(characters).some((character) => {
        const codePoint = character.codePointAt(0)
        if (codePoint === undefined) return false
        if (!this.pingFangCodePointIsPackaged(codePoint)) return false
        return !coverage.has(character)
      })
    }
    return false
  }

  loadedData(family: string, style: string): ArrayBuffer | null {
    return this.loadedFamilies.get(`${family}|${style}`) ?? null
  }

  /** Axis coordinates for `style` when the loaded face is a variable font, otherwise `null`. */
  namedInstanceVariations(family: string, style: string): FontVariation[] | null {
    const data = this.loadedData(family, style)
    if (!data) return null
    let byStyle = this.instanceVariations.get(data)
    if (!byStyle) {
      byStyle = new Map()
      this.instanceVariations.set(data, byStyle)
    }
    if (!byStyle.has(style)) byStyle.set(style, namedInstanceVariations(data, style))
    return byStyle.get(style) ?? null
  }

  renderFamily(family: string, style: string): string {
    const shards = this.renderFamilyShards(family, style)
    return shards[0] ?? family
  }

  /** Extra CanvasKit family names for pre-cut PingFang slices (same logical UI family). */
  renderFamilyShards(family: string, style: string): string[] {
    if (!usesPingFangSlices()) return []
    return this.pingFangRenderNames.get(`${family}|${style}`) ?? []
  }

  /** Hot shard render name (`common`, or legacy `base`). */
  private pingFangHotRenderName(family: string, style: string): string | null {
    const entries = this.pingFangSliceEntries.get(`${family}|${style}`) ?? []
    return (
      entries.find((entry) => entry.slice.id === 'common')?.renderName ??
      entries.find((entry) => entry.slice.id === 'base')?.renderName ??
      null
    )
  }

  /**
   * Shards for a homogeneous `text` span in Paragraph `fontFamilies`: the covering
   * shard, then the hot `common` shard as fallback. Skia treats glyph 0 as present,
   * so listing both covering Han shards in one style still sticks on `.notdef`.
   */
  renderFamilyShardsForText(family: string, style: string, text: string): string[] {
    if (!usesPingFangSlices() || !isPingFangScFamily(family)) return []
    const entries = this.pingFangSliceEntries.get(`${family}|${style}`) ?? []
    if (entries.length === 0) return []

    const hot = this.pingFangHotRenderName(family, style)
    let covering: string | null = null
    for (const character of text) {
      const codePoint = character.codePointAt(0)
      if (codePoint === undefined) continue
      const match = entries.find((entry) => codePointInRanges(codePoint, entry.slice.ranges))
      if (!match) continue
      if (covering === null) covering = match.renderName
      else if (covering !== match.renderName) {
        // Mixed coverage — caller should split via `pingFangSliceRuns`.
        break
      }
    }
    if (covering && hot && covering !== hot) return [covering, hot]
    if (covering) return [covering]
    return hot ? [hot] : []
  }

  /**
   * Contiguous UTF-16 spans that share one covering PingFang shard.
   * Use one Paragraph style per span so Skia never sees a prior shard's `.notdef`.
   */
  pingFangSliceRuns(
    family: string,
    style: string,
    text: string
  ): Array<{ start: number; length: number }> {
    if (!text || !usesPingFangSlices() || !isPingFangScFamily(family)) {
      return text ? [{ start: 0, length: text.length }] : []
    }
    const entries = this.pingFangSliceEntries.get(`${family}|${style}`) ?? []
    if (entries.length === 0) return [{ start: 0, length: text.length }]

    const coveringName = (codePoint: number): string => {
      for (const entry of entries) {
        if (codePointInRanges(codePoint, entry.slice.ranges)) return entry.renderName
      }
      return ''
    }

    const runs: Array<{ start: number; length: number }> = []
    let utf16 = 0
    let runStart = 0
    let runKey: string | null = null
    for (const character of text) {
      const codePoint = character.codePointAt(0)
      const key = codePoint === undefined ? '' : coveringName(codePoint)
      if (runKey === null) runKey = key
      else if (key !== runKey) {
        runs.push({ start: runStart, length: utf16 - runStart })
        runStart = utf16
        runKey = key
      }
      utf16 += character.length
    }
    if (runKey !== null) runs.push({ start: runStart, length: utf16 - runStart })
    return runs
  }

  collectFontKeys(graph: SceneGraph, nodeIds: string[]): Array<[string, string]> {
    return collectGraphFontKeys(graph, nodeIds)
  }

  async ensureCJKFallback(): Promise<string[]> {
    if (this.cjkFallbackFamilies.length > 0) return this.cjkFallbackFamilies
    if (this.cjkFallbackPromise) return this.cjkFallbackPromise

    this.cjkFallbackPromise = this.ensureFallbackFamilies('cjk', this.cjkFallbackFamilies, {
      allowVariableLocalFonts: true
    })
    return this.cjkFallbackPromise
  }

  getCJKFallbackFamilies(): string[] {
    return this.cjkFallbackFamilies
  }

  setCJKFallbackFamily(family: string): void {
    if (!this.cjkFallbackFamilies.includes(family)) {
      this.cjkFallbackFamilies.push(family)
    }
  }

  async ensureArabicFallback(): Promise<string[]> {
    if (this.arabicFallbackFamilies.length > 0) return this.arabicFallbackFamilies
    if (this.arabicFallbackPromise) return this.arabicFallbackPromise

    this.arabicFallbackPromise = this.ensureFallbackFamilies('arabic', this.arabicFallbackFamilies)
    return this.arabicFallbackPromise
  }

  async ensureFallbackPack(
    scripts: FontFallbackScript[] = ['cjk', 'arabic'],
    characters = '',
    signal?: AbortSignal
  ): Promise<Partial<Record<FontFallbackScript, string[]>>> {
    signal?.throwIfAborted()
    const result: Partial<Record<FontFallbackScript, string[]>> = {}
    await Promise.all(
      scripts.map(async (script) => {
        signal?.throwIfAborted()
        const target = script === 'arabic' ? this.arabicFallbackFamilies : this.cjkFallbackFamilies
        if (signal) {
          result[script] = await this.ensureFallbackFamilies(
            script,
            target,
            { allowVariableLocalFonts: script === 'cjk' },
            characters,
            signal
          )
        } else if (script === 'arabic' && !characters) {
          result[script] = await this.ensureArabicFallback()
        } else if (script === 'cjk' && !characters) {
          result[script] = await this.ensureCJKFallback()
        } else {
          result[script] = await this.ensureFallbackFamilies(script, target, {}, characters)
        }
      })
    )
    signal?.throwIfAborted()
    return result
  }

  getArabicFallbackFamilies(): string[] {
    return this.arabicFallbackFamilies
  }

  setArabicFallbackFamily(family: string): void {
    if (!this.arabicFallbackFamilies.includes(family)) {
      this.arabicFallbackFamilies.push(family)
    }
  }

  private async ensureFallbackFamilies(
    script: FontFallbackScript,
    targetFamilies: string[],
    options: { allowVariableLocalFonts?: boolean } = {},
    characters = '',
    signal?: AbortSignal
  ): Promise<string[]> {
    signal?.throwIfAborted()
    const manifest = fontFallbackEntry(script, this.fallbackUserAgent)
    const coverage = normalizedCoverageText(characters)

    for (const family of manifest.localFamilies) {
      signal?.throwIfAborted()
      const buffer =
        (await this.loadHostFont(family, 'Regular')) ??
        (await this.findLocalFont(family, undefined, {
          allowVariable: options.allowVariableLocalFonts
        }))
      if (
        buffer &&
        this.registerAndCache(family, 'Regular', buffer, 'fallback') &&
        !targetFamilies.includes(family)
      ) {
        targetFamilies.push(family)
      }
    }

    // Remote CJK/Arabic only via Google `text=` glyph subsets — never pull a full face.
    if (!coverage) return targetFamilies

    const results = await Promise.allSettled(
      manifest.remoteFamilies.map(async (family) => {
        signal?.throwIfAborted()
        const data = await this.loadRemoteFont(family, 'Regular', coverage, signal)
        signal?.throwIfAborted()
        return data ? family : null
      })
    )
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && !targetFamilies.includes(result.value)) {
        targetFamilies.push(result.value)
      }
    }

    return targetFamilies
  }

  private async loadHostFont(family: string, style: string): Promise<ArrayBuffer | null> {
    if (!this.hostFontLoader) return null
    const key = `${family}|${style}`
    try {
      const data = await this.hostFontLoader(family, style)
      if (data) this.unavailableFaces.delete(key)
      return data
    } catch (e) {
      if (e instanceof UnsupportedFontFormatError) {
        this.unavailableFaces.set(key, e.reason)
        return null
      }
      console.warn(`Host fallback font load failed for "${family}" ${style}:`, e)
      return null
    }
  }

  private async readDownloadedFont(
    family: string,
    style: string,
    characters = ''
  ): Promise<ArrayBuffer | null> {
    if (!this.downloadedFontCache) return null
    try {
      return await this.downloadedFontCache.read(family, style, characters)
    } catch (e) {
      console.warn(`Downloaded font cache read failed for "${family}" ${style}:`, e)
      return null
    }
  }

  private async writeDownloadedFont(
    family: string,
    style: string,
    data: ArrayBuffer,
    characters = ''
  ): Promise<void> {
    if (!this.downloadedFontCache) return
    try {
      await this.downloadedFontCache.write(family, style, data, characters)
    } catch (e) {
      console.warn(`Downloaded font cache write failed for "${family}" ${style}:`, e)
    }
  }

  private async findLocalFont(
    family: string,
    style?: string,
    options: FindLocalFontOptions = {}
  ): Promise<ArrayBuffer | null> {
    if (!IS_BROWSER || !window.queryLocalFonts) return null
    if (this.localFontAccessState !== 'granted') return null
    try {
      const fonts = await window.queryLocalFonts()
      const match = chooseLocalFontMatch(fonts, family, style)
      if (!match) return null
      const blob: Blob = await match.blob()
      const buffer = await blob.arrayBuffer()
      if (!options.allowVariable && isVariableFont(buffer)) return null
      return buffer
    } catch (e) {
      console.warn(`Local font access failed for "${family}" ${style ?? ''}:`, e)
      return null
    }
  }

  private registerSupplemental(
    family: string,
    style: string,
    buffer: ArrayBuffer,
    epoch = this.unloadEpoch
  ): void {
    if (!this.isCurrentUnloadEpoch(epoch)) return
    const key = `${family}|${style}`
    const supplemental = this.supplementalFamilyData.get(key) ?? []
    if (supplemental.includes(buffer)) return
    supplemental.push(buffer)
    this.supplementalFamilyData.set(key, supplemental)
    this.registerFontInCanvasKit(family, buffer)
    this.registerFontInBrowser(family, style, buffer)
  }

  private registerAndCache(
    family: string,
    style: string,
    buffer: ArrayBuffer,
    source?: FontLoadedSource,
    epoch = this.unloadEpoch
  ): ArrayBuffer | null {
    if (!this.isCurrentUnloadEpoch(epoch)) return null
    const key = `${family}|${style}`
    const existing = this.loadedFamilies.get(key)
    if (existing === buffer) {
      if (source) this.loadedFamilySources.set(key, source)
      this.registerFontInCanvasKit(family, buffer)
      return buffer
    }
    if (existing) this.registerSupplemental(family, style, existing, epoch)
    this.loadedFamilies.set(key, buffer)
    if (source) this.loadedFamilySources.set(key, source)
    this.registerFontInCanvasKit(family, buffer)
    this.registerFontInBrowser(family, style, buffer)
    return buffer
  }

  private registerFontInCanvasKit(family: string, data: ArrayBuffer): boolean {
    let registered = false
    for (const provider of this.fontProviders) {
      registered = this.registerFontInProvider(provider, family, data) || registered
    }
    return registered
  }

  private registerFontInProvider(
    provider: TypefaceFontProvider,
    family: string,
    data: ArrayBuffer
  ): boolean {
    if (data.byteLength < 4) return false
    const registrations = this.providerRegistrations.get(provider) ?? new Map()
    const registeredData = registrations.get(family)
    if (registeredData?.has(data)) return true
    try {
      provider.registerFont(data, family)
      const familyRegistrations = registeredData ?? new Set<ArrayBuffer>()
      familyRegistrations.add(data)
      registrations.set(family, familyRegistrations)
      this.providerRegistrations.set(provider, registrations)
      this.registrationGeneration++
      return true
    } catch {
      return false
    }
  }

  private registerFontInBrowser(family: string, style: string, data: ArrayBuffer) {
    if (!IS_BROWSER) return
    const weight = styleToWeight(style)
    const italic = style.toLowerCase().includes('italic') ? 'italic' : 'normal'
    const coverage = this.remoteCoverage.get(`${family}|${style}`)
    const unicodeRange =
      coverage && coverage.size > 0 ? charactersToUnicodeRange(coverage) : undefined
    const faceKey = `${family}|${weight}|${italic}|${unicodeRange ?? '*'}`
    if (this.browserFontFaces.has(faceKey)) return
    const face = new FontFace(family, data, {
      weight: String(weight),
      style: italic,
      ...(unicodeRange ? { unicodeRange } : {})
    })
    this.browserFontFaces.set(faceKey, face)
    face
      .load()
      .then(() => document.fonts.add(face))
      .catch(() => {
        this.browserFontFaces.delete(faceKey)
        console.warn(`Failed to load font "${family}" (${style})`)
      })
  }
}

export const fontManager = new FontManager()
