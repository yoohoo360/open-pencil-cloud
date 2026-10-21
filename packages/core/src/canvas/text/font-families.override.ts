import { uniq } from 'es-toolkit/array'

import { ResourceCache } from '#core/cache/resource'
import { DEFAULT_FONT_FAMILY } from '#core/constants'
import { fontManager } from '#core/text/fonts.override'
import { isPingFangScFamily, usesPingFangSlices } from '#core/text/pingfang-slices'

const familiesCache = new ResourceCache<string, string[]>({ maxEntries: 256 })

export function resolveParagraphFontFamilies(
  primary: string,
  style: string,
  arabicFallbacks: readonly string[] = fontManager.getArabicFallbackFamilies(),
  cjkFallbacks: readonly string[] = fontManager.getCJKFallbackFamilies(),
  /**
   * Characters for this Paragraph style span only (one covering shard).
   * Mixed-coverage strings must be split with `pingFangSliceRuns` first.
   */
  characters = ''
): string[] {
  const shards =
    usesPingFangSlices() && isPingFangScFamily(primary)
      ? fontManager.renderFamilyShardsForText(primary, style, characters)
      : []
  const renderPrimary = shards[0] ?? fontManager.renderFamily(primary, style)
  const renderArabicFallbacks = arabicFallbacks.map((family) =>
    fontManager.renderFamily(family, 'Regular')
  )
  const renderCJKFallbacks = cjkFallbacks.map((family) =>
    fontManager.renderFamily(family, 'Regular')
  )
  const key = `${shards.join('\0') || renderPrimary}\0${renderArabicFallbacks.join('\0')}\0${renderCJKFallbacks.join('\0')}`
  const cached = familiesCache.peek(key)
  if (cached) return cached
  const families = shards.length > 0 ? [...shards] : [renderPrimary]
  if (primary !== DEFAULT_FONT_FAMILY) families.push(DEFAULT_FONT_FAMILY)
  families.push(...renderArabicFallbacks, ...renderCJKFallbacks)
  const resolved = uniq(families)
  familiesCache.set(key, resolved)
  return resolved
}
