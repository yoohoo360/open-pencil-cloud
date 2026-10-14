import { colorToHex8, tryParseColor } from '@open-pencil/scene-graph/color'
import type { Theme as TwirlTheme } from 'twirlwind'

/** Nested `theme.extend` maps from a classic Tailwind config JSON. */
export interface TailwindConfigExtend {
  /** Plural Tailwind key (`theme.extend.colors`). */
  colors?: unknown
  /**
   * Singular `color` maps used by some project configs
   * (`theme.extend.color.primary` → token `color-primary`).
   */
  color?: unknown
  spacing?: unknown
  margin?: unknown
  padding?: unknown
  fontSize?: unknown
  lineHeight?: unknown
  borderRadius?: unknown
}

/**
 * Classic Tailwind config shape as stored in Settings
 * (`module.exports` / `theme` / `theme.extend` JSON).
 */
export interface TailwindConfigLike {
  theme?: {
    extend?: TailwindConfigExtend
    colors?: unknown
    color?: unknown
    spacing?: unknown
    margin?: unknown
    padding?: unknown
    fontSize?: unknown
    lineHeight?: unknown
    borderRadius?: unknown
  }
  extend?: TailwindConfigExtend
  colors?: unknown
  color?: unknown
  spacing?: unknown
  margin?: unknown
  padding?: unknown
  fontSize?: unknown
  lineHeight?: unknown
  borderRadius?: unknown
}

/** Flattened token maps used when matching design styles to utility classes. */
export interface TailwindTokenMaps {
  colors: Record<string, string>
  spacing: Record<string, string>
  margin: Record<string, string>
  padding: Record<string, string>
  fontSize: Record<string, string>
  lineHeight: Record<string, string>
  borderRadius: Record<string, string>
}

/** Options for matching exported classes to whatever configs Settings provides. */
export type TailwindConfigOptions = {
  /**
   * Project Tailwind configs from Settings (shape is not fixed).
   * Array order is priority: index 0 wins; built-in defaults are last.
   */
  configs?: readonly TailwindConfigLike[] | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function emptyTokenMaps(): TailwindTokenMaps {
  return {
    colors: {},
    spacing: {},
    margin: {},
    padding: {},
    fontSize: {},
    lineHeight: {},
    borderRadius: {}
  }
}

/**
 * Merge token maps across config files.
 * Earlier files win entirely for a color/spacing value — later files only fill gaps.
 */
export function mergeTailwindTokenMaps(mapsList: readonly TailwindTokenMaps[]): TailwindTokenMaps {
  const merged = emptyTokenMaps()
  const claimedColorValues = new Set<string>()
  const claimedPx: Record<
    'spacing' | 'margin' | 'padding' | 'fontSize' | 'lineHeight' | 'borderRadius',
    Set<number>
  > = {
    spacing: new Set(),
    margin: new Set(),
    padding: new Set(),
    fontSize: new Set(),
    lineHeight: new Set(),
    borderRadius: new Set()
  }
  for (const maps of mapsList) {
    // Keep every alias from the first file that defines a color value; later files skip it.
    const aliasesByColor = new Map<string, Array<{ token: string; value: string }>>()
    for (const [token, value] of Object.entries(maps.colors)) {
      if (token in merged.colors) continue
      const colorKey = normalizeColorKey(value)
      if (!colorKey) continue
      const aliases = aliasesByColor.get(colorKey) ?? []
      aliases.push({ token, value })
      aliasesByColor.set(colorKey, aliases)
    }
    for (const [colorKey, aliases] of aliasesByColor) {
      if (claimedColorValues.has(colorKey)) continue
      claimedColorValues.add(colorKey)
      for (const alias of aliases) merged.colors[alias.token] = alias.value
    }
    for (const key of Object.keys(claimedPx) as (keyof typeof claimedPx)[]) {
      for (const [token, value] of Object.entries(maps[key])) {
        if (token in merged[key]) continue
        const px = parsePx(value)
        if (px !== null && claimedPx[key].has(px)) continue
        merged[key][token] = value
        if (px !== null) claimedPx[key].add(px)
      }
    }
  }
  return merged
}

function isColorString(value: string): boolean {
  const trimmed = value.trim().toLowerCase()
  return (
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb(') ||
    trimmed.startsWith('rgba(') ||
    trimmed.startsWith('hsl(') ||
    trimmed.startsWith('hsla(') ||
    trimmed.startsWith('oklch(') ||
    trimmed.startsWith('color(') ||
    trimmed === 'transparent' ||
    trimmed === 'currentcolor'
  )
}

function flattenStringLeaves(
  value: unknown,
  prefix = '',
  accept: (leaf: string) => boolean = () => true
): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed && accept(trimmed) && prefix) out[prefix] = trimmed
    return out
  }
  if (Array.isArray(value)) {
    const first = value[0]
    if (typeof first === 'string') {
      const trimmed = first.trim()
      if (trimmed && accept(trimmed) && prefix) out[prefix] = trimmed
    }
    return out
  }
  if (!isRecord(value)) return out
  for (const [key, child] of Object.entries(value)) {
    if (!key) continue
    const next = prefix ? `${prefix}-${key}` : key
    Object.assign(out, flattenStringLeaves(child, next, accept))
  }
  return out
}

function flattenTokenMap(value: unknown): Record<string, string> {
  return flattenStringLeaves(value, '', () => true)
}

function flattenColorMap(value: unknown): Record<string, string> {
  const raw = flattenStringLeaves(value, '', isColorString)
  const out: Record<string, string> = {}
  for (const [token, color] of Object.entries(raw)) {
    out[token] = canonicalizeColorValue(color)
  }
  return out
}

function mergeColorSources(...values: unknown[]): unknown {
  const records = values.filter(isRecord)
  if (records.length === 0) return undefined
  if (records.length === 1) return records[0]
  return Object.assign({}, ...records)
}

/**
 * Resolve the colors tree for matching.
 * `theme.extend.color.primary` is wrapped so it flattens to token `color-primary`.
 */
function resolveColorsTree(sources: { colors?: unknown; color?: unknown }): unknown {
  const singular =
    sources.color === undefined
      ? undefined
      : isRecord(sources.color)
        ? { color: sources.color }
        : undefined
  return mergeColorSources(singular, sources.colors)
}

function readExtend(config: TailwindConfigLike | null | undefined): TailwindConfigExtend {
  if (!config) return {}
  if (isRecord(config.theme)) {
    const theme = config.theme
    if (isRecord(theme.extend)) {
      const extend = theme.extend
      return {
        colors: resolveColorsTree({
          colors: extend.colors ?? theme.colors,
          color: extend.color ?? theme.color
        }),
        spacing: extend.spacing ?? theme.spacing,
        margin: extend.margin ?? theme.margin,
        padding: extend.padding ?? theme.padding,
        fontSize: extend.fontSize ?? theme.fontSize,
        lineHeight: extend.lineHeight ?? theme.lineHeight,
        borderRadius: extend.borderRadius ?? theme.borderRadius
      }
    }
    return {
      colors: resolveColorsTree({ colors: theme.colors, color: theme.color }),
      spacing: theme.spacing,
      margin: theme.margin,
      padding: theme.padding,
      fontSize: theme.fontSize,
      lineHeight: theme.lineHeight,
      borderRadius: theme.borderRadius
    }
  }
  if (isRecord(config.extend)) {
    const extend = config.extend
    return {
      ...extend,
      colors: resolveColorsTree({ colors: extend.colors, color: extend.color })
    }
  }
  return {
    colors: resolveColorsTree({ colors: config.colors, color: config.color }),
    spacing: config.spacing,
    margin: config.margin,
    padding: config.padding,
    fontSize: config.fontSize,
    lineHeight: config.lineHeight,
    borderRadius: config.borderRadius
  }
}

/** Flatten a classic Tailwind config into token maps for class matching. */
export function flattenTailwindConfig(
  config: TailwindConfigLike | null | undefined
): TailwindTokenMaps {
  const extend = readExtend(config)
  return {
    colors: flattenColorMap(extend.colors),
    spacing: pickPreferredSizeTokens(flattenTokenMap(extend.spacing)),
    margin: pickPreferredSizeTokens(flattenTokenMap(extend.margin)),
    padding: pickPreferredSizeTokens(flattenTokenMap(extend.padding)),
    fontSize: pickPreferredSizeTokens(flattenTokenMap(extend.fontSize)),
    lineHeight: pickPreferredSizeTokens(flattenTokenMap(extend.lineHeight)),
    borderRadius: pickPreferredSizeTokens(flattenTokenMap(extend.borderRadius))
  }
}

/** Resolve token maps from Settings configs (earlier entries win). */
export function resolveTailwindTokenMaps(
  options?: TailwindConfigOptions | null
): TailwindTokenMaps {
  const configs =
    options?.configs?.filter((item): item is TailwindConfigLike => Boolean(item)) ?? []
  return mergeTailwindTokenMaps(configs.map((config) => flattenTailwindConfig(config)))
}

export function toTwirlTheme(
  maps: TailwindTokenMaps,
  themeVariables: readonly string[] = []
): TwirlTheme {
  return {
    colors: { ...maps.colors },
    spacing: maps.spacing,
    variables: themeVariables
  }
}

function parsePx(value: string): number | null {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.endsWith('px')) {
    const n = Number(trimmed.slice(0, -2))
    return Number.isFinite(n) ? n : null
  }
  if (trimmed.endsWith('rem')) {
    const n = Number(trimmed.slice(0, -3))
    return Number.isFinite(n) ? n * 16 : null
  }
  return null
}

/**
 * Canonicalize a CSS color for equality: both `#1890FF` and `rgba(24,144,255,1)`
 * become `#1890ff`; translucent colors keep alpha as 8-digit hex (`#1890ff80`).
 */
export function normalizeColorKey(value: string): string {
  const trimmed = value.trim()
  // culori rejects uppercase function names (`RGBA(...)`); keep the rest intact.
  const input = trimmed.replace(
    /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)(?=\()/i,
    (name) => name.toLowerCase()
  )
  const parsed = tryParseColor(input)
  if (parsed) return colorToHex8(parsed).toLowerCase()
  return trimmed.toLowerCase().replace(/\s+/g, '')
}

/** Prefer a stable hex form when storing config colors for matching and twirl. */
function canonicalizeColorValue(value: string): string {
  const trimmed = value.trim()
  const input = trimmed.replace(
    /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)(?=\()/i,
    (name) => name.toLowerCase()
  )
  const parsed = tryParseColor(input)
  return parsed ? colorToHex8(parsed) : trimmed
}

function invertTokenMap(map: Record<string, string>): Map<number, string> {
  const byPx = new Map<number, string>()
  for (const [token, raw] of Object.entries(map)) {
    const px = parsePx(raw)
    if (px === null) continue
    if (!byPx.has(px)) byPx.set(px, token)
  }
  return byPx
}

/** Named size tokens beat default numeric / `px` scale aliases. */
export function sizeTokenRank(token: string): number {
  if (token === 'DEFAULT' || token === 'default') return 0
  if (token === 'px' || token === '0') return 2
  if (/^\d+(\.\d+)?$/.test(token)) return 2
  return 1
}

type RankedAlias = { token: string; value: string; index: number; rank: number }

function pickBestAlias(aliases: RankedAlias[]): RankedAlias {
  let best = aliases[0]
  for (let i = 1; i < aliases.length; i++) {
    const next = aliases[i]
    if (next.rank < best.rank || (next.rank === best.rank && next.index < best.index)) {
      best = next
    }
  }
  return best
}

export function pickPreferredSizeTokens(tokens: Record<string, string>): Record<string, string> {
  const byPx = new Map<number, RankedAlias[]>()
  const nonPx: RankedAlias[] = []
  let index = 0
  for (const [token, raw] of Object.entries(tokens)) {
    const px = parsePx(raw)
    const entry: RankedAlias = { token, value: raw, index, rank: sizeTokenRank(token) }
    index += 1
    if (px === null) {
      nonPx.push(entry)
      continue
    }
    const aliases = byPx.get(px) ?? []
    aliases.push(entry)
    byPx.set(px, aliases)
  }
  const out: Record<string, string> = {}
  for (const entry of nonPx) out[entry.token] = entry.value
  for (const aliases of byPx.values()) {
    const best = pickBestAlias(aliases)
    out[best.token] = best.value
  }
  return out
}

/**
 * CSS property → candidate token roots, used only when that root exists in the
 * caller's config (project configs are not fixed).
 */
const PROPERTY_TOKEN_ROOTS: Record<string, readonly string[]> = {
  'background-color': ['background', 'bg', 'color'],
  color: ['color', 'text', 'foreground', 'fg'],
  'border-color': ['border', 'color'],
  'outline-color': ['outline', 'ring', 'color'],
  fill: ['fill', 'color'],
  stroke: ['stroke', 'color']
}

const PREFIX_TO_PROPERTY: Record<string, string> = {
  bg: 'background-color',
  text: 'color',
  border: 'border-color',
  outline: 'outline-color',
  fill: 'fill',
  stroke: 'stroke'
}

function colorTokenRoots(colors: Record<string, string>): Set<string> {
  const roots = new Set<string>()
  for (const token of Object.keys(colors)) {
    const root = token.split('-')[0]?.toLowerCase()
    if (root) roots.add(root)
  }
  return roots
}

/**
 * Lower rank = better fit for this utility, using only roots present in `colors`.
 * Otherwise declaration order decides.
 */
export function colorTokenRankForPrefix(
  token: string,
  prefix: string,
  colors: Record<string, string>
): number {
  const base = token
    .replace(/(?:^|-)DEFAULT$/i, '')
    .replace(/\/DEFAULT$/i, '')
    .toLowerCase()
  if (!base) return 1000
  const property = PREFIX_TO_PROPERTY[prefix]
  if (!property) return 1000
  const present = colorTokenRoots(colors)
  const stems = (PROPERTY_TOKEN_ROOTS[property] ?? []).filter((stem) => present.has(stem))
  for (let i = 0; i < stems.length; i++) {
    const stem = stems[i]
    if (base === stem) return 50 + i
    if (base.startsWith(`${stem}-`)) return i
  }
  return 1000
}

/** Pick the best color token for a hex under a utility prefix (bg / text / …). */
export function pickColorTokenForPrefix(
  colors: Record<string, string>,
  colorValue: string,
  prefix: string
): string | undefined {
  const key = normalizeColorKey(colorValue)
  if (!key) return undefined
  const aliases: RankedAlias[] = []
  let index = 0
  for (const [token, raw] of Object.entries(colors)) {
    if (normalizeColorKey(raw) === key) {
      aliases.push({
        token,
        value: raw,
        index,
        rank: colorTokenRankForPrefix(token, prefix, colors)
      })
    }
    index += 1
  }
  if (aliases.length === 0) return undefined
  return pickBestAlias(aliases).token
}

const SPACING_PREFIXES = [
  'w',
  'h',
  'size',
  'min-w',
  'min-h',
  'max-w',
  'max-h',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  'inset',
  'inset-x',
  'inset-y',
  'top',
  'right',
  'bottom',
  'left',
  'translate-x',
  'translate-y'
] as const

const PADDING_PREFIXES = ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'] as const
const MARGIN_PREFIXES = [
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'ms',
  'me',
  '-m',
  '-mx',
  '-my',
  '-mt',
  '-mr',
  '-mb',
  '-ml',
  '-ms',
  '-me'
] as const

const COLOR_STYLE_TO_PREFIX: Array<{ property: string; prefix: string }> = [
  { property: 'background-color', prefix: 'bg' },
  { property: 'color', prefix: 'text' },
  { property: 'border-color', prefix: 'border' },
  { property: 'outline-color', prefix: 'outline' },
  { property: 'fill', prefix: 'fill' },
  { property: 'stroke', prefix: 'stroke' }
]

function defaultScalePx(token: string): number | null {
  if (token === 'px') return 1
  if (token === '0') return 0
  const n = Number(token)
  if (!Number.isFinite(n)) return null
  return n * 4
}

function lookupToken(px: number, prefix: string, maps: TailwindTokenMaps): string | undefined {
  const padding = invertTokenMap(maps.padding)
  const margin = invertTokenMap(maps.margin)
  const spacing = invertTokenMap(maps.spacing)

  const isPadding = (PADDING_PREFIXES as readonly string[]).includes(prefix)
  const isMargin =
    (MARGIN_PREFIXES as readonly string[]).includes(prefix) || prefix.startsWith('-m')

  if (isPadding) return padding.get(px) ?? spacing.get(px)
  if (isMargin) return margin.get(px) ?? spacing.get(px)
  return spacing.get(px) ?? padding.get(px) ?? margin.get(px)
}

function remapSpacingClass(className: string, maps: TailwindTokenMaps): string {
  const negative = className.startsWith('-')
  const raw = negative ? className.slice(1) : className
  const match = /^(.*?)-(.+)$/.exec(raw)
  if (!match) return className
  const [, prefix, token] = match
  const known =
    (SPACING_PREFIXES as readonly string[]).includes(prefix) ||
    (PADDING_PREFIXES as readonly string[]).includes(prefix) ||
    (MARGIN_PREFIXES as readonly string[]).includes(prefix) ||
    prefix.startsWith('-m')
  if (!known) return className

  let px: number | null = null
  const arbitrary = /^\[(.+)\]$/.exec(token)
  if (arbitrary) px = parsePx(arbitrary[1])
  else px = defaultScalePx(token)
  if (px === null) return className

  const named = lookupToken(px, prefix, maps)
  if (!named || named === token) return className
  return `${negative ? '-' : ''}${prefix}-${named}`
}

function remapFontSizeClass(className: string, maps: TailwindTokenMaps): string {
  if (Object.keys(maps.fontSize).length === 0) return className
  const match = /^text-(.+)$/.exec(className)
  if (!match) return className
  const token = match[1]
  const arbitrary = /^\[(.+)\]$/.exec(token)
  let px: number | null = null
  if (arbitrary) px = parsePx(arbitrary[1])
  else if (maps.fontSize[token]) return className
  if (px === null) return className
  const named = invertTokenMap(maps.fontSize).get(px)
  if (!named) return className
  return `text-${named}`
}

function remapRoundedClass(className: string, maps: TailwindTokenMaps): string {
  if (Object.keys(maps.borderRadius).length === 0) return className
  const match = /^rounded(?:-(.+))?$/.exec(className)
  if (!match) return className
  const token = match[1]
  let px: number | null = null
  if (!token) px = 4
  else if (token === 'sm') px = 2
  else if (token === 'md') px = 6
  else if (token === 'lg') px = 8
  else if (token === 'xl') px = 12
  else if (token === '2xl') px = 16
  else if (token === '3xl') px = 24
  else if (token === 'full') return className
  else if (token === 'none') px = 0
  else {
    const arbitrary = /^\[(.+)\]$/.exec(token)
    if (arbitrary) px = parsePx(arbitrary[1])
  }
  if (px === null) return className
  const named = invertTokenMap(maps.borderRadius).get(px)
  if (!named) return className
  return named === 'DEFAULT' || named === 'border-radius' ? 'rounded' : `rounded-${named}`
}

/**
 * Prefer project color tokens over twirl defaults.
 * Matches by utility role; `color-*` tokens win for paint utilities.
 */
function preferConfigColorClasses(
  classes: string[],
  maps: TailwindTokenMaps,
  style: Record<string, string> | undefined
): string[] {
  if (!style || Object.keys(maps.colors).length === 0) return classes
  let next = [...classes]
  for (const { property, prefix } of COLOR_STYLE_TO_PREFIX) {
    const raw = style[property]
    if (!raw) continue
    const token = pickColorTokenForPrefix(maps.colors, raw, prefix)
    if (!token) continue
    const preferred = `${prefix}-${token}`
    const filtered = next.filter((className) => !className.startsWith(`${prefix}-`))
    next = [...filtered, preferred]
  }
  return next
}

export function remapClassesToConfig(
  classes: string[],
  maps: TailwindTokenMaps,
  style?: Record<string, string>
): string[] {
  const hasSpacing =
    Object.keys(maps.spacing).length > 0 ||
    Object.keys(maps.padding).length > 0 ||
    Object.keys(maps.margin).length > 0
  const hasType = Object.keys(maps.fontSize).length > 0
  const hasRadius = Object.keys(maps.borderRadius).length > 0
  const hasColors = Object.keys(maps.colors).length > 0
  if (!hasSpacing && !hasType && !hasRadius && !hasColors) return classes

  const next = preferConfigColorClasses(classes, maps, style)
  return next.map((className) => {
    let remapped = className
    if (hasSpacing) remapped = remapSpacingClass(remapped, maps)
    if (hasType) remapped = remapFontSizeClass(remapped, maps)
    if (hasRadius) remapped = remapRoundedClass(remapped, maps)
    return remapped
  })
}

export function hasTokenMaps(maps: TailwindTokenMaps): boolean {
  return (
    Object.keys(maps.colors).length > 0 ||
    Object.keys(maps.spacing).length > 0 ||
    Object.keys(maps.padding).length > 0 ||
    Object.keys(maps.margin).length > 0 ||
    Object.keys(maps.fontSize).length > 0 ||
    Object.keys(maps.lineHeight).length > 0 ||
    Object.keys(maps.borderRadius).length > 0
  )
}
